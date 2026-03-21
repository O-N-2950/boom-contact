// boom.contact — i18n setup
// i18next + react-i18next + browser language detector

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import it from './locales/it.json';

export const SUPPORTED_LANGS = ['fr', 'de', 'it', 'en'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_META: Record<SupportedLang, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  de: { label: 'Deutsch',  flag: '🇩🇪', dir: 'ltr' },
  it: { label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  en: { label: 'English',  flag: '🇬🇧', dir: 'ltr' },
};

export const RTL_LANGS: string[] = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      it: { translation: it },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGS,
    // Detection order: localStorage → navigator → default
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'boom_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    // Return key if translation missing (dev-friendly)
    parseMissingKeyHandler: (key) => `[${key}]`,
  });

export default i18n;

// Helper: apply RTL direction to document
export function applyDir(lang: string) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

// Re-export 50-lang metadata for OCR/email service use
export type { };
export const TOTAL_LANGUAGES = 50;
