# Build AAB — boom.contact (Google Play) · CI-first

## ✅ État (2026-07-16)
- `READ_MEDIA_IMAGES` retiré (cause du rejet "Photo and Video Permissions") — commit 40a675e.
- Sélection photo = `<input type="file">` WebView → aucune permission média requise.
- `versionCode 2`, `versionName 1.0.1`.
- **Workflow CI opérationnel** : AAB signé produit et vérifié (run 29477397925).

## 🔑 Clé de signature — état des lieux
- Google Play attend (clé d'upload du versionCode 1) :
  `BA:B3:01:16:BE:93:77:C0:0B:38:FA:72:F9:27:46:28:B9:FD:77:E3`
- La clé effectivement présente dans le pipeline (secret GitHub `KEYSTORE_BASE64`
  = keystore STORES/assets, Owner CN=boom.contact O=PEP's Swiss SA) :
  `94:25:82:FA:81:2C:B2:EC:89:E3:6F:76:4F:37:10:CB:6A:9D:08:64`
- ⚠️ La clé BA:B3 n'est **nulle part** dans le repo/CI GitHub. (Piste restante :
  variables Codemagic `android_signing` si le v1 a été buildé là — à vérifier dans
  l'UI Codemagic. Sinon → réinitialisation.)
- **Procédure de réinitialisation** : Play Console → Configuration → Intégrité de
  l'app → Clé d'upload → « Demander une réinitialisation » → uploader le certificat
  du keystore 94:25 (délai Google ~48h). Ensuite l'AAB CI passe tel quel.

## 🚀 Build via CI (méthode privilégiée)
```bash
# Lancer le workflow (branche main) :
curl -X POST -H "Authorization: token <GH_TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/O-N-2950/boom-contact/actions/workflows/build-android.yml/dispatches \
  -d '{"ref":"main"}'
# (ou GitHub → Actions → "Build Android (.aab)" → Run workflow)
```
Le workflow : build client → cap sync → décode le keystore (secret `KEYSTORE_BASE64`)
→ `gradlew bundleRelease` signé → **échoue si un READ_MEDIA_* réapparaît** → affiche
le SHA1 → publie l'artifact `boom-contact-aab-signed` (30 j).
`versionCode` = celui du repo (le workflow ne l'écrase plus) ; `versionName` forçable
via l'input optionnel.

## 🔍 Vérifications (sur l'AAB téléchargé)
```bash
# Permissions + version (autoritaire) :
java -jar bundletool.jar dump manifest --bundle=app-release.aab | grep -E 'versionCode|uses-permission'
# → AUCUN READ_MEDIA_IMAGES / READ_MEDIA_VIDEO ; versionCode="2"

# SHA1 de signature :
keytool -printcert -jarfile app-release.aab | grep SHA1
```

## 🖥 Build local (secours, Android Studio)
`npm ci && npm run build:client && npx cap sync android && cd android && ./gradlew bundleRelease`
avec `keystore.properties` (voir example) ou env `KEYSTORE_FILE/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD`.

## Rappel zéro-paiement natif
Aucun prix / achat in-app / SDK de facturation dans l'AAB. Paiement 100% web (Stripe).
