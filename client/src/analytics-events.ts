// boom.contact — Analytics event taxonomy + privacy sanitization (PURE, no window/DOM)
// Source de vérité unique des noms d'événements et du filtrage des propriétés.
// Aucun import navigateur ici -> testable en environnement node.

export const EVENTS = {
  // Acquisition / landing
  LANDING_VIEWED: 'landing_viewed',
  LANGUAGE_CHANGED: 'language_changed',
  CTA_START_CONSTAT_CLICKED: 'cta_start_constat_clicked',
  CTA_PREPARE_GARAGE_CLICKED: 'cta_prepare_garage_clicked',
  CTA_LOGIN_CLICKED: 'cta_login_clicked',
  SHARE_BOOM_OPENED: 'share_boom_opened',
  SHARE_BOOM_SENT: 'share_boom_sent',

  // Auth / compte
  AUTH_MODAL_OPENED: 'auth_modal_opened',
  AUTH_REGISTER_STARTED: 'auth_register_started',
  AUTH_REGISTER_SUCCESS: 'auth_register_success',
  AUTH_LOGIN_STARTED: 'auth_login_started',
  AUTH_LOGIN_SUCCESS: 'auth_login_success',
  AUTH_MAGIC_LINK_REQUESTED: 'auth_magic_link_requested',
  AUTH_MAGIC_LINK_SUCCESS: 'auth_magic_link_success',
  AUTH_VERIFY_SUCCESS: 'auth_verify_success',
  AUTH_LOGOUT: 'auth_logout',
  ACCOUNT_VIEWED: 'account_viewed',

  // Garage
  GARAGE_VIEWED: 'garage_viewed',
  GARAGE_VEHICLE_ADD_STARTED: 'garage_vehicle_add_started',
  GARAGE_VEHICLE_ADDED: 'garage_vehicle_added',
  GARAGE_VEHICLE_UPDATED: 'garage_vehicle_updated',
  GARAGE_VEHICLE_DELETED: 'garage_vehicle_deleted',
  GARAGE_VEHICLE_SELECTED_FOR_CONSTAT: 'garage_vehicle_selected_for_constat',

  // Constat
  CONSTAT_STARTED: 'constat_started',
  CONSTAT_VEHICLE_SOURCE_SELECTED: 'constat_vehicle_source_selected', // props.source: garage|scan|manual
  CONSTAT_GARAGE_VEHICLE_SELECTED: 'constat_garage_vehicle_selected',
  CONSTAT_SCAN_STARTED: 'constat_scan_started',
  CONSTAT_SCAN_SUCCESS: 'constat_scan_success',
  CONSTAT_SCAN_FAILED: 'constat_scan_failed',
  CONSTAT_PHOTO_ADDED: 'constat_photo_added',
  CONSTAT_VOICE_STARTED: 'constat_voice_started',
  CONSTAT_VOICE_COMPLETED: 'constat_voice_completed',
  CONSTAT_SIGNATURE_STARTED: 'constat_signature_started',
  CONSTAT_SIGNATURE_COMPLETED: 'constat_signature_completed',
  CONSTAT_STEP_COMPLETED: 'constat_step_completed',
  CONSTAT_ABANDONED: 'constat_abandoned',

  // Payment / PDF
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_CANCELLED: 'payment_cancelled',
  PDF_GENERATION_STARTED: 'pdf_generation_started',
  PDF_GENERATION_SUCCESS: 'pdf_generation_success',
  PDF_GENERATION_FAILED: 'pdf_generation_failed',
  PDF_EMAIL_SENT: 'pdf_email_sent',
  PDF_DOWNLOADED: 'pdf_downloaded',

  // Growth loops
  PARTICIPANT_QR_DISPLAYED: 'participant_qr_displayed',
  PARTICIPANT_JOINED_VIA_QR: 'participant_joined_via_qr',
  PARTICIPANT_COMPLETED: 'participant_completed',
  REPORT_SHARED: 'report_shared',
  INSURER_EMAIL_ADDED: 'insurer_email_added',
  REFERRAL_LINK_COPIED: 'referral_link_copied',

  // B2B / future fleet
  FLEET_CTA_CLICKED: 'fleet_cta_clicked',
  B2B_CONTACT_CLICKED: 'b2b_contact_clicked',
  COMPANY_INTEREST_SUBMITTED: 'company_interest_submitted',
  FLEET_VEHICLE_IMPORT_STARTED: 'fleet_vehicle_import_started',
  FLEET_VEHICLE_ADDED: 'fleet_vehicle_added',
  FLEET_VEHICLE_SELECTED_FOR_CONSTAT: 'fleet_vehicle_selected_for_constat',
  FLEET_WALLET_VIEWED: 'fleet_wallet_viewed',
  FLEET_WALLET_CREDIT_ADDED: 'fleet_wallet_credit_added',
  FLEET_WALLET_USED: 'fleet_wallet_used',
  FLEET_WALLET_INSUFFICIENT: 'fleet_wallet_insufficient',
  FLEET_BILLING_SOURCE_RESOLVED: 'fleet_billing_source_resolved',
  FLEET_WALLET_TRANSACTIONS_VIEWED: 'fleet_wallet_transactions_viewed',
  FLEET_WALLET_EXPORT_CLICKED: 'fleet_wallet_export_clicked',
  FLEET_WALLET_LOW_BALANCE_SEEN: 'fleet_wallet_low_balance_seen',
  FLEET_WALLET_EMPTY_SEEN: 'fleet_wallet_empty_seen',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

export const ALLOWED_EVENT_NAMES: ReadonlySet<string> = new Set(Object.values(EVENTS));

/** Valeurs autorisées pour la propriété `source` du véhicule. */
export const VEHICLE_SOURCES = ['garage', 'organization_garage', 'scan', 'manual'] as const;
export type VehicleSource = typeof VEHICLE_SOURCES[number];

// ───────────────────────── PRIVACY SANITIZATION ─────────────────────────
// On ne laisse JAMAIS passer de données personnelles / sensibles dans les events.
// Approche : liste de sous-chaînes interdites dans les CLÉS + filtrage des VALEURS.

const FORBIDDEN_KEY_SUBSTRINGS = [
  'email', 'mail', 'name', 'prenom', 'nom', 'firstname', 'lastname',
  'phone', 'tel', 'mobile',
  'plate', 'plaque', 'immat', 'license', 'permis', 'vin',
  'address', 'adresse', 'street', 'rue', 'city', 'zip', 'postal',
  'gps', 'lat', 'lng', 'lon', 'coord', 'geo',
  'transcript', 'audio', 'voice_text', 'speech',
  'pdf', 'content', 'description', 'desc', 'message', 'note', 'comment',
  'iban', 'card', 'cvv', 'token', 'password', 'secret', 'birth', 'naissance',
];

/** Une clé est-elle interdite ? (insensible à la casse, par sous-chaîne) */
export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase();
  return FORBIDDEN_KEY_SUBSTRINGS.some(sub => k.includes(sub));
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const MAX_STR_LEN = 64; // au-delà = probablement du texte libre -> on coupe

/**
 * Nettoie un objet de propriétés avant envoi analytics.
 * - supprime les clés interdites ;
 * - supprime les valeurs ressemblant à un email ;
 * - supprime les chaînes trop longues (texte libre) ;
 * - ne garde que string courte / number / boolean / null.
 */
export function sanitizeProps(props: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isForbiddenKey(key)) continue;
    if (value == null) { out[key] = value; continue; }
    if (typeof value === 'boolean' || typeof value === 'number') { out[key] = value; continue; }
    if (typeof value === 'string') {
      if (EMAIL_RE.test(value)) continue;          // jamais d'email
      if (value.length > MAX_STR_LEN) continue;     // jamais de texte libre
      out[key] = value;
      continue;
    }
    // objets / tableaux / fonctions : ignorés (pas de payload riche)
  }
  return out;
}

/** Transforme un nombre de crédits en bucket non identifiant. */
export function creditsBucket(credits: number): string {
  if (credits <= 0) return '0';
  if (credits === 1) return '1';
  if (credits <= 3) return '2-3';
  if (credits <= 10) return '4-10';
  return '10+';
}

/** Valide qu'un nom d'event fait partie de la taxonomie (utilisé en dev/test). */
export function isValidEventName(name: string): boolean {
  return ALLOWED_EVENT_NAMES.has(name);
}
