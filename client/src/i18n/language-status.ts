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
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ar: {
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  az: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bg: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bn: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  bs: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  cs: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  da: {
    ui: 37,
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
    ui: 37,
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
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  et: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  fa: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  fi: {
    ui: 37,
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
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hi: {
    ui: 35,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hr: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  hu: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  id: {
    ui: 37,
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
    ui: 37,
    "pdf": false,
    "email": true,
    tier: "partial"
  },
  ka: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ko: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  lt: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  lv: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  mk: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ms: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  nb: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  nl: {
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  pl: {
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  pt: {
    ui: 36,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  ro: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ru: {
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  },
  sk: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sl: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  so: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sq: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sr: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  sv: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  th: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  ti: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  tl: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  tr: {
    ui: 37,
    "pdf": false,
    "email": true,
    tier: "partial"
  },
  uk: {
    ui: 37,
    "pdf": true,
    "email": false,
    tier: "partial"
  },
  ur: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  vi: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  wo: {
    ui: 37,
    "pdf": false,
    "email": false,
    tier: "partial"
  },
  zh: {
    ui: 37,
    "pdf": true,
    "email": true,
    tier: "partial"
  }
} as Record<SupportedLang, LangStatus>;

export const FULL_LANGS = (Object.keys(LANGUAGE_STATUS) as SupportedLang[]).filter(l => LANGUAGE_STATUS[l].tier === 'full');
