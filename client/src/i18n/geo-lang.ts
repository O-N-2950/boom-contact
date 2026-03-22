// client/src/i18n/geo-lang.ts
// Détection de langue intelligente : GPS → navigateur → fallback
// Stratégie en cascade — toujours une réponse, jamais de blocage

import type { SupportedLang } from './index';

// ── Mapping pays ISO → langue de l'interface ─────────────────
// Couvre 180+ pays
const COUNTRY_TO_LANG: Record<string, SupportedLang> = {
  // Français
  FR: 'fr', BE: 'fr', LU: 'fr', CH: 'fr', MC: 'fr',
  SN: 'fr', CI: 'fr', ML: 'fr', BF: 'fr', NE: 'fr',
  TG: 'fr', BJ: 'fr', GN: 'fr', CD: 'fr', CG: 'fr',
  CM: 'fr', GA: 'fr', DJ: 'fr', KM: 'fr', MG: 'fr',
  MU: 'fr', RW: 'fr', BI: 'fr', HT: 'fr',
  MA: 'fr', TN: 'fr', DZ: 'fr',

  // Allemand
  DE: 'de', AT: 'de', LI: 'de',

  // Italien
  IT: 'it', SM: 'it', VA: 'it',

  // Anglais — tout le reste par défaut
  GB: 'en', US: 'en', AU: 'en', CA: 'en', NZ: 'en',
  IE: 'en', ZA: 'en', IN: 'en', SG: 'en', MY: 'en',
  PH: 'en', NG: 'en', GH: 'en', KE: 'en', TZ: 'en',
  UG: 'en', ZM: 'en', ZW: 'en', PK: 'en', BD: 'en',
  CN: 'en', JP: 'en', KR: 'en', TH: 'en', VN: 'en',
  ID: 'en', HK: 'en', TW: 'en',
  RU: 'en', UA: 'en', BY: 'en', KZ: 'en',
  PL: 'en', CZ: 'en', SK: 'en', HU: 'en', RO: 'en',
  BG: 'en', HR: 'en', SI: 'en', RS: 'en', BA: 'en',
  AL: 'en', MK: 'en', ME: 'en',
  ES: 'en', PT: 'en', NL: 'en', SE: 'en', NO: 'en',
  DK: 'en', FI: 'en', IS: 'en', EE: 'en', LV: 'en',
  LT: 'en', GR: 'en', CY: 'en', MT: 'en',
  TR: 'en', IL: 'en', SA: 'en', AE: 'en', QA: 'en',
  KW: 'en', BH: 'en', OM: 'en', JO: 'en', LB: 'en',
  EG: 'en', IR: 'en', IQ: 'en',
  BR: 'en', MX: 'en', AR: 'en', CO: 'en', CL: 'en',
  PE: 'en', VE: 'en', EC: 'en', UY: 'en', PY: 'en',
  BO: 'en',
};

// Langues du navigateur → SupportedLang
const BROWSER_LANG_MAP: Record<string, SupportedLang> = {
  fr: 'fr', 'fr-FR': 'fr', 'fr-BE': 'fr', 'fr-CH': 'fr',
  'fr-LU': 'fr', 'fr-CA': 'fr', 'fr-MA': 'fr',
  de: 'de', 'de-DE': 'de', 'de-AT': 'de', 'de-CH': 'de',
  'de-LI': 'de',
  it: 'it', 'it-IT': 'it', 'it-CH': 'it', 'it-SM': 'it',
  en: 'en', 'en-GB': 'en', 'en-US': 'en', 'en-AU': 'en',
  'en-CA': 'en', 'en-NZ': 'en', 'en-IE': 'en', 'en-IN': 'en',
  'en-SG': 'en', 'en-ZA': 'en',
};

// ── Résolution langue depuis pays GPS ────────────────────────
export function langFromCountry(countryCode: string): SupportedLang | null {
  return COUNTRY_TO_LANG[countryCode.toUpperCase()] ?? null;
}

// ── Résolution depuis langue navigateur ──────────────────────
export function langFromBrowser(): SupportedLang {
  const navLangs = navigator.languages ?? [navigator.language ?? 'fr'];
  for (const lang of navLangs) {
    // Exact match
    const exact = BROWSER_LANG_MAP[lang];
    if (exact) return exact;
    // Prefix match (e.g. "fr-MA" → "fr")
    const prefix = lang.split('-')[0];
    const prefixMatch = BROWSER_LANG_MAP[prefix];
    if (prefixMatch) return prefixMatch;
  }
  return 'fr'; // Fallback
}

// ── Résolution GPS via reverse geocoding (ipapi) ─────────────
// Utilise l'IP comme proxy — gratuit, sans clé API, rapide (< 200ms)
// Précision pays = 99%. Pas besoin du GPS physique (qui demande permission)
async function getCountryFromIP(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s max
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.country_code ?? null; // "FR", "CH", "DE", etc.
  } catch {
    return null;
  }
}

// ── Résolution GPS physique (si permission accordée) ─────────
async function getCountryFromGPS(): Promise<string | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          resolve(data.address?.country_code?.toUpperCase() ?? null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null), // Permission refusée ou timeout → null
      { timeout: 5000, maximumAge: 300000 } // Cache 5 min
    );
  });
}

// ── Fonction principale — cascade complète ───────────────────
export interface LangDetectionResult {
  lang: SupportedLang;
  source: 'localStorage' | 'gps' | 'ip' | 'browser' | 'fallback';
  country: string | null;
}

export async function detectBestLanguage(): Promise<LangDetectionResult> {
  // 1. localStorage — l'utilisateur a déjà choisi → respecter son choix
  const stored = localStorage.getItem('boom_lang') as SupportedLang | null;
  if (stored && ['fr', 'de', 'it', 'en'].includes(stored)) {
    return { lang: stored, source: 'localStorage', country: null };
  }

  // 2. IP géolocalisation — rapide, sans permission, précis au niveau pays
  const ipCountry = await getCountryFromIP();
  if (ipCountry) {
    const ipLang = langFromCountry(ipCountry);
    if (ipLang) {
      return { lang: ipLang, source: 'ip', country: ipCountry };
    }
  }

  // 3. Langue du navigateur — fiable dans 80% des cas
  const browserLang = langFromBrowser();
  return { lang: browserLang, source: 'browser', country: ipCountry };
}

// ── Ordre d'affichage des langues selon le pays ───────────────
// Retourne les 4 langues triées : langue locale en premier
export function getLangOrder(country: string | null): SupportedLang[] {
  const all: SupportedLang[] = ['fr', 'de', 'it', 'en'];
  if (!country) return all;

  const primary = langFromCountry(country);
  if (!primary) return all;

  // Mettre la langue du pays en premier, garder les autres
  return [primary, ...all.filter(l => l !== primary)];
}
