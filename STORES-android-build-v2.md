# Build AAB versionCode 2 — boom.contact (Google Play)

## ✅ Déjà fait (code, commit 40a675e)
- `READ_MEDIA_IMAGES` retiré du manifeste (cause du rejet "Photo and Video Permissions").
- Sélection photo = `<input type="file">` WebView → aucune permission média requise.
- `versionCode 2`, `versionName 1.0.1`.

## ⚠️ À faire sur une machine avec Android Studio + Android SDK

### Étape 0 — Le keystore d'upload (BLOQUANT)
Google attend la clé d'upload SHA1 :
`BA:B3:01:16:BE:93:77:C0:0B:38:FA:72:F9:27:46:28:B9:FD:77:E3`

Le keystore présent dans STORES.../assets/keystore-android (SHA1 94:25:...) NE correspond PAS.

- **Si tu as le keystore d'origine** → utilise-le à l'étape 3.
- **Si tu ne l'as plus** (probable) → Play Console → **Configuration → Intégrité de
  l'app → Clé d'upload → "Demander une réinitialisation"**. Uploade la nouvelle clé
  (le 94:25 peut alors devenir la clé d'upload officielle). Délai Google ~48h.

### Étape 1 — Synchroniser le web build dans Android
```bash
cd boom-contact
npm ci
npm run build              # génère dist/client
npx cap sync android       # copie le web build + plugins dans android/
```

### Étape 2 — Vérifier le manifeste fusionné (aucune permission média)
```bash
cd android
./gradlew :app:processReleaseManifest
# puis inspecter le manifeste fusionné :
cat app/build/intermediates/merged_manifests/release/AndroidManifest.xml | grep -i "READ_MEDIA"
# → NE DOIT RIEN afficher
```

### Étape 3 — Builder l'AAB signé
Configure `android/keystore.properties` (voir keystore.properties.example) avec le
BON keystore, puis :
```bash
./gradlew bundleRelease
# AAB généré : android/app/build/outputs/bundle/release/app-release.aab
```

### Étape 4 — Vérifier l'AAB final (critère d'acceptation)
```bash
# Permissions dans l'AAB (via bundletool) :
bundletool dump manifest --bundle=app/build/outputs/bundle/release/app-release.aab | grep -i "permission"
# → AUCUN READ_MEDIA_IMAGES / READ_MEDIA_VIDEO

# SHA1 de la signature (doit matcher la clé d'upload attendue) :
keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab
# ou, depuis le keystore :
keytool -list -v -keystore <ton-keystore> -alias <ton-alias> | grep SHA1
```

### Étape 5 — Upload
Play Console → Production → Créer une release → uploader `app-release.aab` (versionCode 2)
→ renvoyer pour examen.

## Rappel modèle zéro-paiement natif
L'AAB ne doit contenir aucun prix / achat in-app / SDK de facturation. Le paiement
reste 100% web (Stripe). Rien dans ce build n'ajoute de paiement.
