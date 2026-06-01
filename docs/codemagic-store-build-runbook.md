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

---
## Day-1 Execution — correctif & étapes manuelles exactes (2026-06-01)

### Correctif pipeline (fait)
`codemagic.yaml` corrigé : le build Android utilise désormais les **variables d'environnement** (et non des `-P` Gradle, que `build.gradle` ne lit pas). Contrat EXACT lu par `android/app/build.gradle` (`System.getenv`) :
`KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS`, `KEYSTORE_FILE`. Le yaml décode `CM_KEYSTORE` (base64) en fichier et exporte `KEYSTORE_FILE`.
⚠️ Dans le groupe Codemagic `android_signing`, nommer les variables EXACTEMENT `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (PAS de préfixe `CM_`), + la Secure file `CM_KEYSTORE`.

### Étapes manuelles Olivier (ne peuvent pas être faites par l'assistant — accès Codemagic/Apple/Google requis)

**A. Keystore Android (à faire une seule fois, sur la machine d'Olivier)**
```
keytool -genkey -v -keystore boom-contact-release.keystore \
  -alias boom-contact -keyalg RSA -keysize 2048 -validity 10000
# Choisir un store password + key password robustes (à conserver dans un gestionnaire de secrets).
base64 -i boom-contact-release.keystore -o boom-contact-release.keystore.b64   # macOS
# (Linux: base64 boom-contact-release.keystore > boom-contact-release.keystore.b64)
```
Stockage : conserver `boom-contact-release.keystore` + les 2 mots de passe en lieu sûr (PERTE = impossible de publier des mises à jour). NE JAMAIS committer (déjà gitignored : `*.keystore`).

**B. Codemagic — groupe `android_signing`**
- Secure file `CM_KEYSTORE` = contenu de `boom-contact-release.keystore.b64`.
- Variable `KEYSTORE_PASSWORD` = store password (secret).
- Variable `KEY_PASSWORD` = key password (secret).
- Variable `KEY_ALIAS` = `boom-contact`.

**C. Codemagic — groupe `google_play`**
- `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = JSON du service account Google Cloud lié à Play Console (rôle limité, accès Internal Testing).
  1. Google Cloud Console → créer un service account → clé JSON.
  2. Play Console → Users & permissions → inviter le service account → permission "Release to internal testing".

**D. Codemagic — clé App Store Connect API (Teams > Code signing identities)**
- App Store Connect → Users and Access → Integrations → App Store Connect API → générer une clé (rôle App Manager).
- Récupérer Issuer ID + Key ID + fichier `.p8`, les ajouter dans Codemagic, nommer l'intégration `boom_contact_asc_key` (= valeur référencée dans le yaml).
- Team ID `7YWB99G6Q8` est lié à cette clé (équipe Apple Developer).

**E. Lancer les builds (Codemagic UI)**
1. Connecter le repo `O-N-2950/boom-contact` à Codemagic (le `codemagic.yaml` est détecté automatiquement).
2. Lancer le workflow `android-internal` → artifact `.aab` + publication track `internal`.
3. Lancer le workflow `ios-testflight` → artifact `.ipa` + publication TestFlight.
4. Logs et artifacts visibles dans la page du build Codemagic.

**F. Vérifications post-build**
- Android : AAB reçu dans Play Console (Internal testing), Play App Signing activé, App Links vérifiés.
- iOS : build "Processing" puis disponible dans TestFlight, Universal Links OK (lien `https://www.boom.contact/?invite=…` ouvre l'app).


---
## ⚠️ Node 22 OBLIGATOIRE (correctif 2026-06-01)
`@capacitor/cli@8.x` exige **Node >= 22**. Codemagic par défaut peut fournir Node 20 → `npm ci` échoue puis `tsc: command not found`.
Le `codemagic.yaml` force Node 22 de deux façons :
- `environment.node: 22` dans chaque workflow (`android-internal`, `ios-testflight`) ;
- en tête du Quality gate : `nvm install 22 && nvm use 22` + contrôle `node --version` (échec explicite si ≠ v22.x) AVANT `npm ci`.
Toujours vérifier dans les logs : `node: v22.x | npm: …` puis `Node 22 OK`.
