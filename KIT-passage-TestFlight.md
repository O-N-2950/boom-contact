# boom.contact — KIT DE PASSAGE TestFlight / Test interne Google

> Objet : tout ce qui doit être fait **hors sandbox** (Mac+Xcode, Play
> Console, juriste) pour passer en pré-release. Basé sur le code réel
> au commit `b8e963a`. Chaque point est exécutable et vérifiable.
>
> Légende : ☐ à faire · ⚠️ point d'attention détecté dans le code

---

## PARTIE 1 — Pré-vol : vérifications avant de builder

### 1.1 Backend prod (Railway) — variables d'environnement
Vérifier que TOUTES sont définies sur le service Railway (sinon le serveur
refuse de démarrer ou des fonctions tombent) :

- ☐ `DATABASE_URL`, `JWT_SECRET` (≥16 car., **ne jamais changer** sinon
  tous les tokens C/D/E dérivés deviennent invalides), `ADMIN_PASSWORD`
- ☐ `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- ☐ `RESEND_API_KEY`, `ANTHROPIC_API_KEY`
- ☐ `CLIENT_URL` = `https://www.boom.contact`, `NODE_ENV=production`
- ☐ `SOCIAL_SECRET` (route /social/auto-publish)
- ☐ `GOOGLE_REVIEW_URL` (optionnel — si absent, bloc avis Google masqué :
  comportement voulu)

### 1.2 Connexion app native → backend (bloqueur B1)
- ☐ Confirmer `client/src/apiBase.ts` → `NATIVE_API_ORIGIN =
  https://www.boom.contact` (OK au commit actuel)
- ☐ Confirmer CORS serveur autorise `capacitor://localhost` et
  `https://localhost` (OK — vérifié live en prod)
- ☐ Build front à jour embarqué : `npm run build` puis
  `npx cap copy && npx cap sync` AVANT chaque build natif

### 1.3 ⚠️ Deep links / retour Stripe — GAP DÉTECTÉ
Le code n'a **pas** de universal links iOS / app links Android vérifiés
(pas de `applinks:` entitlement iOS, intent-filter Android minimal). Sans
ça, après paiement Stripe dans Safari/Chrome, l'utilisateur **ne revient
pas automatiquement dans l'app**.

- ☐ iOS : ajouter `com.apple.developer.associated-domains` =
  `applinks:www.boom.contact` dans `App.entitlements` + héberger
  `/.well-known/apple-app-site-association` (déjà servi par le serveur ? à
  vérifier) pointant `appID = <TEAMID>.contact.boom.app`
- ☐ Android : intent-filter avec `android:autoVerify="true"` sur
  `host=www.boom.contact` + héberger `/.well-known/assetlinks.json`
- ☐ Stripe : `success_url` / `cancel_url` doivent pointer vers une URL
  `https://www.boom.contact/...` couverte par les universal/app links
- ☐ Tester : payer → navigateur → **retour automatique dans l'app** avec
  état conservé (sessionId). Tester aussi paiement annulé.

> Si le retour app n'est pas prêt : fallback acceptable pour TestFlight =
> l'utilisateur rouvre l'app manuellement et le crédit est bien appliqué
> (webhook serveur idempotent — vérifié). Mais à régler avant store public.

---

## PARTIE 2 — Build iOS + TestFlight

### 2.1 Signature
- ☐ Compte Apple Developer actif (99 $/an)
- ☐ Xcode : ouvrir `ios/App/App.xcworkspace`
- ☐ Bundle ID = `contact.boom.app` (= `appId` Capacitor — OK)
- ☐ Signing : Team + "Automatically manage signing", certificat
  Distribution + provisioning profile App Store
- ☐ Version (`CFBundleShortVersionString`) ex. `1.0.0` + Build
  (`CFBundleVersion`) incrémenté à chaque upload
- ☐ Aligner `VITE_RELEASE` / `VITE_APP_VERSION` au build front pour que
  Sentry mobile corresponde (le code lit déjà ces vars)

### 2.2 App Privacy (obligatoire — sera refusé sinon)
Déclarer dans App Store Connect les données réellement traitées :
- ☐ **Contact** : nom, email, téléphone, adresse — liées à l'utilisateur
- ☐ **Données sensibles** : photos, audio (voix→transcription), signature,
  localisation, données d'accident, données permis/assurance
- ☐ **Identifiants** : email (compte) ; paiements via Stripe (tiers)
- ☐ **Usage** : préciser traitement IA externe (OCR Anthropic, voix
  OpenAI) — données envoyées à des sous-traitants
- ☐ Suppression de compte : in-app (existe — `auth.deleteAccount`,
  supprime constats/PII + anonymise écritures financières). Donner le
  chemin exact dans le formulaire.

