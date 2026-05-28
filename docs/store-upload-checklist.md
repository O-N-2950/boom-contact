# Upload checklist — App Store Connect & Google Play Console

> Checklist exhaustive à parcourir avant de cliquer sur « Submit for Review ».  
> Référence : `docs/store-listing-copy-fr-en.md` · `docs/store-screenshot-final-selection.md` · `docs/app-review-instructions.md`.

---

## A. App Store Connect

### A.1 Configuration générale
- [ ] **Bundle ID** : `contact.boom.app` (vérifier dans Xcode + AppIcon set)
- [ ] **Version** : `1.0.0` (`MARKETING_VERSION` dans pbxproj, configuré Sprint 2)
- [ ] **Build number** : `1` (`CURRENT_PROJECT_VERSION`)
- [ ] **Display name** : `boom.contact`
- [ ] **Category** : Primary = *Utilities* · Secondary = *Productivity* (à choisir)
- [ ] **Copyright** : `© 2026 PEP's Swiss SA — Groupe NEUKOMM`

### A.2 Localizations (FR principal + EN)
- [ ] **Promotional Text** (modifiable post-review) — cf. `store-listing-copy-fr-en.md`
- [ ] **Subtitle** (30 c.) — FR : « Documenter un accident » / EN : « Document a road accident »
- [ ] **Description** (4000 c.) FR + EN — collé depuis `store-listing-copy-fr-en.md`
- [ ] **Keywords** (100 c.) FR + EN — collés depuis `store-listing-copy-fr-en.md`
- [ ] **What's New in This Version** : « Première version. » (FR) / « First release. » (EN)
- [ ] **Marketing URL** : `https://www.boom.contact/`
- [ ] **Support URL** : `https://www.boom.contact/`
- [ ] **Privacy Policy URL** : `https://www.boom.contact/privacy`

### A.3 Screenshots (par localisation)
- [ ] **iPhone 6.7"** (1290×2796) × 7 : intro, qr, voice, signature, pdf, done, emergency — depuis `artifacts/store-screenshots/iphone67/` après habillage marketing
- [ ] **iPhone 6.5"** (1284×2778) × 7 — depuis `iphone65/`
- [ ] **iPhone 6.1"** (1179×2556) × 7 (optionnel) — depuis `iphone61/`
- [ ] **iPad 12.9"** : non requis V1 (pas de support iPad annoncé)
- [ ] **App Preview vidéo** : non requis V1 (optionnel)

### A.4 Privacy Nutrition Labels (App Privacy)
Cf. `docs/apple-app-privacy-console-checklist.md` (Sprint 3 draft).
- [ ] **Contact Info** : Name (collected, linked to user) · Email (collected, linked to user) · Phone (collected, optional)
- [ ] **Identifiers** : User ID (collected, linked, NOT for tracking)
- [ ] **Usage Data** : Product Interaction (collected, NOT linked, NOT for tracking) — via Sentry + PostHog opt-in
- [ ] **Diagnostics** : Crash data (Sentry) · Performance (PostHog)
- [ ] **Sensitive Info** : NON (pas de données médicales / biométriques en V1)
- [ ] **Tracking** : **Non** — Apple-style tracking disabled (pas de ATT requis)
- [ ] **Photos** : si l'utilisateur ajoute des photos d'accident (collected, NOT linked to user identity automatically)
- [ ] **Audio** : si l'utilisateur enregistre la voix (collected, processed via Whisper, supprimé après transcription)
- [ ] **Location** : optionnel, granularité coarse, NOT linked, NOT for tracking

