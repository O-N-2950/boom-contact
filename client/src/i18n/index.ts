// boom.contact — i18n setup — 50 langues
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Core locales loaded synchronously (fr, en, de, it = Swiss + English)
import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import it from './locales/it.json';

// All other locales are lazy-loaded on demand
const LAZY_LOCALE_LOADERS: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  es: () => import('./locales/es.json'),
  pt: () => import('./locales/pt.json'),
  nl: () => import('./locales/nl.json'),
  pl: () => import('./locales/pl.json'),
  cs: () => import('./locales/cs.json'),
  sk: () => import('./locales/sk.json'),
  hu: () => import('./locales/hu.json'),
  ro: () => import('./locales/ro.json'),
  sv: () => import('./locales/sv.json'),
  da: () => import('./locales/da.json'),
  nb: () => import('./locales/nb.json'),
  fi: () => import('./locales/fi.json'),
  tr: () => import('./locales/tr.json'),
  ru: () => import('./locales/ru.json'),
  uk: () => import('./locales/uk.json'),
  ar: () => import('./locales/ar.json'),
  zh: () => import('./locales/zh.json'),
  ja: () => import('./locales/ja.json'),
  ko: () => import('./locales/ko.json'),
  el: () => import('./locales/el.json'),
  hr: () => import('./locales/hr.json'),
  hi: () => import('./locales/hi.json'),
  id: () => import('./locales/id.json'),
  ms: () => import('./locales/ms.json'),
  th: () => import('./locales/th.json'),
  vi: () => import('./locales/vi.json'),
  he: () => import('./locales/he.json'),
  fa: () => import('./locales/fa.json'),
  bg: () => import('./locales/bg.json'),
  sr: () => import('./locales/sr.json'),
  sl: () => import('./locales/sl.json'),
  et: () => import('./locales/et.json'),
  lv: () => import('./locales/lv.json'),
  lt: () => import('./locales/lt.json'),
  sq: () => import('./locales/sq.json'),
  mk: () => import('./locales/mk.json'),
  bs: () => import('./locales/bs.json'),
  ka: () => import('./locales/ka.json'),
  az: () => import('./locales/az.json'),
  ti: () => import('./locales/ti.json'),
  am: () => import('./locales/am.json'),
  wo: () => import('./locales/wo.json'),
  ur: () => import('./locales/ur.json'),
  bn: () => import('./locales/bn.json'),
  so: () => import('./locales/so.json'),
  tl: () => import('./locales/tl.json'),
};

/** Lazy-load a locale and add it to i18next */
async function loadLocale(lang: string): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const loader = LAZY_LOCALE_LOADERS[lang];
  if (!loader) return;
  try {
    const mod = await loader();
    i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
  } catch {
    // Fallback to fr if locale fails to load
  }
}

