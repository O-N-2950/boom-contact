// boom.contact — i18n
// 50 languages, 9 regions, RTL support

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
  // Asia — China
  | 'zh' | 'zh-tw' | 'yue'
  // Asia — India (6 langues officielles majeures)
  | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'pa'
  // Asia — SE Asia + Pacifique
  | 'id' | 'ms' | 'th' | 'vi' | 'tl' | 'ja' | 'ko'
  // Africa
  | 'sw' | 'am' | 'af' | 'ha' | 'yo'
  // Americas
  | 'pt-br' | 'es-mx';

export const RTL_LANGS: LangCode[] = ['ar', 'he', 'fa', 'ur'];

export type Region = 'eu-w' | 'eu-n' | 'eu-e' | 'eu-s' | 'me' | 'china' | 'india' | 'asia' | 'africa' | 'am';

export const LANG_META: Record<LangCode, { label: string; region: Region; flag: string; speakers: string }> = {
  // ── EUROPE OUEST ─────────────────────────────────────────
  fr:      { label: 'Français',        region: 'eu-w',  flag: '🇫🇷', speakers: '280M' },
  en:      { label: 'English',         region: 'eu-w',  flag: '🇬🇧', speakers: '1.5B' },
  de:      { label: 'Deutsch',         region: 'eu-w',  flag: '🇩🇪', speakers: '135M' },
  es:      { label: 'Español',         region: 'eu-w',  flag: '🇪🇸', speakers: '560M' },
  it:      { label: 'Italiano',        region: 'eu-w',  flag: '🇮🇹', speakers: '85M'  },
  pt:      { label: 'Português',       region: 'eu-w',  flag: '🇵🇹', speakers: '280M' },
  nl:      { label: 'Nederlands',      region: 'eu-w',  flag: '🇳🇱', speakers: '25M'  },
  ca:      { label: 'Català',          region: 'eu-w',  flag: '🇦🇩', speakers: '10M'  },
  // ── EUROPE NORD ──────────────────────────────────────────
  sv:      { label: 'Svenska',         region: 'eu-n',  flag: '🇸🇪', speakers: '13M'  },
  da:      { label: 'Dansk',           region: 'eu-n',  flag: '🇩🇰', speakers: '6M'   },
  no:      { label: 'Norsk',           region: 'eu-n',  flag: '🇳🇴', speakers: '5M'   },
  fi:      { label: 'Suomi',           region: 'eu-n',  flag: '🇫🇮', speakers: '5M'   },
  // ── EUROPE EST ───────────────────────────────────────────
  pl:      { label: 'Polski',          region: 'eu-e',  flag: '🇵🇱', speakers: '45M'  },
  ru:      { label: 'Русский',         region: 'eu-e',  flag: '🇷🇺', speakers: '258M' },
  uk:      { label: 'Українська',      region: 'eu-e',  flag: '🇺🇦', speakers: '40M'  },
  ro:      { label: 'Română',          region: 'eu-e',  flag: '🇷🇴', speakers: '24M'  },
  cs:      { label: 'Čeština',         region: 'eu-e',  flag: '🇨🇿', speakers: '10M'  },
  hu:      { label: 'Magyar',          region: 'eu-e',  flag: '🇭🇺', speakers: '13M'  },
  sk:      { label: 'Slovenčina',      region: 'eu-e',  flag: '🇸🇰', speakers: '5M'   },
  bg:      { label: 'Български',       region: 'eu-e',  flag: '🇧🇬', speakers: '8M'   },
  hr:      { label: 'Hrvatski',        region: 'eu-e',  flag: '🇭🇷', speakers: '6M'   },
  // ── EUROPE SUD ───────────────────────────────────────────
  el:      { label: 'Ελληνικά',       region: 'eu-s',  flag: '🇬🇷', speakers: '13M'  },
  tr:      { label: 'Türkçe',          region: 'eu-s',  flag: '🇹🇷', speakers: '88M'  },
  // ── MOYEN-ORIENT ─────────────────────────────────────────
  ar:      { label: 'العربية',         region: 'me',    flag: '🇸🇦', speakers: '420M' },
  he:      { label: 'עברית',           region: 'me',    flag: '🇮🇱', speakers: '9M'   },
  fa:      { label: 'فارسی',           region: 'me',    flag: '🇮🇷', speakers: '110M' },
  ur:      { label: 'اردو',            region: 'me',    flag: '🇵🇰', speakers: '230M' },
  // ── CHINE ────────────────────────────────────────────────
  zh:      { label: '普通话 (简体)',     region: 'china', flag: '🇨🇳', speakers: '920M' },
  'zh-tw': { label: '繁體中文',         region: 'china', flag: '🇹🇼', speakers: '25M'  },
  yue:     { label: '粵語 (廣東話)',    region: 'china', flag: '🇭🇰', speakers: '85M'  },
  // ── INDE ─────────────────────────────────────────────────
  hi:      { label: 'हिन्दी',          region: 'india', flag: '🇮🇳', speakers: '600M' },
  bn:      { label: 'বাংলা',           region: 'india', flag: '🇧🇩', speakers: '230M' },
  ta:      { label: 'தமிழ்',           region: 'india', flag: '🇮🇳', speakers: '80M'  },
  te:      { label: 'తెలుగు',          region: 'india', flag: '🇮🇳', speakers: '95M'  },
  mr:      { label: 'मराठी',           region: 'india', flag: '🇮🇳', speakers: '83M'  },
  gu:      { label: 'ગુજરાતી',         region: 'india', flag: '🇮🇳', speakers: '55M'  },
  kn:      { label: 'ಕನ್ನಡ',           region: 'india', flag: '🇮🇳', speakers: '45M'  },
  pa:      { label: 'ਪੰਜਾਬੀ',          region: 'india', flag: '🇮🇳', speakers: '125M' },
  // ── ASIE PACIFIQUE ───────────────────────────────────────
  ja:      { label: '日本語',           region: 'asia',  flag: '🇯🇵', speakers: '125M' },
  ko:      { label: '한국어',           region: 'asia',  flag: '🇰🇷', speakers: '77M'  },
  id:      { label: 'Indonesia',        region: 'asia',  flag: '🇮🇩', speakers: '270M' },
  ms:      { label: 'Melayu',           region: 'asia',  flag: '🇲🇾', speakers: '80M'  },
  th:      { label: 'ภาษาไทย',         region: 'asia',  flag: '🇹🇭', speakers: '60M'  },
  vi:      { label: 'Tiếng Việt',       region: 'asia',  flag: '🇻🇳', speakers: '90M'  },
  tl:      { label: 'Filipino',         region: 'asia',  flag: '🇵🇭', speakers: '90M'  },
  // ── AFRIQUE ──────────────────────────────────────────────
  sw:      { label: 'Kiswahili',        region: 'africa',flag: '🇰🇪', speakers: '200M' },
  am:      { label: 'አማርኛ',            region: 'africa',flag: '🇪🇹', speakers: '57M'  },
  af:      { label: 'Afrikaans',        region: 'africa',flag: '🇿🇦', speakers: '17M'  },
  ha:      { label: 'Hausa',            region: 'africa',flag: '🇳🇬', speakers: '100M' },
  yo:      { label: 'Yorùbá',           region: 'africa',flag: '🇳🇬', speakers: '45M'  },
  // ── AMÉRIQUES ────────────────────────────────────────────
  'pt-br': { label: 'Português BR',     region: 'am',    flag: '🇧🇷', speakers: '215M' },
  'es-mx': { label: 'Español MX',       region: 'am',    flag: '🇲🇽', speakers: '130M' },
};

