# Fleet B2B — Monetization

_Options de monétisation entreprise. Mise à jour : 2026-05-29. Pricing indicatif, à valider marché._

## 1. Trois modèles

### Modèle 1 — Crédits entreprise (wallet)
L'organisation achète des packs de crédits ; chaque constat sur véhicule d'org débite le wallet.
- **Avantages** : continuité directe du modèle B2C actuel (packs Stripe), pas de récurrent à gérer,
  prévisible pour la PME, **impact Stripe minimal** (réutilise Checkout, crédite `credit_wallets`).
- **Inconvénients** : pas de revenu récurrent garanti ; sous-consommation possible.
- **Pricing indicatif** : packs 50 / 200 / 1000 constats à tarif dégressif (ex. 3.90 → 2.50 → 1.50 €/constat).
- **Complexité technique** : **faible**. Nouvelle route serveur « achat crédits org » + crédit du wallet.
- **Webhook** : non modifié ; une route dédiée distingue achat perso vs org via metadata Checkout.
- **Pertinence** : idéale **PME** et démarrage ; faible friction.

### Modèle 2 — Abonnement par véhicule
Tarif mensuel/annuel par véhicule actif dans la flotte (constats illimités ou inclus).
- **Avantages** : **revenu récurrent** prévisible, scale avec la taille de flotte, valorisation SaaS.
- **Inconvénients** : friction d'entrée plus élevée ; nécessite gestion d'abonnements (Stripe Billing),
  comptage de véhicules actifs, prorata.
- **Pricing indicatif** : 0.90–2.00 € / véhicule / mois selon volume (dégressif au-delà de 500 véhicules).
- **Complexité technique** : **élevée** (Stripe Billing, métrage, prorata, downgrades).
- **Webhook** : **adaptation requise** (events `customer.subscription.*` en plus de `checkout.session.completed`).
- **Pertinence** : **grands comptes** et flottes stables.

### Modèle 3 — Abonnement entreprise + packs de constats
Forfait plateforme (dashboard, multi-utilisateurs, support) + crédits/constats à la consommation.
- **Avantages** : équilibre récurrent (plateforme) + variable (usage) ; upsell naturel ; marges saines.
- **Inconvénients** : deux logiques de facturation à maintenir.
- **Pricing indicatif** : 49–199 €/mois plateforme selon taille + packs de constats (modèle 1).
- **Complexité technique** : **moyenne-élevée** (Billing + wallet).
- **Webhook** : adaptation (abonnement plateforme) + route crédits (packs).
- **Pertinence** : **PME structurées et grands comptes** ; meilleur LTV.

## 2. Recommandation de séquencement
- **MVP / 30-90 j** : **Modèle 1 (wallet crédits org)** — réutilise l'infra Stripe existante, risque
  minimal, time-to-revenue court. Webhook intact.
- **12 mois** : introduire **Modèle 3** (forfait plateforme + packs) une fois le dashboard mûr et la
  valeur prouvée ; réserver le **Modèle 2** (par véhicule) aux grands comptes négociés.

## 3. Offres partenaires
- **Offre courtier** : compte `broker_viewer` multi-clients ; le courtier recommande boom.contact à ses
  assurés (les constats PDF arrivent prêts pour la déclaration de sinistre). Commission d'apport ou
  pack revendeur à tarif courtier.
- **Offre assureur partenaire** : `insurer_viewer` + (12 mois) intégration API/export sinistre structuré ;
  l'assureur peut proposer boom.contact à son portefeuille.
- **White-label (futur)** : l'assureur/courtier déploie sous son branding ; licence annuelle + setup.

## 4. Leviers d'acquisition
- **Essai gratuit entreprise** : 30 jours, dashboard complet, X constats offerts (ex. 10) pour onboarder
  sans risque.
- **Crédits offerts à l'onboarding** : créditer le wallet org à la création (ex. 5–10 constats) pour
  amorcer l'usage.
- **Boucle PDF → courtier/assureur → B2B** : chaque PDF horodaté qui arrive chez un courtier/assureur
  est une démo gratuite du produit → canal d'acquisition B2B organique.

