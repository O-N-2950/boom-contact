# Runbook — Build signé Android & Google Play Internal Testing — boom.contact

> Pré-requis : Android Studio (Hedgehog+), JDK 17, compte Google Play Console (frais unique 25 USD), accès au repo.
> App : `contact.boom.app` · versionName **1.0.0** · versionCode **1**.

---

## 0. Préparer le bundle web
```bash
npm run build
npx cap sync android
```

## 1. Ouvrir le projet
```bash
npx cap open android
# ou ouvrir le dossier android/ dans Android Studio
```

## 2. Vérifier l'identité (`android/app/build.gradle`)
- [ ] `applicationId "contact.boom.app"`
- [ ] `versionName "1.0.0"`
- [ ] `versionCode 1`

## 3. Configurer la signature release
Deux options :

**Option recommandée — Play App Signing** : on génère une **upload key**, Google gère la clé de signature finale.
- Créer un keystore upload :
```bash
keytool -genkey -v -keystore boom-upload.keystore -alias boom-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
- Référencer dans `android/app/build.gradle` (bloc `signingConfigs { release { ... } }`) ou via `~/.gradle/gradle.properties` (ne **jamais** committer le keystore ni les mots de passe).

## 4. Générer l'AAB signé
```bash
cd android
./gradlew bundleRelease
# sortie : android/app/build/outputs/bundle/release/app-release.aab
```

## 5. Récupérer le SHA-256 (pour assetlinks.json)
```bash
cd android
./gradlew signingReport
```
- Pour **Internal Testing** rapide : le SHA-256 de l'**upload key** peut suffire.
- Pour la **publication** avec Play App Signing : utiliser le SHA-256 de la **App signing key** (Play Console → Setup → App integrity).
- **Quand utiliser quoi** : tant que Play gère la signature finale, c'est la **App signing key** de Play qui signe l'app distribuée → c'est **ce** fingerprint qui doit être dans `assetlinks.json` pour la prod. Mettre les deux (upload + app signing) est le plus sûr.

## 6. Mettre à jour assetlinks.json + redéployer le web
- Remplacer `SHA256_CERT_FINGERPRINT_TO_REPLACE` dans `client/public/.well-known/assetlinks.json` (cf. `well-known-finalization.md`).
```bash
npm run build && npx cap sync android
git add -A && git commit -m "assetlinks: vrai SHA-256" && git push origin main
```

## 7. Upload Google Play Internal Testing
- [ ] Play Console → créer l'app → **Internal testing** → **Create new release**.
- [ ] Uploader `app-release.aab`.
- [ ] Renseigner les notes de version.
- [ ] Ajouter les testeurs (liste d'emails).
- [ ] Publier sur la piste Internal testing.

## 8. Vérifications post-upload
- [ ] **Pre-launch report** (Play Console) : pas de crash bloquant, permissions cohérentes.
- [ ] App Link vérifié :
```bash
adb shell pm get-app-links contact.boom.app
```
- [ ] Stripe success/cancel → retour app.

## 9. Checklist de fumée sur Android réel
- [ ] App lance · login/invité · micro · caméra/photos · localisation
- [ ] QR second appareil · Stripe success/cancel retour app · PDF · email
- [ ] A/B/C/D/E complet · App Link ouvre l'app

## 10. Sécurité
- Ne **jamais** committer keystore / mots de passe / `gradle.properties` contenant des secrets.
- `.gitignore` doit couvrir `*.keystore`, `*.jks`, `key.properties`.
