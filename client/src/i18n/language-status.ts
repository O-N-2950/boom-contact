// AUTO-GÉNÉRÉ par scripts/gen-language-status.ts — NE PAS ÉDITER À LA MAIN.
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

export const LANGUAGE_STATUS: Record<SupportedLang, LangStatus> = {
  am: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ar: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  az: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bg: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bn: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bs: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  cs: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  da: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  de: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  el: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  en: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  es: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  et: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  fa: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  fi: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  fr: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  he: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hi: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hr: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hu: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  id: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  it: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ja: {
    ui: 100,
    "pdf": false,
    "email": true,
    tier: "partial"
  },
  ka: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ko: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  lt: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  lv: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  mk: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ms: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  nb: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  nl: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  pl: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  pt: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ro: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ru: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sk: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sl: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  so: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sq: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sr: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sv: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  th: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ti: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  tl: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  tr: {
    ui: 100,
    "pdf": false,
    "email": true,
    tier: "partial"
  },
  uk: {
    ui: 100,
    "pdf": true,
    "email": false,
    tier: "partial"
  },
  ur: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  vi: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  wo: {
    ui: 100,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  zh: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  }
} as Record<SupportedLang, LangStatus>;

export const FULL_LANGS = (Object.keys(LANGUAGE_STATUS) as SupportedLang[]).filter(l => LANGUAGE_STATUS[l].tier === 'full');