## 5. Impact Stripe — synthèse
| Modèle | Stripe | Webhook actuel |
| --- | --- | --- |
| 1 — Wallet crédits | Checkout (existant) + metadata org | **Inchangé** (route dédiée crédite le wallet) |
| 2 — Par véhicule | Stripe **Billing** (subscriptions) | **À étendre** (events subscription) |
| 3 — Forfait + packs | Billing + Checkout | À étendre (subscription) + route crédits |

> Règle : tant qu'on reste sur le **Modèle 1**, le webhook Stripe **n'est pas modifié**. Toute extension
> Billing (Modèles 2/3) fera l'objet d'un sprint dédié avec tests, sans toucher le flux de crédits perso.

---
## MAJ Monetization sprint (2026-05-29)
Wallet org (credit_wallets + wallet_transactions) + routage billing livrés. Modèle 1 (wallet crédits org) techniquement prêt côté consommation. Reste : route d'achat (Checkout metadata → addOrganizationCredits), webhook Stripe inchangé. Précédence : org si wallet approvisionné, sinon perso (non bloquant).

---
## MAJ Monetization Part 2 (2026-05-29) — achat de crédits entreprise (Stripe)
- Route payment.createOrgCheckout (owner/fleet_admin) → Stripe Checkout, metadata.kind='org_credits' + organizationId + actorUserId. Réutilise PACKAGES/getPrice. payments enregistré (userEmail=acteur) pour idempotence.
- Webhook checkout.session.completed : BRANCHE org_credits isolée en TÊTE du handler → creditOrganizationFromPurchase (idempotent par session Stripe via wallet_transactions.relatedPaymentId) → return. Le flux PERSO est inchangé (s'exécute seulement si kind !== 'org_credits').
- creditOrganizationFromPurchase : idempotent (retries webhook ne re-créditent jamais), montant>0, txn type='purchase' reason='org_checkout'.
- canManageOrganizationBilling (owner/fleet_admin) gate l'achat (route + UI).
- UI AccountPage : 3 boutons d'achat (1/3/10 crédits) par org pour owner/fleet_admin ; détection retour ?org_credits=success → toast + refetch + analytics fleet_wallet_credit_added.
- AUCUNE migration (réutilise tables Block 16). Aucun changement de schéma.
- Tests : creditOrganizationFromPurchase (succès + idempotent + montant invalide), canManageOrganizationBilling. Total walletBilling 13→17.
### Le wallet org peut désormais être approvisionné → routage org devient effectif (org débitée en priorité). Monetization quasi bout-en-bout.

---
## MAJ QA (2026-05-29) — validation boucle Stripe B2B
- Test webhook automatisé (stripeWebhookOrg.test.ts, 7) exerçant le VRAI handleStripeWebhook : event org → wallet org crédité, chemin perso JAMAIS exécuté (db.transaction non appelé), idempotence (payments paid → skip), signature invalide → throw, createOrgCheckout metadata + success_url=org_credits=success.
- analytics fleet_wallet_credit_added : consentement-gaté (hasAnalyticsConsent), sans PII ni montant.
- Test plan manuel : docs/stripe-b2b-billing-test-plan.md (carte test 4242…, rejeu d'event pour idempotence, non-régression perso, rollback, logs).
- Script LECTURE SEULE sans secret : scripts/verify-org-wallet.mjs (DATABASE_URL env) → solde + transactions + détection double crédit.
- Route webhook réelle : POST /webhook/stripe. Idempotence DOUBLE : payments.status='paid' + unicité wallet_transactions.related_payment_id (purchase).
### RESTE À TESTER MANUELLEMENT : l'aller-retour réel Checkout→webhook→wallet en MODE TEST Stripe (clé sk_test + whsec test), non exécutable en sandbox.

---
## MAJ Finance Dashboard (2026-06-01)
- Dashboard finance entreprise (lecture seule) : solde + badge statut + historique transactions paginé + export CSV client, réservé owner/fleet_admin. DTO anti-PII (IDs tronqués, pas de createdByUserId/email/plaque/VIN). Webhook/paiement intacts. Export = client-side depuis liste sanitisée.