export const SUPPORTED_LANGS = [
  'fr','de','it','en',
  'es','pt','nl','pl','cs','sk','hu','ro',
  'sv','da','nb','fi','tr','ru','uk',
  'ar','he','fa','ur',
  'zh','ja','ko','hi','th','vi','id','ms','bn','tl',
  'el','hr','bg','sr','sl','bs','mk','sq',
  'et','lv','lt','ka','az',
  'ti','am','wo','so',
] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_META: Record<SupportedLang, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français',          flag: '🇫🇷', dir: 'ltr' },
  de: { label: 'Deutsch',           flag: '🇩🇪', dir: 'ltr' },
  it: { label: 'Italiano',          flag: '🇮🇹', dir: 'ltr' },
  en: { label: 'English',           flag: '🇬🇧', dir: 'ltr' },
  es: { label: 'Español',           flag: '🇪🇸', dir: 'ltr' },
  pt: { label: 'Português',         flag: '🇵🇹', dir: 'ltr' },
  nl: { label: 'Nederlands',        flag: '🇳🇱', dir: 'ltr' },
  pl: { label: 'Polski',            flag: '🇵🇱', dir: 'ltr' },
  cs: { label: 'Čeština',           flag: '🇨🇿', dir: 'ltr' },
  sk: { label: 'Slovenčina',        flag: '🇸🇰', dir: 'ltr' },
  hu: { label: 'Magyar',            flag: '🇭🇺', dir: 'ltr' },
  ro: { label: 'Română',            flag: '🇷🇴', dir: 'ltr' },
  sv: { label: 'Svenska',           flag: '🇸🇪', dir: 'ltr' },
  da: { label: 'Dansk',             flag: '🇩🇰', dir: 'ltr' },
  nb: { label: 'Norsk',             flag: '🇳🇴', dir: 'ltr' },
  fi: { label: 'Suomi',             flag: '🇫🇮', dir: 'ltr' },
  tr: { label: 'Türkçe',            flag: '🇹🇷', dir: 'ltr' },
  ru: { label: 'Русский',           flag: '🇷🇺', dir: 'ltr' },
  uk: { label: 'Українська',        flag: '🇺🇦', dir: 'ltr' },
  ar: { label: 'العربية',           flag: '🇸🇦', dir: 'rtl' },
  he: { label: 'עברית',             flag: '🇮🇱', dir: 'rtl' },
  fa: { label: 'فارسی',             flag: '🇮🇷', dir: 'rtl' },
  ur: { label: 'اردو',              flag: '🇵🇰', dir: 'rtl' },
  zh: { label: '中文',               flag: '🇨🇳', dir: 'ltr' },
  ja: { label: '日本語',             flag: '🇯🇵', dir: 'ltr' },
  ko: { label: '한국어',             flag: '🇰🇷', dir: 'ltr' },
  hi: { label: 'हिन्दी',             flag: '🇮🇳', dir: 'ltr' },
  th: { label: 'ภาษาไทย',           flag: '🇹🇭', dir: 'ltr' },
  vi: { label: 'Tiếng Việt',        flag: '🇻🇳', dir: 'ltr' },
  id: { label: 'Bahasa Indonesia',  flag: '🇮🇩', dir: 'ltr' },
  ms: { label: 'Bahasa Melayu',     flag: '🇲🇾', dir: 'ltr' },
  bn: { label: 'বাংলা',             flag: '🇧🇩', dir: 'ltr' },
  tl: { label: 'Filipino',          flag: '🇵🇭', dir: 'ltr' },
  el: { label: 'Ελληνικά',          flag: '🇬🇷', dir: 'ltr' },
  hr: { label: 'Hrvatski',          flag: '🇭🇷', dir: 'ltr' },
  bg: { label: 'Български',         flag: '🇧🇬', dir: 'ltr' },
  sr: { label: 'Srpski',            flag: '🇷🇸', dir: 'ltr' },
  sl: { label: 'Slovenščina',       flag: '🇸🇮', dir: 'ltr' },
  bs: { label: 'Bosanski',          flag: '🇧🇦', dir: 'ltr' },
  mk: { label: 'Македонски',        flag: '🇲🇰', dir: 'ltr' },
  sq: { label: 'Shqip',             flag: '🇦🇱', dir: 'ltr' },
  et: { label: 'Eesti',             flag: '🇪🇪', dir: 'ltr' },
  lv: { label: 'Latviešu',          flag: '🇱🇻', dir: 'ltr' },
  lt: { label: 'Lietuvių',          flag: '🇱🇹', dir: 'ltr' },
  ka: { label: 'ქართული',           flag: '🇬🇪', dir: 'ltr' },
  az: { label: 'Azərbaycan',        flag: '🇦🇿', dir: 'ltr' },
  ti: { label: 'ትግርኛ',              flag: '🇪🇷', dir: 'ltr' },
  am: { label: 'አማርኛ',              flag: '🇪🇹', dir: 'ltr' },
  wo: { label: 'Wolof',             flag: '🇸🇳', dir: 'ltr' },
  so: { label: 'Soomaali',          flag: '🇸🇴', dir: 'ltr' },
};

export const RTL_LANGS: string[] = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr:{translation:fr}, en:{translation:en}, de:{translation:de}, it:{translation:it},
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

// Eagerly load the detected language if not a core locale
const detectedLang = i18n.language;
if (detectedLang && !['fr', 'en', 'de', 'it'].includes(detectedLang)) {
  loadLocale(detectedLang);
}

export default i18n;

export function applyDir(lang: string) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

export async function applyLang(lang: SupportedLang) {
  await loadLocale(lang);
  i18n.changeLanguage(lang);
  applyDir(lang);
  localStorage.setItem('boom_lang', lang);
}

export const TOTAL_LANGUAGES = 50;
export { detectBestLanguage, getLangOrder, langFromCountry } from './geo-lang';
