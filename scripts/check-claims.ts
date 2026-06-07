#!/usr/bin/env tsx
/**
 * scripts/check-claims.ts
 *
 * Garde-fou permanent contre les claims risqués (juridique / géographique / certification /
 * acceptation universelle / faux avis / wording trompeur).
 *
 * Origine : Sprint 8 a révélé que les anciens greps anti-claims ciblaient uniquement
 *   client/src + server/src + shared
 * Or des claims interdits vivaient dans client/index.html, client/public/pitch.html, et
 * les locales i18n — surfaces servies live mais hors du scope grep. Ce script verrouille
 * toutes les surfaces vivantes pour qu'aucune régression ne soit possible.
 *
 * Sortie :
 *   - exit code 0  ⇔  0 vrai risque (catégorie A)
 *   - exit code 1  ⇔  au moins un vrai risque
 *
 * Usage :
 *   npm run check:claims              # scan complet
 *   npm run check:claims -- --json    # sortie JSON (CI)
 *   npm run check:claims -- --quiet   # n'imprime que les A
 *
 * Convention :
 *   A_BLOCKING               = vrai risque (surface vivante, pas whitelist)
 *   B_DOC_ACCEPTABLE         = match en doc avec marqueur "interdit" autour
 *   C_FACTUAL_WHITELIST      = expression factuelle reconnue (PCI-DSS Stripe, etc.)
 *   E_TECH_COMMENT_OR_ROBOTS = commentaire technique sans risque utilisateur final
 */

import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ────────────────────────────── PATTERNS À DÉTECTER ──────────────────────────────

interface PatternDef { regex: RegExp; name: string; category: string }

