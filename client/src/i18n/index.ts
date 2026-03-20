// boom.contact — i18n
// 42 languages, 8 regions, RTL support

export type LangCode =
  // Europe West
  | 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt' | 'nl' | 'ca'
  // Europe North
  | 'sv' | 'da' | 'no' | 'fi'
  // Europe East
  | 'pl' | 'ru' | 'uk' | 'ro' | 'cs' | 'hu' | 'sk' | 'bg' | 'hr'
  // Europe South
  | 'el' | 'tr'
  // Middle East
  | 'ar' | 'he' | 'fa' | 'ur'
  // Asia
  | 'zh' | 'ja' | 'ko' | 'hi' | 'bn' | 'id' | 'ms' | 'th' | 'vi' | 'tl'
  // Africa
  | 'sw' | 'am' | 'af' | 'ha'
  // Americas
  | 'pt-br' | 'es-mx';

export const RTL_LANGS: LangCode[] = ['ar', 'he', 'fa', 'ur'];

export const LANG_META: Record<LangCode, { label: string; region: string; flag: string }> = {
  fr:    { label: 'Français',    region: 'eu-w',   flag: '🇫🇷' },
  en:    { label: 'English',     region: 'eu-w',   flag: '🇬🇧' },
  de:    { label: 'Deutsch',     region: 'eu-w',   flag: '🇩🇪' },
  es:    { label: 'Español',     region: 'eu-w',   flag: '🇪🇸' },
  it:    { label: 'Italiano',    region: 'eu-w',   flag: '🇮🇹' },
  pt:    { label: 'Português',   region: 'eu-w',   flag: '🇵🇹' },
  nl:    { label: 'Nederlands',  region: 'eu-w',   flag: '🇳🇱' },
  ca:    { label: 'Català',      region: 'eu-w',   flag: '🇦🇩' },
  sv:    { label: 'Svenska',     region: 'eu-n',   flag: '🇸🇪' },
  da:    { label: 'Dansk',       region: 'eu-n',   flag: '🇩🇰' },
  no:    { label: 'Norsk',       region: 'eu-n',   flag: '🇳🇴' },
  fi:    { label: 'Suomi',       region: 'eu-n',   flag: '🇫🇮' },
  pl:    { label: 'Polski',      region: 'eu-e',   flag: '🇵🇱' },
  ru:    { label: 'Русский',     region: 'eu-e',   flag: '🇷🇺' },
  uk:    { label: 'Українська',  region: 'eu-e',   flag: '🇺🇦' },
  ro:    { label: 'Română',      region: 'eu-e',   flag: '🇷🇴' },
  cs:    { label: 'Čeština',     region: 'eu-e',   flag: '🇨🇿' },
  hu:    { label: 'Magyar',      region: 'eu-e',   flag: '🇭🇺' },
  sk:    { label: 'Slovenčina',  region: 'eu-e',   flag: '🇸🇰' },
  bg:    { label: 'Български',   region: 'eu-e',   flag: '🇧🇬' },
  hr:    { label: 'Hrvatski',    region: 'eu-e',   flag: '🇭🇷' },
  el:    { label: 'Ελληνικά',   region: 'eu-s',   flag: '🇬🇷' },
  tr:    { label: 'Türkçe',      region: 'eu-s',   flag: '🇹🇷' },
  ar:    { label: 'العربية',     region: 'me',     flag: '🇸🇦' },
  he:    { label: 'עברית',       region: 'me',     flag: '🇮🇱' },
  fa:    { label: 'فارسی',       region: 'me',     flag: '🇮🇷' },
  ur:    { label: 'اردو',        region: 'me',     flag: '🇵🇰' },
  zh:    { label: '中文',         region: 'asia',   flag: '🇨🇳' },
  ja:    { label: '日本語',       region: 'asia',   flag: '🇯🇵' },
  ko:    { label: '한국어',       region: 'asia',   flag: '🇰🇷' },
  hi:    { label: 'हिन्दी',      region: 'asia',   flag: '🇮🇳' },
  bn:    { label: 'বাংলা',       region: 'asia',   flag: '🇧🇩' },
  id:    { label: 'Indonesia',   region: 'asia',   flag: '🇮🇩' },
  ms:    { label: 'Melayu',      region: 'asia',   flag: '🇲🇾' },
  th:    { label: 'ภาษาไทย',    region: 'asia',   flag: '🇹🇭' },
  vi:    { label: 'Tiếng Việt',  region: 'asia',   flag: '🇻🇳' },
  tl:    { label: 'Filipino',    region: 'asia',   flag: '🇵🇭' },
  sw:    { label: 'Kiswahili',   region: 'africa', flag: '🇰🇪' },
  am:    { label: 'አማርኛ',        region: 'africa', flag: '🇪🇹' },
  af:    { label: 'Afrikaans',   region: 'africa', flag: '🇿🇦' },
  ha:    { label: 'Hausa',       region: 'africa', flag: '🇳🇬' },
  'pt-br': { label: 'Português BR', region: 'am', flag: '🇧🇷' },
  'es-mx': { label: 'Español MX',   region: 'am', flag: '🇲🇽' },
};

export function isRTL(lang: LangCode): boolean {
  return RTL_LANGS.includes(lang);
}

export function detectBrowserLang(): LangCode {
  const nav = navigator.language.toLowerCase().split('-')[0];
  return (nav in LANG_META) ? nav as LangCode : 'en';
}
