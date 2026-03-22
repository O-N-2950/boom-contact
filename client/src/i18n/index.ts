// boom.contact — i18n setup
// Cascade: localStorage → IP géoloc → navigateur → fallback FR
// Aucune permission requise — transparent pour l'utilisateur

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
    // Détection initiale: localStorage d'abord, puis navigateur
    // La géoloc IP est appliquée en async après init (voir main.tsx)
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'boom_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    parseMissingKeyHandler: (key) => `[${key}]`,
  });

export default i18n;

// Helper: applique la direction RTL/LTR au document
export function applyDir(lang: string) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

// Helper: applique une langue et la persiste
export function applyLang(lang: SupportedLang) {
  i18n.changeLanguage(lang);
  applyDir(lang);
  localStorage.setItem('boom_lang', lang);
}

export const TOTAL_LANGUAGES = 50;

// Re-export geo-lang utilities
export { detectBestLanguage, getLangOrder, langFromCountry } from './geo-lang';