### A.5 Age Rating
- [ ] Questionnaire complété : **4+** (pas de contenu sensible).
- [ ] Mention « accident / collision » : indiquer **Aucun** dans Violence (catégorie pas applicable — c'est un outil, pas un contenu).

### A.6 Pricing & Availability
- [ ] **Price** : `Free` (l'app est gratuite, les packs sont des achats in-flow via Stripe)
- [ ] **Availability** : Suisse, France, Belgique, Luxembourg (V1) + autres pays UE en V1.1
- [ ] **Pre-order** : non

### A.7 App Review Information
- [ ] **Sign-in required** : Non (la plupart du flow se teste sans login)
- [ ] **Demo account** : créer `reviewer@boom.contact` avec 10 crédits offerts — cf. `app-review-instructions.md`
- [ ] **Contact info** : Olivier Neukomm · `contact@boom.contact`
- [ ] **Notes** : coller le contenu de `app-review-instructions.md`
- [ ] **Attachments** : screenshot du flow complet si Apple le demande

### A.8 Associated Domains & .well-known
- [ ] AASA live et **finalisée** (sans placeholder `TEAMID_TO_REPLACE`)
  - URL : https://www.boom.contact/.well-known/apple-app-site-association
  - Format JSON valide, Content-Type `application/json`, pas de redirection
- [ ] **Apple Team ID** réel inséré dans `client/public/.well-known/apple-app-site-association` (ligne `appID`)
- [ ] Capability **Associated Domains** activée dans le profil Apple Developer
- [ ] Capability **Sign in with Apple** : non requis V1

### A.9 TestFlight
- [ ] Build signé uploadé via Xcode (ou Transporter)
- [ ] Build traité par App Store Connect (15-60 min)
- [ ] Test interne (jusqu'à 100 testeurs) configuré
- [ ] Beta App Description renseignée
- [ ] Beta Test Information : email contact + URL feedback
- [ ] Compte reviewer testé en TestFlight avant submission

### A.10 Submission
- [ ] Build sélectionné depuis « Versions »
- [ ] Toutes les questions de conformité répondues (export compliance, content rights, advertising)
- [ ] **Submit for Review**

---

## B. Google Play Console

### B.1 Configuration générale
- [ ] **Application ID** : `contact.boom.app` (vérifier dans `android/app/build.gradle`)
- [ ] **versionCode** : `1`
- [ ] **versionName** : `1.0.0`
- [ ] **Internal package name** : aligné avec applicationId
- [ ] **Default language** : `fr-CH` (puis ajouter EN)

### B.2 Main store listing (par langue)
- [ ] **App name** (30 c.) — FR : « boom.contact — Constat » · EN : « boom.contact — Accident »
- [ ] **Short description** (80 c.) — cf. `store-listing-copy-fr-en.md`
- [ ] **Full description** (4000 c.) — cf. `store-listing-copy-fr-en.md`
- [ ] **App icon** 512×512 PNG (existant, généré depuis logo `boom.contact`)
- [ ] **Feature graphic** 1024×500 PNG — peut être dérivé de `iphone67/store.png` après recadrage
- [ ] **Phone screenshots** 1080×1920 × 7 — depuis `artifacts/store-screenshots/android-phone/` après habillage
- [ ] **Tablet 7" screenshots** : non requis V1
- [ ] **Tablet 10" screenshots** : non requis V1
- [ ] **Promo video** : optionnel V1

### B.3 Store settings
- [ ] **Category** : `AUTO_AND_VEHICLES`
- [ ] **Tags** : `road accident`, `insurance`, `driver`, `documentation`, `QR`, `signature`, `PDF`
- [ ] **Contact details** :
  - Email : `contact@boom.contact`
  - Website : `https://www.boom.contact/`
- [ ] **Privacy policy** : `https://www.boom.contact/privacy`
- [ ] **External marketing** : non (pas d'opt-in marketing requis V1)

### B.4 Data Safety
Cf. `docs/google-data-safety-console-checklist.md` (Sprint 3 draft).
- [ ] **Data collection** : déclarer les catégories (Personal info, Photos, Audio, App activity, Device IDs)
- [ ] **Data sharing** : Stripe (paiement) · Resend (email) — déclarés
- [ ] **Encryption in transit** : Oui (TLS)
- [ ] **Data deletion** : possible sur demande (`contact@boom.contact`)
- [ ] **Tracking** : **Non**
- [ ] Soumis et validé

### B.5 Content rating
- [ ] IARC questionnaire complété
- [ ] Rating attendu : **Everyone / Tout public**

### B.6 Target audience
- [ ] **Age groups** : 18+ (conducteurs)
- [ ] **Designed for Families** : Non
- [ ] **Ads** : Non (pas de pubs)

### B.7 App content
- [ ] **Privacy policy** : URL renseignée (live)
- [ ] **Ads** : Non
- [ ] **App access** : section « Comment tester l'app sans accident réel » — copier depuis `app-review-instructions.md`
- [ ] **News app** : Non
- [ ] **Government app** : Non
- [ ] **Health features** : Non (à confirmer — données « blessures » potentielles → on déclare non car non-médical)

### B.8 App Links & .well-known
- [ ] `assetlinks.json` live et **finalisé** (sans placeholder `SHA256_CERT_FINGERPRINT_TO_REPLACE`)
  - URL : https://www.boom.contact/.well-known/assetlinks.json
  - SHA-256 fingerprint du certificat de signature Play App Signing
- [ ] **Récupérer le SHA-256** : Play Console → App integrity → App signing → « App signing key certificate » → SHA-256
- [ ] AndroidManifest `<intent-filter android:autoVerify="true">` configuré (Sprint 2)

### B.9 Internal Testing
- [ ] AAB signé uploadé
- [ ] Track « Internal testing » créé
- [ ] Testeurs ajoutés (par email)
- [ ] Release notes FR + EN
- [ ] Compte reviewer testé en interne

### B.10 Submission Production
- [ ] Tous les checkpoints ci-dessus complétés
- [ ] Countries selectionnés (CH, FR, BE, LU pour V1)
- [ ] **Rolled out to production** ou **Submitted for review**

---

## C. Communs (avant submit côté CODE)

- [ ] `npm run typecheck` → 0 erreur
- [ ] `npm run build` → OK
- [ ] `npm run test` → 45/45
- [ ] `npm run capture:screenshots` → 46/46 captures OK
- [ ] grep claims → 0 dans surfaces vivantes
- [ ] AASA réponse 200 / application/json / Team ID réel
- [ ] assetlinks.json réponse 200 / application/json / SHA-256 réel
- [ ] /privacy 200 · /cgu 200
- [ ] Stripe LIVE keys actives, webhook live testé
- [ ] Resend production OK (email contact@boom.contact)
- [ ] Sentry + PostHog branchés sur prod
- [ ] Backup PostgreSQL Railway configuré (snapshot quotidien)
- [ ] Plan de rollback prêt (commit hash de fallback)

---

## D. Statut Sprint 8

| Item | Statut |
|---|---|
| 46/46 screenshots générés multi-viewport | ✅ |
| Sélection finale documentée | ✅ |
| Copy FR + EN screenshots | ✅ |
| Copy FR + EN listing stores | ✅ |
| Review instructions Apple/Google | ✅ |
| Checklist upload complète | ✅ |
| Apple Team ID inséré dans AASA | ⏳ **à faire** (placeholder restant) |
| Android SHA-256 inséré dans assetlinks | ⏳ **à faire** (placeholder restant) |
| Builds iOS/Android signés | ⏳ **à faire** |
| Upload TestFlight + Internal Testing | ⏳ **à faire** |
| Habillage marketing PNG (device frame) | ⏳ post-traitement manuel |
| Validation juridique copy | ⏳ **à faire** (juriste) |
| Compte reviewer provisionné | ⏳ **à faire** (admin DB) |

**NON déclaré public-ready.** Tous les ⏳ sont des actions externes / décisions humaines à valider.
