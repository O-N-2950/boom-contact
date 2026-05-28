# Finalisation `.well-known` — boom.contact

> État actuel (live, vérifié) : les deux fichiers sont servis en `application/json`, HTTP 200, sans redirection, **avec des placeholders** :
> - `client/public/.well-known/apple-app-site-association` → `TEAMID_TO_REPLACE.contact.boom.app`
> - `client/public/.well-known/assetlinks.json` → `SHA256_CERT_FINGERPRINT_TO_REPLACE`
>
> Ce document décrit **comment obtenir les vraies valeurs** et les **commandes exactes** pour finaliser. Tant que les vraies valeurs ne sont pas en place et testées sur appareil, les liens natifs **ne sont pas validés**.

---

## 0. Référence — clés Android & Apple Team ID (faisant autorité)

### 0.1 Placeholders à CONSERVER tant que les vraies valeurs ne sont pas disponibles
| Placeholder | Fichier source unique (servi live) | À remplacer par |
|---|---|---|
| `TEAMID_TO_REPLACE` | `client/public/.well-known/apple-app-site-association` | Apple Team ID **réel** du compte propriétaire de boom.contact |
| `SHA256_CERT_FINGERPRINT_TO_REPLACE` | `client/public/.well-known/assetlinks.json` | SHA-256 de la **Play App Signing key** de boom.contact |

**Règles** : ne jamais inventer une valeur · ne jamais réutiliser la valeur d'une autre application · garder le placeholder tant que la vraie valeur boom.contact n'est pas confirmée.

### 0.2 Android — les 3 clés à ne PAS confondre
| Clé | Rôle | Source du SHA-256 | Dans `assetlinks.json` ? |
|---|---|---|---|
| **Debug key** | builds locaux de dev | `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android` | ❌ **Jamais** en production (test local uniquement) |
| **Upload key** (release keystore) | signe l'AAB que **tu** envoies à Google | `keytool -list -v -keystore boom-contact-release.keystore -alias boom-contact` ou `./gradlew signingReport` | ⚠️ Optionnel (complément sideload) — **pas** la clé de vérif principale |
| **Play App Signing key** | clé **détenue par Google** qui signe l'app livrée aux appareils | Play Console → **Setup** → **App integrity** → **App signing key certificate** → **SHA-256** | ✅ **OUI — valeur principale obligatoire** |

**Valeur finale d'`assetlinks.json` = SHA-256 de la Play App Signing key de boom.contact**, package **`contact.boom.app`**.
Raison : avec Play App Signing activé, l'app installée est re-signée par la clé de Google ; la vérification Android App Links lit le certificat de la clé qui signe réellement l'app livrée. Mettre l'upload key seule → App Links échouent silencieusement en production.
La clé upload peut être **ajoutée en complément** (tableau `sha256_cert_fingerprints` multi-entrées) pour couvrir les builds signés uniquement par l'upload key (sideload/dev), mais la clé **principale** pour les installs Play (y compris Internal Testing distribué par Play) reste la **Play App Signing key**.

> ⚠️ **Timing — ne pas remplacer trop tôt** : la Play App Signing key SHA-256 n'existe qu'**après** création de l'app boom.contact dans Play Console + configuration Play App Signing. Tant que ce n'est pas fait → garder `SHA256_CERT_FINGERPRINT_TO_REPLACE`.

### 0.3 Apple — Team ID
- **Apple Team ID** = valeur du compte **Apple Developer** (10 caractères alphanumériques) — Membership, ou Xcode → Signing & Capabilities.
- appID final attendu dans l'AASA : **`TEAMID.contact.boom.app`** (suffixe = `appId` Capacitor `contact.boom.app`).
- Associated Domains iOS **déjà configurés** dans `ios/App/App/App.entitlements` (`applinks:www.boom.contact` + `applinks:boom.contact`).
- Ne jamais inventer le Team ID. Garder `TEAMID_TO_REPLACE` tant que la vraie valeur n'est pas fournie.

### 0.4 Sécurité signature release (Phase 10A)
`android/app/build.gradle` ne contient **aucun mot de passe en dur**. Les secrets de signature sont résolus ainsi : 1) variables d'environnement (`KEYSTORE_PASSWORD`, `KEY_PASSWORD`, option. `KEY_ALIAS`, `KEYSTORE_FILE`), sinon 2) fichier local **non commité** `android/keystore.properties` (gitignored, voir `keystore.properties.example`). Un build **release** sans ces secrets **échoue explicitement** (fail-fast) ; les builds debug ne sont pas affectés ; les mots de passe ne sont jamais logués.

> 🔁 **Rotation obligatoire avant publication** : un ancien fallback en dur (`BoomContact2026!`) existait dans l'historique git. Si le vrai release keystore utilise ce mot de passe, le **roter impérativement** avant toute soumission store et stocker le nouveau secret hors git (env/CI ou `keystore.properties`).