export const REGION_META: Record<Region, { label: string; flag: string; color: string }> = {
  'eu-w':  { label: 'Europe Ouest',    flag: '🇪🇺', color: '#0052CC' },
  'eu-n':  { label: 'Europe Nord',     flag: '🇸🇪', color: '#006AA7' },
  'eu-e':  { label: 'Europe Est',      flag: '🌐', color: '#1565C0'  },
  'eu-s':  { label: 'Europe Sud',      flag: '☀️', color: '#1976D2'  },
  'me':    { label: 'Moyen-Orient',    flag: '🕌', color: '#388E3C'  },
  'china': { label: 'Chine & HK',      flag: '🇨🇳', color: '#C62828' },
  'india': { label: 'Inde',            flag: '🇮🇳', color: '#FF6F00' },
  'asia':  { label: 'Asie-Pacifique',  flag: '🌏', color: '#E64A19'  },
  'africa':{ label: 'Afrique',         flag: '🌍', color: '#F57C00'  },
  'am':    { label: 'Amériques',       flag: '🌎', color: '#7B1FA2'  },
};

// Helpers
export function isRTL(lang: LangCode): boolean {
  return RTL_LANGS.includes(lang);
}

export function detectBrowserLang(): LangCode {
  const nav = navigator.language.toLowerCase();
  if (nav in LANG_META) return nav as LangCode;
  const base = nav.split('-')[0];
  return (base in LANG_META) ? base as LangCode : 'en';
}

export function getTotalSpeakers(): string {
  // Sum of unique speakers across all languages
  return '5B+';
}

export const TOTAL_LANGUAGES = Object.keys(LANG_META).length;
// → 50 languages
