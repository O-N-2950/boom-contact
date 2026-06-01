# Google Play — Data Safety (final)

Formulaire Data Safety basé sur la collecte RÉELLE. Détail console : voir `google-data-safety-console-checklist.md`. Ne rien minimiser.

Pour chaque donnée : Collectée / Partagée / Finalité / Chiffrée en transit / Suppression possible.

| Type de donnée (catégorie Google) | Collectée | Partagée | Finalité | Transit chiffré | Suppression |
|---|---|---|---|---|---|
| **Adresse email** (Personal info) | Oui | Oui (Resend, envoi) | Auth, comptes, comms produit | Oui (HTTPS) | Oui (suppression compte) |
| **Identifiants utilisateur** | Oui | Non | Fonctionnement compte | Oui | Oui |
| **Photos** (Photos & videos) | Oui | Oui (Anthropic OCR, processor) | Pièces du constat + OCR | Oui | Oui |
| **Enregistrements audio** (Audio) | Oui | Oui (OpenAI Whisper, processor) | Transcription description | Oui | Oui (transitoire) |
| **Localisation approx. & précise** (Location) | Oui (optionnel) | Oui (Nominatim géocodage) | Lieu de l'accident | Oui | Oui |
| **Données utilisateur de l'app** (constat, véhicules, flotte) | Oui | Non (sauf processors techniques) | Cœur produit | Oui | Oui |
| **Infos de paiement** (Financial info) | **Non par l'app** | Stripe (processor) | Paiement crédits | Oui | Géré Stripe |
| **Interactions in-app / analytics** (App activity) | Oui | Oui (PostHog, GA4 — consentement) | Mesure produit | Oui | Opt-out / suppression compte |
| **Crash logs / diagnostics** (App info & performance) | Oui | Oui (Sentry) | Stabilité | Oui | — |

## Réponses clés du formulaire
- **Les données sont-elles chiffrées en transit ?** Oui (HTTPS/TLS partout).
- **L'utilisateur peut-il demander la suppression ?** Oui — suppression de compte in-app + suppression de session.
- **Données collectées vs partagées** : "partagées" = transmises à des **processors** (Stripe/Resend/Anthropic/OpenAI/PostHog/GA4/Sentry/Nominatim) pour fournir le service ; **aucune vente**, **aucune publicité ciblée**.
- **Collecte optionnelle** : localisation (l'app fonctionne sans), micro (fallback texte).

## Points de vigilance Google
- Déclarer toutes les catégories ci-dessus (ne pas omettre audio/localisation/analytics/flotte).
- Cohérence stricte entre Data Safety et la politique de confidentialité accessible in-app/web.
- Si analytics activés sans consentement préalable → risque de non-conformité ; vérifier le gating (P0).
- **Suppression de compte** : Google exige aussi un mécanisme (in-app + lien web). À confirmer (P0).