---

## 1. Apple — AASA (Universal Links)

### 1.1 Obtenir le vrai Apple Team ID
Deux méthodes :
- **Apple Developer** → [Membership](https://developer.apple.com/account) → champ **Team ID** (10 caractères alphanumériques, ex. `A1B2C3D4E5`).
- **Xcode** → projet `App` → onglet **Signing & Capabilities** → **Team** (le Team ID apparaît entre parenthèses).

### 1.2 Remplacer dans le fichier
Fichier : `client/public/.well-known/apple-app-site-association`

Remplacer :
```
"TEAMID_TO_REPLACE.contact.boom.app"
```
par (exemple, à adapter) :
```
"A1B2C3D4E5.contact.boom.app"
```

Commande sûre (remplace `A1B2C3D4E5` par le vrai Team ID) :
```bash
sed -i 's/TEAMID_TO_REPLACE/A1B2C3D4E5/' client/public/.well-known/apple-app-site-association
```

### 1.3 Rebuild + sync + déploiement
```bash
npm run build
npx cap sync ios
git add -A && git commit -m "AASA: vrai Apple Team ID" && git push origin main
# attendre le deploy Railway SUCCESS
```

### 1.4 Vérification live (critères)
```bash
curl -I https://www.boom.contact/.well-known/apple-app-site-association
curl    https://www.boom.contact/.well-known/apple-app-site-association
```
- [ ] HTTP **200**
- [ ] **pas** de redirection (pas de header `Location`)
- [ ] `content-type: application/json` (ou type accepté par Apple)
- [ ] JSON **valide**
- [ ] **vrai** Team ID (plus de `TEAMID_TO_REPLACE`)
- [ ] bundle id `contact.boom.app`

> Note : Apple récupère l'AASA via son CDN. En cas de cache, attendre, ou réinstaller l'app pour forcer la revérification des associated domains.

---

## 2. Android — assetlinks.json (App Links)

### 2.1 Obtenir le vrai SHA-256

**Méthode A — debug/interne temporaire** (NE PAS utiliser pour la release publique) :
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```
→ relever la ligne `SHA256:`.

**Méthode B — release / Play App Signing** (la bonne pour la publication) :
- Google Play Console → **Setup** → **App integrity** → **App signing key certificate** → **SHA-256 certificate fingerprint**.
- Important : si **Play App Signing** est activé (recommandé), c'est le fingerprint de la **clé de signature d'app** (App signing key), pas seulement l'upload key, qu'il faut mettre dans assetlinks.json — sinon les App Links ne se vérifient pas en production. En interne testing, le fingerprint de l'upload key peut suffire selon la config ; mettre **les deux** est sûr.

### 2.2 Remplacer dans le fichier
Fichier : `client/public/.well-known/assetlinks.json`

Remplacer `SHA256_CERT_FINGERPRINT_TO_REPLACE` par le fingerprint (format `AA:BB:CC:...`).
Pour gérer upload key + app signing key, mettre plusieurs entrées :
```json
"sha256_cert_fingerprints": [
  "FINGERPRINT_APP_SIGNING_KEY",
  "FINGERPRINT_UPLOAD_KEY"
]
```

Commande (remplacer la vraie valeur) :
```bash
sed -i 's/SHA256_CERT_FINGERPRINT_TO_REPLACE/AA:BB:CC:.../' client/public/.well-known/assetlinks.json
```

### 2.3 Rebuild + sync + déploiement
```bash
npm run build
npx cap sync android
git add -A && git commit -m "assetlinks: vrai SHA-256" && git push origin main
# attendre le deploy Railway SUCCESS
```

### 2.4 Vérification live (critères)
```bash
curl -I https://www.boom.contact/.well-known/assetlinks.json
curl    https://www.boom.contact/.well-known/assetlinks.json
```
- [ ] HTTP **200**
- [ ] **pas** de redirection
- [ ] JSON **valide**
- [ ] package `contact.boom.app`
- [ ] **vrai** SHA-256 (plus de `SHA256_CERT_FINGERPRINT_TO_REPLACE`)

### 2.5 Vérifier la vérification App Links sur device
```bash
adb shell pm get-app-links contact.boom.app
# ou forcer :
adb shell pm verify-app-links --re-verify contact.boom.app
```
→ doit indiquer `verified` pour `www.boom.contact` et `boom.contact`.

---

## 3. Résumé des valeurs à fournir manuellement

| Valeur | Source | Fichier cible |
|---|---|---|
| Apple Team ID | Apple Developer → Membership / Xcode | `apple-app-site-association` |
| SHA-256 (App signing key) | Play Console → App integrity | `assetlinks.json` |
| SHA-256 (upload key, optionnel) | `keytool` / `gradlew signingReport` | `assetlinks.json` |

**Tant que ces valeurs ne sont pas en place ET testées sur device → liens natifs NON validés → NO-GO public.**
