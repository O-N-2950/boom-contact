#!/usr/bin/env tsx
/**
 * gen-language-status — génère client/src/i18n/language-status.ts
 * Manifeste de certification par langue : complétude UI (core, hors `police`),
 * support PDF (libellés traduits) et email, + tier `full`/`partial`.
 * `full` = UI 100% ET PDF ET email. À régénérer quand les locales/PDF/emails changent.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES = path.join(ROOT, 'client/src/i18n/locales');
const SKIP = new Set(['police']);

function flat(obj: unknown, p = '', out = new Set<string>()): Set<string> {
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj as any)) {
    const kp = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') flat(v, kp, out); else out.add(kp);
  }
  return out;
}
const load = (l: string) => JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'));

// Langues couvertes par les libellés PDF (PdfLang)
const pdfSrc = fs.readFileSync(path.join(ROOT, 'server/src/services/pdf.labels.ts'), 'utf8');
const pdfLangs = new Set((pdfSrc.match(/export type PdfLang =([^;]+);/)?.[1].match(/'([a-z]{2})'/g) || []).map(s => s.replace(/'/g, '')));

// Langues couvertes par les emails (clés de TEMPLATES)
const mailSrc = fs.readFileSync(path.join(ROOT, 'server/src/services/email.service.ts'), 'utf8');
const mailLangs = new Set([...mailSrc.matchAll(/\n {2}([a-z]{2}): \{\n {4}insurerTitle:/g)].map(m => m[1]));

const core = new Set([...flat(load('fr'))].filter(k => !SKIP.has(k.split('.')[0])));
const langs = fs.readdirSync(LOCALES).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();

const status: Record<string, { ui: number; pdf: boolean; email: boolean; tier: string }> = {};
for (const l of langs) {
  const have = [...core].filter(k => flat(load(l)).has(k)).length;
  const ui = Math.round((100 * have) / core.size);
  const pdf = pdfLangs.has(l), email = mailLangs.has(l);
  status[l] = { ui, pdf, email, tier: (ui === 100 && pdf && email) ? 'full' : 'partial' };
}

const body = `// AUTO-GÉNÉRÉ par scripts/gen-language-status.ts — NE PAS ÉDITER À LA MAIN.
// Régénérer : npx tsx scripts/gen-language-status.ts
import type { SupportedLang } from './index';

export interface LangStatus {
  /** Complétude de l'UI sur le périmètre grand public (0–100). */
  ui: number;
  /** Libellés PDF traduits dans cette langue. */
  pdf: boolean;
  /** Email transactionnel traduit dans cette langue. */
  email: boolean;
  /** 'full' = parfaite de bout en bout (UI 100% + PDF + email) ; sinon 'partial'. */
  tier: 'full' | 'partial';
}

export const LANGUAGE_STATUS: Record<SupportedLang, LangStatus> = ${JSON.stringify(status, null, 2).replace(/"([a-z]{2})":/g, '$1:').replace(/"tier": "(\w+)"/g, 'tier: "$1"')} as Record<SupportedLang, LangStatus>;

export const FULL_LANGS = (Object.keys(LANGUAGE_STATUS) as SupportedLang[]).filter(l => LANGUAGE_STATUS[l].tier === 'full');
`;
fs.writeFileSync(path.join(ROOT, 'client/src/i18n/language-status.ts'), body);
const full = Object.entries(status).filter(([, s]) => s.tier === 'full').map(([l]) => l);
console.log(`Généré. ${langs.length} langues. PDF=${[...pdfLangs].length} email=${[...mailLangs].length}. FULL (${full.length}): ${full.join(', ')}`);
