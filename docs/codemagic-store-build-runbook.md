# Codemagic — Store Build Runbook (boom.contact)

État audité (2026-06-01) : `codemagic.yaml` créé à la racine. Config native déjà prête :
- **Android** : `applicationId contact.boom.app`, `versionCode 1`, `versionName "1.0.0"`, `minSdk 23`, `target/compileSdk 35`, signing par variables d'env (`KEYSTORE_FILE`/`KEYSTORE_PASSWORD`/`KEY_ALIAS`/`KEY_PASSWORD`), `minifyEnabled true`, App Links `autoVerify` sur `www.boom.contact` + `boom.contact`. 20 assets d'icône présents.
- **iOS** : `PRODUCT_BUNDLE_IDENTIFIER contact.boom.app`, `MARKETING_VERSION 1.0.0`, `CURRENT_PROJECT_VERSION 1`, Associated Domains `applinks:www.boom.contact` + `applinks:boom.contact`, 4 `UsageDescription` (caméra/localisation/micro/photos). AppIcon 1024 présent.
- **Team ID Apple** : `7YWB99G6Q8`.

## Secrets à configurer dans Codemagic (JAMAIS dans Git)
Groupe `android_signing` : `CM_KEYSTORE` (fichier .keystore en base64, Secure file), `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (= `boom-contact`).
Groupe `google_play` : `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (JSON service account avec rôle "Release manager" limité Internal Testing).
Code signing identities (Teams) : clé App Store Connect API (Issuer ID + Key ID + .p8), nommée `boom_contact_asc_key`.

## Android — AAB → Google Internal Testing
1. Générer le keystore (une seule fois, hors CI, à conserver en lieu sûr) :
   `keytool -genkey -v -keystore boom-contact-release.keystore -alias boom-contact -keyalg RSA -keysize 2048 -validity 10000`
2. `base64 boom-contact-release.keystore` → coller dans la Secure file `CM_KEYSTORE`.
3. Activer **Play App Signing** côté Google Play Console (recommandé) : Google gère la clé d'app finale, le keystore d'upload reste le vôtre.
4. Lancer le workflow `android-internal`. Le yaml : `npm ci` → `quality:prestore` → `build:client` → `cap sync android` → décode keystore → `gradlew bundleRelease` → publie sur track `internal`.
5. Vérifier dans Play Console : AAB reçu, **App Links** vérifiés (Setup > App Links), signature Play OK.

## iOS — IPA → TestFlight
1. Créer la clé App Store Connect API (App Store Connect > Users and Access > Integrations) → l'ajouter dans Codemagic.
2. Lancer le workflow `ios-testflight` : `quality:prestore` → `build:client` → `cap sync ios` → `pod install` → `fetch-signing-files` (crée cert + profil) → `build-ipa` → publie sur **TestFlight**.
3. Vérifier dans App Store Connect : build traité, **Universal Links** OK (lien `https://www.boom.contact/?invite=...` ouvre l'app), permissions affichées.

## Commun
- `npm ci` (lockfile), `npm run quality:prestore` (gate bloquant), `npm run build:client` (bundle Vite dans `dist/client`, embarqué par Capacitor), `npx cap sync ios|android`.
- L'app embarque le bundle web (offline-first) — pas de "web clip" (évite rejet Apple 4.2).
- Aucune écriture de secret dans le repo ; keystore jamais committé (voir `.gitignore`).

## Pré-soumission (après TestFlight + Internal Testing)
Bumper les versions avant chaque nouvelle build : Android `versionCode`/`versionName`, iOS `CURRENT_PROJECT_VERSION`/`MARKETING_VERSION`. Voir `docs/store-readiness-7-day-execution-plan.md`.
