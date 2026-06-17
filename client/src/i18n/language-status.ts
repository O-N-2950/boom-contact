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
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ar: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  az: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  bg: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  bn: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  bs: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  cs: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  da: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  de: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  el: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
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
    "pdf": true,
    "email": true,
    tier: "full"
  },
  fa: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  fi: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  fr: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  he: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  hi: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  hr: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  hu: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  id: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  it: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ja: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ka: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ko: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  lt: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  lv: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  mk: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ms: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  nb: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
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
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ru: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sk: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sl: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  so: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sq: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sr: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  sv: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  th: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ti: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  tl: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  tr: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  uk: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  ur: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  vi: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  wo: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  },
  zh: {
    ui: 100,
    "pdf": true,
    "email": true,
    tier: "full"
  }
} as Record<SupportedLang, LangStatus>;

export const FULL_LANGS = (Object.keys(LANGUAGE_STATUS) as SupportedLang[]).filter(l => LANGUAGE_STATUS[l].tier === 'full');