const PATTERNS: PatternDef[] = [
  // Géographique / quantitatif universel
  { regex: /\b150\s*\+\s*pays\b/i,                     name: '150+ pays',                     category: 'geographic' },
  { regex: /\b150\s+pays\b/i,                          name: '150 pays',                      category: 'geographic' },
  { regex: /\b150\s*\+\s+countries\b/i,                name: '150+ countries',                category: 'geographic' },
  { regex: /\b150\s+countries\b/i,                     name: '150 countries',                 category: 'geographic' },
  { regex: /\bvalable mondialement\b/i,                name: 'valable mondialement',          category: 'geographic' },
  { regex: /\bvalid worldwide\b/i,                     name: 'valid worldwide',               category: 'geographic' },
  { regex: /\bworldwide valid\b/i,                     name: 'worldwide valid',               category: 'geographic' },
  { regex: /\bweltweit g(ü|u)ltig\b/i,                 name: 'weltweit gültig',               category: 'geographic' },
  { regex: /\bválido en todo el mundo\b/i,             name: 'válido en todo el mundo',       category: 'geographic' },
  { regex: /\bvalido in tutto il mondo\b/i,            name: 'valido in tutto il mondo',      category: 'geographic' },
  { regex: /\bmonde entier\b/i,                        name: 'monde entier',                  category: 'geographic' },
  { regex: /\bworld'?s first\b/i,                      name: "world's first",                 category: 'geographic' },
  { regex: /\bpremi[èe]re app(?:lication)? mondiale\b/i, name: 'première application mondiale', category: 'geographic' },
  { regex: /\bpremier constat (mondial|amiable num[ée]rique)\b/i, name: 'premier constat ...', category: 'geographic' },
  // Sprint claims P0-a (audit pré-stores) : portée mondiale / universelle implicite
  { regex: /\bcouverture mondiale\b/i,                  name: 'couverture mondiale',           category: 'geographic' },
  { regex: /\bglobal coverage\b/i,                      name: 'global coverage',               category: 'geographic' },
  { regex: /\bcopertura mondiale\b/i,                   name: 'copertura mondiale',            category: 'geographic' },
  { regex: /\bweltweite Abdeckung\b/i,                  name: 'weltweite Abdeckung',           category: 'geographic' },
  { regex: /\busable worldwide\b/i,                     name: 'usable worldwide',              category: 'geographic' },
  { regex: /\bweltweit nutzbar\b/i,                     name: 'weltweit nutzbar',              category: 'geographic' },
  { regex: /\butilizzabil\w* in tutto il mondo\b/i,     name: 'utilizzabile in tutto il mondo', category: 'geographic' },
  { regex: /\butilisable mondialement\b/i,              name: 'utilisable mondialement',       category: 'geographic' },
  { regex: /\bOCR universel(?:le|les)?\b/i,             name: 'OCR universel',                 category: 'geographic' },
  { regex: /\buniversal OCR\b/i,                        name: 'universal OCR',                 category: 'geographic' },
  { regex: /\buniverselle OCR\b/i,                      name: 'universelle OCR',               category: 'geographic' },
  { regex: /\bOCR universale\b/i,                       name: 'OCR universale',                category: 'geographic' },
  { regex: /\bPDF mondial\b/i,                          name: 'PDF mondial',                   category: 'geographic' },
  { regex: /\bworldwide digital accident report\b/i,    name: 'worldwide digital accident report', category: 'geographic' },
  { regex: /\bnum[ée]rique mondiale?\b/i,               name: 'numérique mondial(e)',          category: 'geographic' },
  { regex: /\bdigitale mondiale\b/i,                    name: 'digitale mondiale (IT)',        category: 'geographic' },
  { regex: /\bUnfallbericht weltweit\b/i,               name: 'Unfallbericht weltweit',        category: 'geographic' },

  // Certification (sauf factuel PCI-DSS — whitelisté)
  { regex: /\bcertifi[ée]\b/i,                         name: 'certifié',                      category: 'certification' },
  { regex: /\bcertified\b/i,                           name: 'certified',                     category: 'certification' },

  // Juridique
  { regex: /\bl[ée]galement valable\b/i,               name: 'légalement valable',            category: 'legal' },
  { regex: /\bl[ée]galement valide\b/i,                name: 'légalement valide',             category: 'legal' },
  { regex: /\blegally valid\b/i,                       name: 'legally valid',                 category: 'legal' },
  { regex: /\blegally binding\b/i,                     name: 'legally binding',               category: 'legal' },
  { regex: /\bofficially recognized\b/i,               name: 'officially recognized',         category: 'legal' },
  { regex: /\bvaleur l[ée]gale(?:\s+officielle)?\b/i,  name: 'valeur légale',                 category: 'legal' },
  { regex: /\bvaleur probante\b/i,                     name: 'valeur probante',               category: 'legal' },
  { regex: /\bpreuve incontestable\b/i,                name: 'preuve incontestable',          category: 'legal' },
  { regex: /\bincontestable proof\b/i,                 name: 'incontestable proof',           category: 'legal' },
  { regex: /\bpreuve officielle\b/i,                   name: 'preuve officielle',             category: 'legal' },

  // Acceptation universelle
  { regex: /\baccepted by all(?:\s+insurers?)?\b/i,    name: 'accepted by all',               category: 'acceptance' },
  { regex: /\breconnu par toutes\b/i,                  name: 'reconnu par toutes',            category: 'acceptance' },

  // Substitution / supériorité absolue
  { regex: /\bremplace le constat\b/i,                 name: 'remplace le constat',           category: 'substitution' },
  { regex: /\breplaces? the official report\b/i,       name: 'replaces the official report',  category: 'substitution' },
  { regex: /\bsup[ée]rieur au papier\b/i,              name: 'supérieur au papier',           category: 'substitution' },
  { regex: /\binviolable\b/i,                          name: 'inviolable',                    category: 'substitution' },

  // Faux avis / structured data fabriqué
  { regex: /"aggregateRating"\s*:/i,                   name: 'aggregateRating',               category: 'fake-reviews' },
  { regex: /"ratingValue"\s*:/i,                       name: 'ratingValue',                   category: 'fake-reviews' },
  { regex: /"reviewCount"\s*:/i,                       name: 'reviewCount',                   category: 'fake-reviews' },
  { regex: /"ratingCount"\s*:/i,                       name: 'ratingCount',                   category: 'fake-reviews' },

  // Drift quantitatif (Whisper ≠ 99 lang, app ≠ 99 lang)
  { regex: /\b99 langues\b/i,                          name: '99 langues',                    category: 'inflated' },
  { regex: /\b99 languages\b/i,                        name: '99 languages',                  category: 'inflated' },

  // CEA — interdit projet (cf. memories)
  { regex: /\bconforme CEA\b/i,                        name: 'conforme CEA',                  category: 'cea' },
  { regex: /\bconstat CEA\b/i,                         name: 'constat CEA',                   category: 'cea' },
  { regex: /\bConvention Europ[ée]enne (des )?Assurances?\b/i, name: 'Convention Européenne Assurances', category: 'cea' },

  // Espagnol / Portugais — claims interdits (cf. sprint i18n) — phrases multi-mots uniquement
  // (NB: "certificado de seguro" est legitime = nom du document carte verte, donc NON inclus)
  { regex: /\bválido mundialmente\b/i,                 name: 'válido mundialmente (ES/PT)',              category: 'geographic' },
  { regex: /\bválido em todo o mundo\b/i,              name: 'válido em todo o mundo (PT)',              category: 'geographic' },
  { regex: /\blegalmente válido\b/i,                   name: 'legalmente válido (ES/PT)',                category: 'legal' },
  { regex: /\baceptado por todas las aseguradoras\b/i, name: 'aceptado por todas las aseguradoras (ES)', category: 'acceptance' },
  { regex: /\baceito por todas as seguradoras\b/i,     name: 'aceito por todas as seguradoras (PT)',     category: 'acceptance' },
  { regex: /\bsustituye a la polic[ií]a\b/i,           name: 'sustituye a la policía (ES)',              category: 'substitution' },
  { regex: /\bsubstitui a pol[ií]cia\b/i,              name: 'substitui a polícia (PT)',                 category: 'substitution' },
  { regex: /\bprueba incontestable\b/i,                name: 'prueba incontestable (ES)',                category: 'legal' },
  { regex: /\bprova incontestável\b/i,                 name: 'prova incontestável (PT)',                 category: 'legal' },
  { regex: /\b150\s+pa[ií]ses\b/i,                     name: '150 países (ES/PT)',                       category: 'geographic' },
  { regex: /\bprimera aplicación mundial\b/i,          name: 'primera aplicación mundial (ES)',          category: 'geographic' },
  { regex: /\bprimeiro aplicativo mundial\b/i,         name: 'primeiro aplicativo mundial (PT)',         category: 'geographic' },
  { regex: /\breconocido oficialmente\b/i,             name: 'reconocido oficialmente (ES)',             category: 'legal' },
  { regex: /\breconhecido oficialmente\b/i,            name: 'reconhecido oficialmente (PT)',            category: 'legal' },

  // Drift quantitatif langues — eviter tout "50 langues/languages/idiomas/lingue/Sprachen"
  { regex: /\b50\s+langues\b/i,                        name: '50 langues',                    category: 'inflated' },
  { regex: /\b50\s+languages\b/i,                      name: '50 languages',                  category: 'inflated' },
  { regex: /\b50\s+idiomas\b/i,                        name: '50 idiomas',                    category: 'inflated' },
  { regex: /\b50\s+lingue\b/i,                         name: '50 lingue',                     category: 'inflated' },
  { regex: /\b50\s+Sprachen\b/i,                       name: '50 Sprachen',                   category: 'inflated' },
];

// ────────────────────────────── WHITELISTS ──────────────────────────────

/** Si l'une de ces regex matche la ligne, le hit est classé C_FACTUAL_WHITELIST. */
const LINE_WHITELIST: { regex: RegExp; reason: string }[] = [
  { regex: /prestataire certifi[ée] PCI-DSS/i,         reason: 'PCI-DSS factuel (Stripe)' },
  { regex: /PCI-DSS certified/i,                       reason: 'PCI-DSS factuel' },
  { regex: /\baccord B2B certifi[ée]\b/i,              reason: 'accord B2B factuel' },
  { regex: /AUCUN aggregateRating fabriqu/i,           reason: 'commentaire Sprint 8 documentaire' },
  { regex: /wording factuel uniquement/i,              reason: 'commentaire JSON-LD post-Sprint 8' },
];

/** Marqueurs "interdit" pour classer B_DOC_ACCEPTABLE en docs/legal. */
const FORBIDDEN_CONTEXT_MARKERS = /(\binterdits?\b|\bforbidden\b|ne pas utiliser|\bjamais\b|\bnever\b|do not use|🚫|❌|do NOT|NEVER|liste rouge|black\s?list|prohibé|prohibited)/i;

/**
 * Fichiers d'audit/legal explicitement reconnus comme "contiennent volontairement des claims
 * interdits" (listes rouges, drafts CGU/privacy internes, questions juriste, copy stores).
 * Tout match dans ces fichiers est classé B_DOC_ACCEPTABLE.
 */
const AUDIT_FILES = new Set<string>([
  // === Legal drafts internes (CGU/Privacy/audit/questions juriste) ===
  'legal/LEGAL_CLAIMS_REVIEW.md',
  'legal/PRIVACY.md',
  'legal/TERMS.md',
  'legal/SOLURIS_QUESTIONS.md',
  'legal/APP_STORE_PRIVACY.md',
  'legal/GOOGLE_DATA_SAFETY.md',
  'legal/EMERGENCY_DISCLAIMER.md',
  // === Docs handoff juriste (présents et à venir) ===
  'docs/legal-handoff-for-lawyer.md',
  'docs/legal-handoff-final.md',
  // === Docs stores : listes copy + listes interdits + plans ===
  'docs/store-screenshot-copy-fr-en.md',
  'docs/store-screenshot-plan.md',
  'docs/store-screenshot-production-plan.md',
  'docs/store-listing-copy-fr-en.md',
  'docs/app-review-instructions.md',
  'docs/store-upload-checklist.md',
  'docs/store-screenshot-final-selection.md',
  // === Docs QA qui documentent l'absence de claims (négations descriptives) ===
  'docs/device-qa-protocol.md',
  'docs/qa-mobile-e2e-matrix.md',
  'docs/ux-ui-final-review.md',
  // === Doc de ce sprint qui décrit le check claims lui-même ===
  'docs/prestore-quality-gate.md',
  // === Sprint 9 — décisions et handoffs qui citent les claims supprimés ===
  'docs/pitch-html-decision.md',
  'docs/release-monitoring-and-rollback.md',
  'docs/reviewer-account-setup.md',
]);

/** Négations sémantiques : si la ligne nie le claim, ce n'est pas un claim affirmatif. */
const NEGATION_PATTERNS: RegExp[] = [
  /\b(ne|n')\s*\w*\s*(certifie|garantit|remplace|reconna)/i,
  /\baucun(e)?\b[^.;!?]{0,80}\binviolable\b/i,
  /\bnot\s+(certified|legally\s+valid|recognized|accepted)/i,
  /\b(does\s+not|doesn'?t|never)\s+(replace|certify|guarantee|recognize)/i,
];

// ────────────────────────────── DOSSIERS / FICHIERS ──────────────────────────────

const ROOT = process.cwd();

/** Surfaces à scanner. Racines relatives au repo. */
const SCAN_ROOTS = [
  'client/index.html',
  'client/public',
  'client/src',
  'server/src',
  'shared',
  'docs',
  'legal',
];

/** Fichiers classés comme DOC (le reste = LIVE). Sensible aux markers "interdit". */
const DOC_PATH_PREFIXES = ['docs' + sep, 'legal' + sep];

/** Extensions textuelles à scanner. */
const TEXT_EXTS = new Set(['.html','.htm','.md','.txt','.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.xml','.yaml','.yml']);

/** Dossiers à ignorer même s'ils sont sous SCAN_ROOTS. */
const SKIP_DIRS = new Set(['node_modules','dist','build','.git','.next','coverage','artifacts','.cache']);

// ────────────────────────────── SCAN ──────────────────────────────

interface Finding {
  file: string; line: number; col: number; match: string; context: string;
  pattern: string; category: string;
  classification: 'A_BLOCKING' | 'B_DOC_ACCEPTABLE' | 'C_FACTUAL_WHITELIST' | 'E_TECH_COMMENT_OR_ROBOTS';
  reason: string;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full));
    else if (e.isFile()) {
      const dot = e.name.lastIndexOf('.');
      const ext = dot === -1 ? '' : e.name.slice(dot).toLowerCase();
      if (TEXT_EXTS.has(ext)) out.push(full);
    }
  }
  return out;
}