### 2.3 Permissions (déjà OK dans Info.plist — vérifier le wording)
- ✓ `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
  `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`
  présentes avec descriptions FR explicites (conformes)

### 2.4 Anti-rejet 4.2 (« web clip »)
- ✓ Bundle local (`webDir: dist/client`, pas de `server.url` distant) —
  conforme. Ne PAS ajouter de `server.url` pointant le web.

### 2.5 TestFlight
- ☐ Archive → Distribute App → App Store Connect → Upload
- ☐ TestFlight : test interne (jusqu'à 100 testeurs, pas de review Apple)
- ☐ Inviter les testeurs ; exécuter la PARTIE 4 sur appareils réels

---

## PARTIE 3 — Build Android + Test interne Google

- ☐ Compte Google Play Console (25 $ une fois)
- ☐ `android/` : générer un **keystore release** (à conserver
  précieusement — perte = impossible de mettre à jour l'app)
- ☐ `keystore.properties` + signing config release dans
  `android/app/build.gradle`
- ☐ `versionCode` (entier incrémenté) + `versionName`
- ☐ Build : `./gradlew bundleRelease` → `.aab` signé
- ☐ Play Console → Test interne → upload AAB → liste de testeurs
- ☐ **Data Safety form** (obligatoire) : mêmes données que App Privacy
  (audio, photos, localisation, contact, paiement, IA tierce, suppression)
- ☐ Déclarer permissions sensibles (RECORD_AUDIO, CAMERA, LOCATION) +
  justification d'usage

---

## PARTIE 4 — Scénarios E2E à exécuter sur APPAREILS RÉELS

> À faire sur iPhone réel **et** Android réel. Cocher chaque ligne.

### 4.1 Parcours standard A/B
- ☐ A crée une session, QR affiché
- ☐ B scanne le QR avec un **2e appareil** → rejoint
- ☐ A : OCR carte verte/permis, localisation GPS, photos, voix, formulaire,
  croquis, choc
- ☐ B : idem de son côté
- ☐ A signe, B signe → statut « completed »
- ☐ A reçoit le PDF par email, B reçoit le PDF par email
- ☐ Ouvrir les 2 PDF : données A correctes, données B correctes,
  signatures présentes, croquis affiché, photos présentes

### 4.2 Cas spéciaux (un test par cas)
- ☐ Accident solo (1 véhicule) → A signe seul → PDF reçu
- ☐ Partie B en fuite → constat unilatéral → PDF reçu
- ☐ Partie B refuse de signer → unilatéral → PDF reçu
- ☐ Piéton sans téléphone (rempli par A) → données piéton dans le PDF
- ☐ Vélo / trottinette → pas d'exigence de signature côté B
- ☐ Blessé → mention présente

### 4.3 Multi-véhicules (Voie B — le refactor à valider)
- ☐ **A/B/C** : C scanne SON QR (token individuel), remplit, signe
- ☐ **A/B/C/D**, puis **A/B/C/D/E**
- ☐ Vérifier : C ne modifie pas B, D ne modifie pas B, E ne modifie pas B
  (remplir B, puis C/D/E, recharger, contrôler que chaque colonne est
  intacte)
- ☐ C, D, E signent chacun
- ☐ PDF : page annexe contient C, D, E (véhicule, conducteur, assurance,
  circonstances, signature)
- ☐ Emails reçus par C, D, E (si email renseigné) — après signature ET
  après paiement (les 2 chemins)
- ☐ Croquis : A/B au centre + C/D/E représentés et étiquetés en périphérie

### 4.4 Mobile natif
- ☐ Micro : autorisé → enregistrement+transcription OK
- ☐ Micro : refusé → message clair, pas de crash
- ☐ Caméra : OCR document fonctionne (iOS + Android)
- ☐ Localisation : autorisée / refusée → pas de crash
- ☐ Paiement Stripe → retour dans l'app (cf. 1.3) → crédit appliqué
- ☐ App fermée pendant le paiement puis rouverte → état retrouvé
- ☐ Mode avion : remplir un constat → revenir online → données rejouées,
  aucune perte (signature/photo/voix)
- ☐ PDF : téléchargement + partage natif fonctionnent

### 4.5 Sécurité (rapide)
- ☐ Token invalide → accès refusé (401)
- ☐ tokenB utilisé pour rôle A → refusé
- ☐ token C ≠ token D ≠ token E (déjà prouvé en prod)
- ☐ Appel /trpc sans header `X-Requested-With` → bloqué (CSRF)
- ☐ Double webhook Stripe → 1 seul crédit (idempotence — déjà vérifié code)
- ☐ Double signature → pas de double envoi
- ☐ Suppression de compte → constats/PII supprimés, vérifier en base

---

## PARTIE 5 — À FAIRE VALIDER PAR UN JURISTE (avant store public)

Le code contient encore **2 affirmations juridiques fortes** dans le PDF.
Texte exact et emplacement (à soumettre tel quel au juriste) :

1. `server/src/services/pdf.service.ts:302`
   > « Document valable auprès des assurances — Convention Européenne 46 pays »
2. `server/src/services/pdf.service.ts:839`
   > « boom.contact - Déclaration unilatérale de sinistre - Document
   > légalement valable - 46 pays »

Questions précises pour le juriste :
- ☐ Peut-on écrire « légalement valable » / « valable auprès des
  assurances » sans qualification ? Dans quels pays ?
- ☐ La référence « Convention Européenne 46 pays » est-elle exacte et
  opposable ?
- ☐ Formulation de repli proposée (si non validé) :
  *« Dossier PDF structuré et horodaté cryptographiquement, à transmettre
  à votre assureur — compatible avec les informations d'un constat
  amiable »*

> Note : les claims équivalents dans les **emails / footer / shareText**
> ont déjà été retirés/reformulés (commit 7668002). Restent uniquement les
> 2 ci-dessus dans le PDF, volontairement non modifiés sans avis juridique.

---

## PARTIE 6 — Décision GO / NO-GO

| Étape | Statut | Bloque quoi |
|---|---|---|
| Code multi-véhicules A→E + sécurité + emails | ✅ fait, déployé, vérifié | — |
| Builds signés iOS/Android | ☐ à faire (Mac/Xcode/keystore) | TestFlight + store |
| E2E appareils réels (Partie 4) | ☐ à faire | store public |
| Universal/App links + retour Stripe (1.3) | ☐ à faire | store public (fallback OK TestFlight) |
| Validation juridique (Partie 5) | ☐ juriste | store public |

**Recommandation :** dès que les builds signés passent et que la Partie 4
est verte → **GO TestFlight / test interne Google**. **GO store public**
seulement après E2E complet + deep links + feu vert juridique.
