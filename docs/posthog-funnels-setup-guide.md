# PostHog Funnels — Setup Guide

_À configurer dans PostHog une fois les premiers events reçus (voir activation-runbook)._
_Mise à jour : 2026-05-29._

## Préliminaire
- Project Settings → confirmer la **résidence UE** (`eu.i.posthog.com`).
- Vérifier dans **Activity → Live events** que les events arrivent (sinon : runbook §4).
- Les events sont en `snake_case` (cf. `analytics-event-taxonomy.md`).

## Créer un funnel (général)
PostHog → **Product analytics → New insight → Funnel** → ajouter les étapes dans l'ordre →
choisir la fenêtre de conversion (ex. 24 h) → **Save**.

## Funnel 1 — B2C principal (conversion paiement)
Étapes :
1. `landing_viewed`
2. `cta_start_constat_clicked`
3. `constat_started`
4. `payment_started`
5. `payment_success`
6. `pdf_generation_success`

Fenêtre conseillée : 24 h. C'est le funnel n°1 à surveiller.

## Funnel 2 — Compte / Garage
1. `landing_viewed`
2. `cta_prepare_garage_clicked`
3. `auth_login_success` _(ou ajouter `auth_magic_link_success` en étape « OR »)_
4. `garage_viewed`
5. `garage_vehicle_added`
6. `garage_vehicle_selected_for_constat` _(= `constat_garage_vehicle_selected`)_
7. `constat_started`

Fenêtre conseillée : 7 jours (préparation du garage souvent différée).

## Funnel 3 — Viralité QR
1. `constat_started`
2. `participant_qr_displayed`
3. `participant_joined_via_qr`
4. `participant_completed`
5. `pdf_generation_success`

> Note : `participant_qr_displayed` et `participant_completed` sont dans la taxonomie mais pas
> encore câblés (cf. taxonomy §différés). À brancher au prochain pass pour ce funnel complet.

## Funnel 4 — Intérêt B2B
1. `landing_viewed`
2. `fleet_cta_clicked`
3. `company_interest_submitted`

> Note : section B2B/fleet non encore câblée (en attente du module flotte). Funnel prêt à
> l'emploi dès que ces events seront émis.

## Breakdowns recommandés (sur chaque funnel)
PostHog → bouton **Breakdown** → propriété event :
- `language` — quelles langues convertissent.
- `source` — garage vs scan vs manual (prouve l'avantage garage).
- `loggedIn` — connectés vs invités.
- `credits_bucket` — comportement selon crédits.
- `platform` / `$os` / `$browser` — natif PostHog (si dispo).
- `referrer` / `utm_*` — natif PostHog (canal d'acquisition).

## Dashboards hebdomadaires (à épingler)
1. Funnel B2C principal (+ breakdown `language` et `source`).
2. Funnel Compte/Garage.
3. **Retention** (PostHog → Retention) : 7 j et 30 j sur `landing_viewed` → `constat_started`.
4. Funnel viral QR.
5. Compteur `company_interest_submitted` (intérêt B2B).

## Seuils de lecture
Voir `analytics-funnel-dashboard-spec.md` §Seuils (traction forte / ne convertit pas /
correction UX urgente) — à calibrer après ~200 sessions réelles.
