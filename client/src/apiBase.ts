import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────────────────────
// API BASE — résout le bloqueur store n°1 (B1)
//
// Sur le WEB (PWA / navigateur) : Capacitor.isNativePlatform() === false
//   → getApiBase() retourne '' → toutes les URL restent RELATIVES et
//     same-origin → comportement STRICTEMENT IDENTIQUE à aujourd'hui.
//     (Aucune régression possible côté web : on n'entre jamais dans la
//      branche native.)
//
// En NATIF (app iOS/Android Capacitor) : l'origine WebView est
//   capacitor://localhost ou https://localhost → les URL relatives
//   ('/trpc', io(), window.location.origin) sont inutilisables.
//   On bascule alors sur le domaine public.
// ─────────────────────────────────────────────────────────────

const NATIVE_API_ORIGIN = 'https://www.boom.contact';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Base pour les appels API/Socket. '' sur web (relatif), origine absolue en natif. */
export function getApiBase(): string {
  return isNativeApp() ? NATIVE_API_ORIGIN : '';
}

/**
 * Origine publique pour construire des liens partageables (QR / lien /join).
 * Sur web = origine courante (inchangé). En natif = domaine public
 * (capacitor://localhost serait inutilisable pour l'autre conducteur).
 */
export function getPublicOrigin(): string {
  if (isNativeApp()) return NATIVE_API_ORIGIN;
  return window.location.origin;
}
