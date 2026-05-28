# Runbook — Build signé iOS & TestFlight — boom.contact

> Pré-requis : macOS + Xcode 15+, compte Apple Developer Program actif, accès au repo.
> App : `contact.boom.app` · version **1.0.0** · build **1**.

---

## 0. Préparer le bundle web
```bash
npm run build
npx cap sync ios
```

## 1. Ouvrir le projet
```bash
npx cap open ios
# ou ouvrir manuellement :
open ios/App/App.xcworkspace
```
> Toujours ouvrir le **`.xcworkspace`** (pas le `.xcodeproj`) — CocoaPods.

## 2. Signing & Capabilities (target `App`)
- [ ] **Team** : sélectionner le compte Apple Developer (le **Team ID** s'affiche ici → reporter dans l'AASA, cf. `well-known-finalization.md`).
- [ ] **Bundle Identifier** : `contact.boom.app`.
- [ ] **Automatically manage signing** : activé (sauf gestion manuelle des profils).
- [ ] **Associated Domains** : la capability doit être présente. Si absente → **+ Capability** → *Associated Domains*. Vérifier les deux entrées :
  - `applinks:www.boom.contact`
  - `applinks:boom.contact`
  > Ces entrées sont déjà dans `ios/App/App/App.entitlements` et référencées via `CODE_SIGN_ENTITLEMENTS`. Il faut **aussi** que la capability soit activée dans le profil de provisioning (App ID Apple Developer → Associated Domains coché).

## 3. Version
- [ ] **General → Identity** : Version `1.0.0`, Build `1`.
  (Géré par `MARKETING_VERSION = 1.0.0` / `CURRENT_PROJECT_VERSION = 1` dans le pbxproj.)

## 4. Permissions `Info.plist` (déjà présentes — vérifier)
- [ ] `NSCameraUsageDescription`
- [ ] `NSMicrophoneUsageDescription`
- [ ] `NSLocationWhenInUseUsageDescription`
- [ ] `NSPhotoLibraryUsageDescription`

## 5. Archive & upload
- [ ] Sélectionner la cible **Any iOS Device (arm64)**.
- [ ] **Product → Archive**.
- [ ] Dans l'Organizer : **Distribute App → App Store Connect → Upload**.
- [ ] Attendre le traitement dans **App Store Connect → TestFlight**.

## 6. TestFlight — groupe interne
- [ ] App Store Connect → TestFlight → **Internal Testing** → créer un groupe.
- [ ] Ajouter les testeurs (jusqu'à 100 internes, pas de review Apple).
- [ ] Renseigner les **instructions de test** (cf. `docs/testflight-reviewer-instructions.md`).
- [ ] Renseigner les coordonnées + description de la beta.

## 7. Checklist de fumée sur iPhone réel (TestFlight)
- [ ] L'app se lance (écran intro/sécurité visible)
- [ ] Login / mode invité
- [ ] Micro (description vocale) — prompt + transcription
- [ ] Caméra / photos (OCR + photos dégâts)
- [ ] Localisation (lieu accident)
- [ ] QR sur second appareil (B rejoint)
- [ ] Stripe **success** → retour dans l'app (PDF prêt)
- [ ] Stripe **cancel** → retour propre dans l'app
- [ ] PDF généré
- [ ] Email reçu
- [ ] Parcours **A/B/C/D/E** complet
- [ ] Universal Link : ouvrir `https://www.boom.contact/?session=X&paid=1` → ouvre l'app (cf. DL-03)

## 8. Risques iOS spécifiques
- `getUserMedia` (micro) en WKWebView : OK iOS 14.5+ avec `NSMicrophone` — **tester** refus + ré-autorisation.
- Universal Links : ne fonctionnent que si l'AASA porte le **vrai Team ID** + capability dans le profil. Sinon le lien ouvre Safari.
- Photo picker via `<input type=file capture>` : vérifier ouverture caméra + bibliothèque.
- App froide ouverte via lien : vérifier que `appUrlOpen` est capté au démarrage.
