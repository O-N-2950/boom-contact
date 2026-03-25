// boom.contact — i18n setup
// 25 langues — Cascade: localStorage → IP géoloc → navigateur → fallback FR

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Langues existantes ─────────────────────────────────────────
import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import it from './locales/it.json';
// ── Nouvelles langues ─────────────────────────────────────────
import es from './locales/es.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import cs from './locales/cs.json';
import sk from './locales/sk.json';
import hu from './locales/hu.json';
import ro from './locales/ro.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import nb from './locales/nb.json';
import fi from './locales/fi.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import el from './locales/el.json';
import hr from './locales/hr.json';

export const SUPPORTED_LANGS = [
  'fr','de','it','en',
  'es','pt','nl','pl','cs','sk','hu','ro',
  'sv','da','nb','fi','tr','ru','uk',
  'ar','zh','ja','ko','el','hr',
] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_META: Record<SupportedLang, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français',    flag: '🇫🇷', dir: 'ltr' },
  de: { label: 'Deutsch',     flag: '🇩🇪', dir: 'ltr' },
  it: { label: 'Italiano',    flag: '🇮🇹', dir: 'ltr' },
  en: { label: 'English',     flag: '🇬🇧', dir: 'ltr' },
  es: { label: 'Español',     flag: '🇪🇸', dir: 'ltr' },
  pt: { label: 'Português',   flag: '🇵🇹', dir: 'ltr' },
  nl: { label: 'Nederlands',  flag: '🇳🇱', dir: 'ltr' },
  pl: { label: 'Polski',      flag: '🇵🇱', dir: 'ltr' },
  cs: { label: 'Čeština',     flag: '🇨🇿', dir: 'ltr' },
  sk: { label: 'Slovenčina',  flag: '🇸🇰', dir: 'ltr' },
  hu: { label: 'Magyar',      flag: '🇭🇺', dir: 'ltr' },
  ro: { label: 'Română',      flag: '🇷🇴', dir: 'ltr' },
  sv: { label: 'Svenska',     flag: '🇸🇪', dir: 'ltr' },
  da: { label: 'Dansk',       flag: '🇩🇰', dir: 'ltr' },
  nb: { label: 'Norsk',       flag: '🇳🇴', dir: 'ltr' },
  fi: { label: 'Suomi',       flag: '🇫🇮', dir: 'ltr' },
  tr: { label: 'Türkçe',      flag: '🇹🇷', dir: 'ltr' },
  ru: { label: 'Русский',     flag: '🇷🇺', dir: 'ltr' },
  uk: { label: 'Українська',  flag: '🇺🇦', dir: 'ltr' },
  ar: { label: 'العربية',     flag: '🇸🇦', dir: 'rtl' },
  zh: { label: '中文',         flag: '🇨🇳', dir: 'ltr' },
  ja: { label: '日本語',       flag: '🇯🇵', dir: 'ltr' },
  ko: { label: '한국어',       flag: '🇰🇷', dir: 'ltr' },
  el: { label: 'Ελληνικά',    flag: '🇬🇷', dir: 'ltr' },
  hr: { label: 'Hrvatski',    flag: '🇭🇷', dir: 'ltr' },
};

export const RTL_LANGS: string[] = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr }, en: { translation: en },
      de: { translation: de }, it: { translation: it },
      es: { translation: es }, pt: { translation: pt },
      nl: { translation: nl }, pl: { translation: pl },
      cs: { translation: cs }, sk: { translation: sk },
      hu: { translation: hu }, ro: { translation: ro },
      sv: { translation: sv }, da: { translation: da },
      nb: { translation: nb }, fi: { translation: fi },
      tr: { translation: tr }, ru: { translation: ru },
      uk: { translation: uk }, ar: { translation: ar },
      zh: { translation: zh }, ja: { translation: ja },
      ko: { translation: ko }, el: { translation: el },
      hr: { translation: hr },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'boom_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    parseMissingKeyHandler: (key) => `[${key}]`,
  });

export default i18n;

export function applyDir(lang: string) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

export function applyLang(lang: SupportedLang) {
  i18n.changeLanguage(lang);
  applyDir(lang);
  localStorage.setItem('boom_lang', lang);
}

export const TOTAL_LANGUAGES = 50;

export { detectBestLanguage, getLangOrder, langFromCountry } from './geo-lang';
