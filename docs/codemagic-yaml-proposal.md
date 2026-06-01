# Codemagic YAML — Proposal

✅ Un `codemagic.yaml` RÉEL a été créé à la racine du repo (ce document décrit ses choix).

Deux workflows :
- `android-internal` : quality gate → web build → `cap sync android` → décode keystore (Secure file base64) → `gradlew bundleRelease` → publie sur **Google Play Internal Testing** (track `internal`).
- `ios-testflight` : quality gate → web build → `cap sync ios` → `pod install` → `fetch-signing-files` (ASC API key) → `build-ipa` → publie sur **TestFlight**.

Principes :
- **Aucun secret dans le YAML** : tout via groupes Codemagic (`android_signing`, `google_play`) et Code Signing Identities (clé ASC). Keystore = Secure file base64, jamais committé.
- Quality gate bloquant (`npm run quality:prestore`) avant tout build.
- Pas de soumission App Store automatique (TestFlight seulement) ; publication manuelle après QA + juriste.
- Artefacts : `.aab` + `mapping.txt` (Android), `.ipa` + logs Xcode (iOS).

Variables à renseigner : voir en-tête de `codemagic.yaml` et `codemagic-store-build-runbook.md`.
