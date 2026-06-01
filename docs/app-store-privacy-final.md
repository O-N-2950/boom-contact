# App Store — App Privacy (final)

Déclaration "App Privacy" (nutrition label) basée sur la collecte RÉELLE. Détail console : voir `apple-app-privacy-console-checklist.md`. Ne rien minimiser.

Légende : Lié = lié à l'identité de l'utilisateur · Tracking = utilisé pour suivi cross-app (NON pour boom.contact).

| Donnée | Collectée | Finalité | Lié | Tracking | Conservation | Suppression |
|---|---|---|---|---|---|---|
| **Email** | Oui | Authentification (magic link), envoi du constat, invitations flotte | Oui | Non | Tant que le compte existe | Sur suppression de compte |
| **Identifiant compte** (user id) | Oui | Fonctionnement du compte | Oui | Non | Compte | Suppression compte |
| **Photos** (dégâts, documents) | Oui | Pièces jointes du constat + OCR | Oui | Non | Durée de la session/constat ; sessions purgées | Suppression compte/session |
| **Audio** (description vocale) | Oui | Transcription (Whisper) → texte du constat | Oui | Non | Transitoire (transcription) ; non conservé comme média long terme | Suppression session |
| **Localisation (approx./précise)** | Oui (optionnel) | Pré-remplir le lieu de l'accident | Oui | Non | Stockée dans le constat | Suppression session |
| **Données accident / constat** | Oui | Cœur du produit (constat numérique) | Oui | Non | Session (purge programmée) | Suppression session/compte |
| **Véhicules** (perso + entreprise) | Oui | Garage, pré-remplissage constat | Oui | Non | Compte/organisation | Suppression compte / retrait org |
| **Données d'organisation/flotte** (membres, rôles, invitations) | Oui | Gestion B2B flotte | Oui | Non | Vie de l'organisation | Suppression org / retrait membre |
| **Infos paiement** | **Non collectées par l'app** | Paiement traité par **Stripe** (l'app ne stocke pas de carte) | — | Non | Géré par Stripe | — |
| **Identifiants d'usage / analytics** | Oui | Mesure produit (**PostHog**, **GA4**) — consentement | Oui (PostHog/GA4) | Non | Selon politique de l'outil | Opt-out / suppression compte |
| **Diagnostics / crash** | Oui | Stabilité (**Sentry**) | Possible | Non | Rétention Sentry | — |

## Partage avec des tiers (processors)
Stripe (paiement), Resend (email), Anthropic (OCR image→texte), OpenAI (transcription audio→texte), PostHog + GA4 (analytics, sous consentement), Sentry (diagnostics), OpenStreetMap/Nominatim (géocodage). Aucun **vente** de données, aucun **tracking publicitaire cross-app**.

## Points de vigilance Apple
- Analytics (PostHog/GA4) doivent être **gated par consentement** ; déclarer "Usage Data — Analytics".
- Audio/photos/localisation : déclarés "Linked to user", finalité "App Functionality".
- Pas d'ATT requis (pas de tracking). Ne PAS cocher "Used for Tracking".
- Bouton **suppression de compte** requis par Apple (App Store Guideline 5.1.1(v)) — vérifier qu'il est accessible dans le compte (P0).

## À confirmer avant soumission
1. Présence et fonctionnement du **bouton suppression de compte** in-app (P0).
2. Consentement analytics effectif avant tout event (P0) — voir `analytics-privacy-review.md`.