async function collectFiles(): Promise<string[]> {
  const result: string[] = [];
  for (const rt of SCAN_ROOTS) {
    const full = join(ROOT, rt);
    try {
      const st = await fs.stat(full);
      if (st.isDirectory()) result.push(...await walk(full));
      else if (st.isFile()) result.push(full);
    } catch { /* missing root → skip */ }
  }
  return Array.from(new Set(result));
}

function isDocFile(rel: string): boolean {
  return DOC_PATH_PREFIXES.some((p) => rel.startsWith(p));
}

function classify(rel: string, lineContent: string, prevLines: string[]): { classification: Finding['classification']; reason: string } {
  // 1. Whitelist factuelle (PCI-DSS, etc.)
  for (const w of LINE_WHITELIST) {
    if (w.regex.test(lineContent)) {
      return { classification: 'C_FACTUAL_WHITELIST', reason: w.reason };
    }
  }
  // 2. Négation sémantique : « aucun système n'étant inviolable » = pas un claim affirmatif.
  for (const neg of NEGATION_PATTERNS) {
    if (neg.test(lineContent)) {
      return { classification: 'C_FACTUAL_WHITELIST', reason: 'négation sémantique (pas un claim affirmatif)' };
    }
  }
  // 3. Fichier d'audit explicite (listes rouges, drafts CGU, questions juriste, store copy)
  if (AUDIT_FILES.has(rel)) {
    return { classification: 'B_DOC_ACCEPTABLE', reason: "fichier d'audit légal/store explicite" };
  }
  // 4. Doc générique avec marqueur "interdit" dans la ligne ou le voisinage
  if (isDocFile(rel)) {
    if (FORBIDDEN_CONTEXT_MARKERS.test(lineContent)) {
      return { classification: 'B_DOC_ACCEPTABLE', reason: 'marqueur interdit dans la ligne' };
    }
    for (const prev of prevLines) {
      if (FORBIDDEN_CONTEXT_MARKERS.test(prev)) {
        return { classification: 'B_DOC_ACCEPTABLE', reason: 'marqueur interdit dans le voisinage' };
      }
    }
  }
  // 5. Vrai risque par défaut
  return { classification: 'A_BLOCKING', reason: 'surface vivante, pas de whitelist ni marqueur' };
}

