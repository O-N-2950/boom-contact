// boom.contact — i18n setup — 43 langues
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import it from './locales/it.json';
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
import hi from './locales/hi.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import he from './locales/he.json';
import fa from './locales/fa.json';
import bg from './locales/bg.json';
import sr from './locales/sr.json';
import sl from './locales/sl.json';
import et from './locales/et.json';
import lv from './locales/lv.json';
import lt from './locales/lt.json';
import sq from './locales/sq.json';
import mk from './locales/mk.json';
import bs from './locales/bs.json';
import ka from './locales/ka.json';
import az from './locales/az.json';

export const SUPPORTED_LANGS = [
  'fr','de','it','en',
  'es','pt','nl','pl','cs','sk','hu','ro',
  'sv','da','nb','fi','tr','ru','uk',
  'ar','he','fa',
  'zh','ja','ko','hi','th','vi','id','ms',
  'el','hr','bg','sr','sl','bs','mk','sq',
  'et','lv','lt','ka','az',
] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_META: Record<SupportedLang, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français',        flag: '🇫🇷', dir: 'ltr' },
  de: { label: 'Deutsch',         flag: '🇩🇪', dir: 'ltr' },
  it: { label: 'Italiano',        flag: '🇮🇹', dir: 'ltr' },
  en: { label: 'English',         flag: '🇬🇧', dir: 'ltr' },
  es: { label: 'Español',         flag: '🇪🇸', dir: 'ltr' },
  pt: { label: 'Português',       flag: '🇵🇹', dir: 'ltr' },
  nl: { label: 'Nederlands',      flag: '🇳🇱', dir: 'ltr' },
  pl: { label: 'Polski',          flag: '🇵🇱', dir: 'ltr' },
  cs: { label: 'Čeština',         flag: '🇨🇿', dir: 'ltr' },
  sk: { label: 'Slovenčina',      flag: '🇸🇰', dir: 'ltr' },
  hu: { label: 'Magyar',          flag: '🇭🇺', dir: 'ltr' },
  ro: { label: 'Română',          flag: '🇷🇴', dir: 'ltr' },
  sv: { label: 'Svenska',         flag: '🇸🇪', dir: 'ltr' },
  da: { label: 'Dansk',           flag: '🇩🇰', dir: 'ltr' },
  nb: { label: 'Norsk',           flag: '🇳🇴', dir: 'ltr' },
  fi: { label: 'Suomi',           flag: '🇫🇮', dir: 'ltr' },
  tr: { label: 'Türkçe',          flag: '🇹🇷', dir: 'ltr' },
  ru: { label: 'Русский',         flag: '🇷🇺', dir: 'ltr' },
  uk: { label: 'Українська',      flag: '🇺🇦', dir: 'ltr' },
  ar: { label: 'العربية',         flag: '🇸🇦', dir: 'rtl' },
  he: { label: 'עברית',           flag: '🇮🇱', dir: 'rtl' },
  fa: { label: 'فارسی',           flag: '🇮🇷', dir: 'rtl' },
  zh: { label: '中文',             flag: '🇨🇳', dir: 'ltr' },
  ja: { label: '日本語',           flag: '🇯🇵', dir: 'ltr' },
  ko: { label: '한국어',           flag: '🇰🇷', dir: 'ltr' },
  hi: { label: 'हिन्दी',           flag: '🇮🇳', dir: 'ltr' },
  th: { label: 'ภาษาไทย',         flag: '🇹🇭', dir: 'ltr' },
  vi: { label: 'Tiếng Việt',      flag: '🇻🇳', dir: 'ltr' },
  id: { label: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  ms: { label: 'Bahasa Melayu',   flag: '🇲🇾', dir: 'ltr' },
  el: { label: 'Ελληνικά',        flag: '🇬🇷', dir: 'ltr' },
  hr: { label: 'Hrvatski',        flag: '🇭🇷', dir: 'ltr' },
  bg: { label: 'Български',       flag: '🇧🇬', dir: 'ltr' },
  sr: { label: 'Srpski',          flag: '🇷🇸', dir: 'ltr' },
  sl: { label: 'Slovenščina',     flag: '🇸🇮', dir: 'ltr' },
  bs: { label: 'Bosanski',        flag: '🇧🇦', dir: 'ltr' },
  mk: { label: 'Македонски',      flag: '🇲🇰', dir: 'ltr' },
  sq: { label: 'Shqip',           flag: '🇦🇱', dir: 'ltr' },
  et: { label: 'Eesti',           flag: '🇪🇪', dir: 'ltr' },
  lv: { label: 'Latviešu',        flag: '🇱🇻', dir: 'ltr' },
  lt: { label: 'Lietuvių',        flag: '🇱🇹', dir: 'ltr' },
  ka: { label: 'ქართული',         flag: '🇬🇪', dir: 'ltr' },
  az: { label: 'Azərbaycan',      flag: '🇦🇿', dir: 'ltr' },
};

export const RTL_LANGS: string[] = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr:{translation:fr}, en:{translation:en}, de:{translation:de}, it:{translation:it},
      es:{translation:es}, pt:{translation:pt}, nl:{translation:nl}, pl:{translation:pl},
      cs:{translation:cs}, sk:{translation:sk}, hu:{translation:hu}, ro:{translation:ro},
      sv:{translation:sv}, da:{translation:da}, nb:{translation:nb}, fi:{translation:fi},
      tr:{translation:tr}, ru:{translation:ru}, uk:{translation:uk},
      ar:{translation:ar}, he:{translation:he}, fa:{translation:fa},
      zh:{translation:zh}, ja:{translation:ja}, ko:{translation:ko},
      hi:{translation:hi}, th:{translation:th}, vi:{translation:vi},
      id:{translation:id}, ms:{translation:ms},
      el:{translation:el}, hr:{translation:hr}, bg:{translation:bg},
      sr:{translation:sr}, sl:{translation:sl}, bs:{translation:bs},
      mk:{translation:mk}, sq:{translation:sq},
      et:{translation:et}, lv:{translation:lv}, lt:{translation:lt},
      ka:{translation:ka}, az:{translation:az},
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

export const TOTAL_LANGUAGES = 43;
export { detectBestLanguage, getLangOrder, langFromCountry } from './geo-lang';
