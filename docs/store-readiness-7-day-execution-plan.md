# Store Readiness — Plan d'exécution 7 jours (→ TestFlight + Google Internal Testing)

Pré-requis : `codemagic.yaml` (racine, créé) + `codemagic-store-build-runbook.md`. Aucune nouvelle feature pendant ce plan.

## Statut d'exécution (2026-06-01)
- ✅ `codemagic.yaml` corrigé (contrat de variables env aligné avec `build.gradle` ; bug `-P` retiré) + validé YAML.
- ⏳ Builds/uploads NON exécutables par l'assistant (accès Codemagic/Apple/Google requis) → voir étapes A–F dans `codemagic-store-build-runbook.md`.

## Jour 1 — Codemagic & builds
- Créer les groupes de secrets Codemagic (android_signing, google_play) + clé ASC (boom_contact_asc_key).
- Générer le keystore Android (hors CI), l'encoder base64 → Secure file `CM_KEYSTORE`.
- Lancer workflow `android-internal` (AAB) et `ios-testflight` (IPA) → vérifier que `quality:prestore` passe en CI.

## Jour 2 — Uploads tests
- TestFlight : build iOS traité, testeurs internes ajoutés, permissions visibles.
- Google Internal Testing : AAB sur track internal, Play App Signing activé, App Links vérifiés.

## Jour 3 — Device QA core B2C
- Suivre `device-qa-master-checklist.md` (section P0) sur iPhone récent + Android récent : onboarding, magic link, constat complet, fallbacks permissions, PDF/email, suppression compte.

## Jour 4 — Device QA B2B flotte
- Org, invitations (envoi/renvoi/révocation), changement rôle, retrait, dernier owner protégé, solde + historique + export crédits entreprise.

## Jour 5 — Stripe test + PDF/email + analytics
- Achat crédits (perso + entreprise) en Stripe test (carte 4242) → crédit ajouté.
- PDF généré + email reçu (Gmail/Outlook) ; envoi d'une **invitation flotte réelle** (délivrabilité, non-spam).
- Vérifier consentement analytics (aucun event avant accord) + events présents après.

## Jour 6 — Corrections + assets
- Corriger les KO P0/P1 relevés.
- Produire screenshots définitifs FR/EN/DE/IT + feature graphic Google (voir `store-assets-final-review.md`).

## Jour 7 — Soumission beta
- Finaliser App Privacy (Apple) via `app-store-privacy-final.md`.
- Finaliser Data Safety (Google) via `google-play-data-safety-final.md`.
- Reviewer notes via `store-reviewer-account-final.md`.
- Soumettre la **beta** (TestFlight externe / Closed testing). **Pas** de soumission publique avant validation juriste + QA P0/P1 verts.

## Sortie attendue
TestFlight + Google Internal Testing opérationnels, QA P0 verte, assets en cours. Soumission publique = après juriste + P0/P1 verts + analytics consentement confirmé.
