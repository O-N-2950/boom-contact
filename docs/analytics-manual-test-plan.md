# Analytics — Manual Test Plan

_À exécuter sur https://www.boom.contact après activation (runbook). Mise à jour : 2026-05-29._

## Méthode de vérification
- **Console** : `window.__boomAnalytics.status()` → `{ prod, consent, posthog, ga4, sentry, recent[] }`.
  `recent` liste les derniers events émis (noms uniquement).
- **PostHog** : Activity → **Live events** (filtrer par nom d'event).
- **Données interdites** : pour chaque event, ouvrir le détail dans PostHog et confirmer
  l'**absence** de : email, nom/prénom, téléphone, plaque/immatriculation, VIN, adresse, GPS,
  transcript, contenu PDF, description, IBAN, token. (Filtré par `sanitizeProps`.)

## Pré-test — Consentement
| # | Scénario | Attendu | Vérif | PASS/FAIL |
| --- | --- | --- | --- | --- |
| 0a | Refuser cookies (« Essentiels uniquement ») | `status().consent=false`, `posthog=false`, **aucun** event PostHog | console + PostHog Live (vide) | |
| 0b | Accepter cookies (« Accepter ✓ ») | `consent=true`, `posthog=true`, events émis sans reload | console + PostHog Live | |

## Scénarios (après accept all)
| # | Action | Event attendu | Propriétés attendues | Interdit à vérifier | Où | PASS/FAIL |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Visiter homepage | `landing_viewed` | (aucune sensible) | pas de PII | Live | |
| 2 | Changer de langue | `language_changed` *(différé — non câblé)* | `language` | — | — | N/A |
| 3 | Clic « Commencer un constat » | `cta_start_constat_clicked` | — | — | Live | |
| 4 | Clic « Préparer mon garage » | `cta_prepare_garage_clicked` | — | — | Live | |
| 5 | Clic « Me connecter » | `cta_login_clicked` | — | — | Live | |
| 6 | Connexion réussie (lien email) | `auth_magic_link_success` | — | pas d'email | Live | |
| 6b | Connexion mot de passe | `auth_login_success` *(différé)* | — | — | — | N/A |
| 7 | Ouvrir « Mon compte » | `account_viewed` | — | — | Live | |
| 8 | Ouvrir l'onglet Garage | `garage_viewed` | — | — | Live | |
| 9 | Ajouter un véhicule | `garage_vehicle_added` | — | **pas de plaque** | Live | |
| 10 | Choisir véhicule du garage (dans constat) | `constat_garage_vehicle_selected` + `constat_vehicle_source_selected` | `source: garage` | pas de plaque | Live | |
| 11 | Commencer un constat | `constat_started` | — | — | Live | |
| 12 | Scanner un document (OCR ok) | `constat_scan_success` + `constat_vehicle_source_selected` | `source: scan` | **pas de contenu OCR** | Live | |
| 13 | Saisie manuelle (skip scan) | `constat_vehicle_source_selected` | `source: manual` | — | Live | |
| 14 | Rejoindre via QR (2ᵉ appareil) | `participant_joined_via_qr` | — | — | Live | |
| 15 | Lancer paiement test (one-shot) | `payment_started` | `method: oneshot` | **pas d'email** | Live | |
| 16 | Retour après paiement (`?paid=1`) | `payment_success` | — | — | Live | |
| 17 | PDF généré | `pdf_generation_success` | — | **pas de contenu PDF** | Live | |

## Vérifications transverses (Phase 5)
- [ ] Refus cookies ⇒ **0** event PostHog/GA4 (scénario 0a).
- [ ] Accept all ⇒ events émis (0b → 17).
- [ ] Sentry reste séparé (erreurs uniquement) — non impacté par le refus analytics.
- [ ] **Aucune session recording** PostHog (`disable_session_recording: true`).
- [ ] **Autocapture off** (`autocapture: false`) — seuls les events manuels apparaissent.
- [ ] Aucun event ne contient de PII (vérif détail PostHog sur 3-4 events au hasard).

## Notes
- Scénarios marqués *(différé)* : event présent dans la taxonomie mais pas encore câblé
  (cf. `analytics-event-taxonomy.md`). Non bloquant pour ce pass.
- Le test paiement utilise le mode test Stripe ; le webhook serveur n'est pas modifié.
