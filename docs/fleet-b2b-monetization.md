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
