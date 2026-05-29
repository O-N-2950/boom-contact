#!/usr/bin/env tsx
/**
 * check:i18n — Garde-fou de complétude des locales.
 *
 * Principe :
 *   - La VÉRITÉ d'exposition = getLangOrder() côté client ne retourne que fr/de/it/en.
 *     Ces 4 langues sont donc les seules "exposées" et DOIVENT être complètes.
 *   - Le périmètre "core" = toutes les clés de fr.json SAUF le namespace `police`
 *     (police = produit B2G police.boom.contact, FR-first, traduit par déploiement pays —
 *      hors application grand public / stores).
 *   - Une langue EXPOSÉE incomplète (sur le core) => exit 1 (bloquant).
 *   - Les 46 locales non exposées sont auditées en INFORMATIF uniquement (jamais bloquant),
 *     pour ne pas casser le repo tant qu'elles ne sont pas activées.
 *
 * Les claims interdits dans les locales sont couverts séparément par check:claims.
 */
import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.join(process.cwd(), 'client/src/i18n/locales');
const REFERENCE = 'fr';
const EXPOSED = ['fr', 'de', 'it', 'en'];   // = getLangOrder() (client/src/i18n/geo-lang.ts)
const SCOPE_SKIP = new Set(['police']);     // B2G, hors périmètre grand public

function flatKeys(obj: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const kp = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') for (const x of flatKeys(v, kp)) out.add(x);
      else out.add(kp);
    }
  }
  return out;
}

function load(lang: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf8'));
}

function listLocales(): string[] {
  return fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const ref = flatKeys(load(REFERENCE));
  const core = new Set([...ref].filter(k => !SCOPE_SKIP.has(k.split('.')[0])));
  const all = listLocales();

  let blocking = 0;
  const lines: string[] = [];

  // 1) Langues EXPOSÉES — doivent être 100% du core
  for (const lang of EXPOSED) {
    if (!all.includes(lang)) { lines.push(`  ✗ ${lang}: fichier manquant`); blocking++; continue; }
    const k = flatKeys(load(lang));
    const missing = [...core].filter(x => !k.has(x));
    const pct = Math.round((100 * (core.size - missing.length)) / core.size);
    if (missing.length === 0) {
      lines.push(`  ✓ ${lang} (exposée) : ${core.size}/${core.size} core (100%)`);
    } else {
      blocking++;
      lines.push(`  ✗ ${lang} (exposée) : ${core.size - missing.length}/${core.size} core (${pct}%) — ${missing.length} clés manquantes`);
      const byNs: Record<string, number> = {};
      for (const m of missing) byNs[m.split('.')[0]] = (byNs[m.split('.')[0]] || 0) + 1;
      for (const [ns, c] of Object.entries(byNs).sort((a, b) => b[1] - a[1]))
        lines.push(`        ${ns}: ${c}`);
    }
  }

  // 2) Locales NON exposées — informatif
  if (!quiet) {
    const others = all.filter(l => !EXPOSED.includes(l));
    lines.push('');
    lines.push(`  — ${others.length} locales non exposées (informatif, non bloquant) —`);
    for (const lang of others) {
      const k = flatKeys(load(lang));
      const have = [...core].filter(x => k.has(x)).length;
      lines.push(`    ${lang}: ${have}/${core.size} core (${Math.round((100 * have) / core.size)}%)`);
    }
  }

  console.log('\n══════════ check:i18n — complétude des locales ══════════');
  console.log(`  référence : ${REFERENCE}.json (${ref.size} clés, dont core hors-police : ${core.size})`);
  console.log(`  exposées  : ${EXPOSED.join(', ')}\n`);
  console.log(lines.join('\n'));
  console.log('');

  if (blocking > 0) {
    console.log(`❌ ${blocking} langue(s) exposée(s) incomplète(s) — BLOQUANT.`);
    console.log('   Corrige la complétude ou retire la langue de getLangOrder() avant exposition.');
    process.exit(1);
  }
  console.log('✅ Toutes les langues exposées sont complètes sur le périmètre grand public.');
}

main();
