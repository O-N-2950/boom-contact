# Analytics — Event Taxonomy (boom.contact)

_Source de vérité dans le code : `client/src/analytics-events.ts` (constantes `EVENTS`)._
_Transport : `client/src/analytics.ts` → `track(name, props)` → PostHog (EU) + GA4._
_Mise à jour : 2026-05-29._

## Règles
- **Un seul** point d'émission : `track(EVENTS.X, props)`. Jamais de string literal dispersé.
- **Privacy by design** : `track()` passe toujours par `sanitizeProps()` qui supprime toute
  clé/valeur sensible (voir `analytics-privacy-review.md`).
- **Consentement** : PostHog + GA4 ne s'activent que si l'utilisateur a accepté « tous les
  cookies » (`boom_cookie_consent === 'all'`). Sinon `track()` est un no-op silencieux.
- Ne jamais ajouter un event hors de cette taxonomie sans l'enregistrer ici + dans le code.

## Propriétés autorisées (exemples)
`language` (fr/de/it/en…), `source` (garage|scan|manual), `loggedIn` (bool),
`country` (code, si non sensible), `step` (nom d'étape), `method` (oneshot|credit|pack),
`count`/`vehicleCount` (nombre), `credits_bucket` (`creditsBucket()` : 0|1|2-3|4-10|10+).

## Événements

### Acquisition / landing
`landing_viewed` · `language_changed` · `cta_start_constat_clicked` ·
`cta_prepare_garage_clicked` · `cta_login_clicked` · `share_boom_opened` · `share_boom_sent`

### Auth / compte
`auth_modal_opened` · `auth_register_started` · `auth_register_success` · `auth_login_started` ·
`auth_login_success` · `auth_magic_link_requested` · `auth_magic_link_success` ·
`auth_verify_success` · `auth_logout` · `account_viewed`

### Garage
`garage_viewed` · `garage_vehicle_add_started` · `garage_vehicle_added` ·
`garage_vehicle_updated` · `garage_vehicle_deleted` · `garage_vehicle_selected_for_constat`

### Constat
`constat_started` · `constat_vehicle_source_selected` (props.source: garage|scan|manual) ·
`constat_garage_vehicle_selected` · `constat_scan_started` · `constat_scan_success` ·
`constat_scan_failed` · `constat_photo_added` · `constat_voice_started` ·
`constat_voice_completed` · `constat_signature_started` · `constat_signature_completed` ·
`constat_step_completed` · `constat_abandoned`

### Payment / PDF
`payment_started` · `payment_success` · `payment_cancelled` · `pdf_generation_started` ·
`pdf_generation_success` · `pdf_generation_failed` · `pdf_email_sent` · `pdf_downloaded`

### Growth loops
`participant_qr_displayed` · `participant_joined_via_qr` · `participant_completed` ·
`report_shared` · `insurer_email_added` · `referral_link_copied`

### B2B / future fleet
`fleet_cta_clicked` · `b2b_contact_clicked` · `company_interest_submitted` ·
`fleet_vehicle_import_started` · `fleet_vehicle_selected_for_constat`

## État d'instrumentation (ce sprint — MVP 15)

| Event | Câblé | Emplacement |
| --- | --- | --- |
| landing_viewed | ✅ | LandingPage (mount) |
| cta_start_constat_clicked | ✅ | LandingPage (header + hero + footer) |
| cta_prepare_garage_clicked | ✅ | LandingPage (hero) |
| cta_login_clicked | ✅ | LandingPage (header) |
| auth_magic_link_success | ✅ | App (magic verify) |
| account_viewed | ✅ | AccountPage (mount) |
| garage_viewed | ✅ | AccountPage (tab garage) |
| garage_vehicle_added | ✅ | AccountPage (save success) |
| constat_started | ✅ | ConstatFlow (mount) |
| constat_vehicle_source_selected | ✅ | ConstatFlow (garage / scan / manual) |
| constat_garage_vehicle_selected | ✅ | ConstatFlow (applyVehicle) |
| constat_scan_success | ✅ | ConstatFlow (handleOCRComplete) |
| payment_started | ✅ | PDFDownload (checkout one-shot) |
| payment_success | ✅ | ConstatFlow (retour `?paid=1`) |
| pdf_generation_success | ✅ | PDFDownload (pdfMutation success) |
| participant_joined_via_qr | ✅ | JoinSession (joined) |

**Différés (taxonomie prête, câblage prochain pass)** : auth_login_success/register_success
(différencier login vs register), constat_step_completed/abandoned, constat_photo_added,
constat_voice_*, constat_signature_*, pdf_email_sent/downloaded, share_*, referral_*,
participant_qr_displayed/completed, et toute la section B2B/fleet (en attente du module flotte).

---

## Fleet B2B — events planifiés (non câblés tant que le module n'existe pas)
| Event | Quand |
| --- | --- |
| `fleet_cta_clicked` | clic CTA « professionnels / flottes » (câblé sur la landing) |
| `company_interest_submitted` | soumission d'un intérêt entreprise |
| `organization_created` | création d'une organisation |
| `organization_member_invited` | invitation envoyée |
| `organization_member_joined` | invitation acceptée |
| `fleet_vehicle_added` / `fleet_vehicle_updated` | véhicule d'org ajouté / modifié |
| `fleet_vehicle_selected_for_constat` | véhicule d'org choisi dans un constat |
| `fleet_report_sent_to_admin` | PDF envoyé à un responsable flotte |
| `fleet_wallet_used` | débit du wallet org pour un constat |
| `fleet_dashboard_viewed` | ouverture du dashboard flotte |

**Propriétés autorisées (aucune PII)** : `organization_size_bucket`, `role`, `vehicle_count_bucket`,
`source`, `country`, `language`, `plan_type`, `credits_bucket`.

**Interdit** : nom d'entreprise (si sensible), email, plaque, VIN, détails accident, contenu PDF,
adresse exacte. Tout passe par `sanitizeProps()` comme les events B2C.

---
## MAJ Value Chain : `organization_garage` ajouté à VEHICLE_SOURCES ; events `fleet_vehicle_added` + `fleet_vehicle_selected_for_constat` câblés (props: scope=personal|organization, sans PII).

---
## MAJ Monetization : events fleet_wallet_viewed/credit_added/used/insufficient + fleet_billing_source_resolved (props: billing_source=personal|organization, vehicle_scope, success ; sans PII ni montant sensible).

---
## MAJ Finance : fleet_wallet_transactions_viewed / fleet_wallet_export_clicked / fleet_wallet_low_balance_seen / fleet_wallet_empty_seen (props: role, credits_bucket, transaction_count_bucket, canExport ; sans PII).

---
## Onboarding : organization_member_invite_started / organization_member_invited / organization_invite_accepted / organization_invite_revoked / organization_invite_failed (props: role, organization_role_actor, invite_status, success, language ; INTERDIT email/nom org/token/nom user).

---
## Member Management : organization_member_role_update_started / organization_member_role_updated / organization_member_removed / organization_invite_resent / organization_member_action_failed (props: actor_role, target_role, new_role, invite_status, success, reason_code, language ; INTERDIT email/nom/token/nom org).