async function scan(): Promise<Finding[]> {
  const files = await collectFiles();
  const findings: Finding[] = [];
  for (const file of files) {
    let content: string;
    try { content = await fs.readFile(file, 'utf-8'); } catch { continue; }
    const lines = content.split(/\r?\n/);
    const rel = relative(ROOT, file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of PATTERNS) {
        p.regex.lastIndex = 0;
        const m = p.regex.exec(line);
        if (m) {
          const prev = lines.slice(Math.max(0, i - 5), i);
          const cls = classify(rel, line, prev);
          findings.push({
            file: rel, line: i + 1, col: (m.index ?? 0) + 1,
            match: m[0], context: line.trim().slice(0, 200),
            pattern: p.name, category: p.category,
            classification: cls.classification, reason: cls.reason,
          });
        }
      }
    }
  }
  return findings;
}

// ────────────────────────────── RAPPORT ──────────────────────────────

const CLR = process.stdout.isTTY && !process.env.NO_COLOR ? {
  R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', B: '\x1b[34m', C: '\x1b[36m', M: '\x1b[35m', BOLD: '\x1b[1m', DIM: '\x1b[2m', X: '\x1b[0m',
} : { R:'',G:'',Y:'',B:'',C:'',M:'',BOLD:'',DIM:'',X:'' };

function printText(findings: Finding[], files: number, quiet: boolean) {
  const A = findings.filter((f) => f.classification === 'A_BLOCKING');
  const B = findings.filter((f) => f.classification === 'B_DOC_ACCEPTABLE');
  const C = findings.filter((f) => f.classification === 'C_FACTUAL_WHITELIST');
  console.log(`\n${CLR.BOLD}═══ boom.contact — check:claims ═══${CLR.X}`);
  console.log(`  fichiers scannés : ${files}`);
  console.log(`  patterns         : ${PATTERNS.length}`);
  console.log(`  findings totaux  : ${findings.length}`);
  console.log(`  ${CLR.R}A_BLOCKING${CLR.X}              = ${A.length}`);
  console.log(`  ${CLR.Y}B_DOC_ACCEPTABLE${CLR.X}        = ${B.length}`);
  console.log(`  ${CLR.G}C_FACTUAL_WHITELIST${CLR.X}     = ${C.length}\n`);

  if (A.length) {
    console.log(`${CLR.R}${CLR.BOLD}❌ ${A.length} vrai(s) risque(s) — BLOQUANT${CLR.X}`);
    for (const f of A) {
      console.log(`  ${CLR.R}✗${CLR.X} ${CLR.BOLD}${f.file}${CLR.X}:${f.line}:${f.col}  [${f.category}/${f.pattern}]`);
      console.log(`      ${CLR.DIM}${f.context}${CLR.X}`);
      console.log(`      ${CLR.DIM}raison: ${f.reason}${CLR.X}`);
    }
    console.log('');
  } else {
    console.log(`${CLR.G}${CLR.BOLD}✅ 0 vrai risque dans les surfaces vivantes.${CLR.X}\n`);
  }

  if (!quiet && B.length) {
    console.log(`${CLR.Y}ℹ B_DOC_ACCEPTABLE (claims documentés comme interdits) :${CLR.X}`);
    const byFile = new Map<string, Finding[]>();
    for (const f of B) (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)!).push(f);
    for (const [file, lst] of byFile) console.log(`  ${file} (${lst.length})`);
    console.log('');
  }
  if (!quiet && C.length) {
    console.log(`${CLR.G}ℹ C_FACTUAL_WHITELIST (expressions factuelles whitelistées) :${CLR.X}`);
    const byFile = new Map<string, Finding[]>();
    for (const f of C) (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)!).push(f);
    for (const [file, lst] of byFile) console.log(`  ${file} (${lst.length})  raison: ${lst[0].reason}`);
    console.log('');
  }
}

// ────────────────────────────── MAIN ──────────────────────────────

(async () => {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const quiet = args.includes('--quiet');
  const all = await collectFiles();
  const findings = await scan();
  if (json) {
    process.stdout.write(JSON.stringify({
      files: all.length, patterns: PATTERNS.length, findings,
      counts: {
        A: findings.filter((f) => f.classification === 'A_BLOCKING').length,
        B: findings.filter((f) => f.classification === 'B_DOC_ACCEPTABLE').length,
        C: findings.filter((f) => f.classification === 'C_FACTUAL_WHITELIST').length,
      },
    }, null, 2) + '\n');
  } else {
    printText(findings, all.length, quiet);
  }
  process.exit(findings.some((f) => f.classification === 'A_BLOCKING') ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
