# Analytics — Funnel Dashboard Spec (boom.contact)

_PostHog (EU). À configurer en Insights/Funnels une fois les premiers événements reçus._
_Mise à jour : 2026-05-29._

## Funnel 1 — B2C principal (conversion paiement)
```
landing_viewed
 → cta_start_constat_clicked
 → constat_started
 → payment_started
 → payment_success
 → pdf_generation_success
```
Objectif : mesurer la conversion bout-en-bout visiteur → dossier payé.

## Funnel 2 — Compte / Garage (rétention & accélération)
```
landing_viewed
 → cta_prepare_garage_clicked
 → auth_login_success (ou auth_magic_link_success)
 → garage_viewed
 → garage_vehicle_added
 → garage_vehicle_selected_for_constat (= constat_garage_vehicle_selected)
 → constat_started
```
Objectif : prouver que le garage accélère et fidélise.

## Funnel 3 — Viralité QR
```
constat_started
 → participant_qr_displayed
 → participant_joined_via_qr
 → participant_completed
 → pdf_generation_success
```
Objectif : mesurer la boucle d'acquisition gratuite (un accident → un nouvel utilisateur).

## Funnel 4 — Intérêt B2B
```
landing_viewed
 → fleet_cta_clicked
 → company_interest_submitted
```
Objectif : détecter la demande entreprise/flotte avant même d'avoir construit le produit.

## KPIs hebdomadaires
- Taux de création de compte (`auth_*_success` / `landing_viewed`)
- Taux de garage préparé (`garage_vehicle_added` / comptes)
- Taux de sélection véhicule garage (`constat_garage_vehicle_selected` / `constat_started`)
- Taux d'abandon constat (1 − `pdf_generation_success` / `constat_started`)
- Taux de conversion paiement (`payment_success` / `payment_started`)
- Taux de génération PDF (`pdf_generation_success` / `payment_success`)
- Taux d'invitation QR (`participant_qr_displayed` / `constat_started`)
- Taux participant rejoint (`participant_joined_via_qr` / `participant_qr_displayed`)
- Taux de retour utilisateur (PostHog retention 7/30 j)
- Conversion **par langue** (breakdown `language`)
- Conversion **par source véhicule** (breakdown `source`)
- Intérêt B2B (`company_interest_submitted` / semaine)

## Seuils de lecture (à calibrer après ~200 sessions réelles)
- **Traction forte** : conversion `constat_started → payment_success` > 25 % ; participant QR rejoint > 50 % ; rétention 30 j comptes > 20 %.
- **Ne convertit pas** : `landing_viewed → constat_started` < 8 % ; `payment_started → payment_success` < 60 % (friction paiement).
- **Correction UX urgente** : abandon sur une même étape `constat_*` > 40 % ; drop `cta_start_constat_clicked → constat_started` > 50 % (parcours d'entrée cassé).

## Dashboards à regarder chaque semaine
1. Funnel B2C principal (avec breakdown langue + source).
2. Funnel Compte/Garage.
3. Rétention 7/30 j.
4. Viralité QR.
5. Intérêt B2B (compteur).
