# Checklist Android / Google Internal Testing — boom.contact

> Build Android signé (AAB) pour le canal **Internal Testing** de Google Play, puis publication interne.
> Stack : React + Vite embarqué dans une WebView **Capacitor**.
> `appId` (package) = `contact.boom.app` · `appName` = `boom.contact`.

⚠️ **Même spécificité qu'iOS** : pas de plugin natif Camera/Geo/Micro — l'app passe par les **web APIs du WebView** (`getUserMedia`, `navigator.geolocation`, `<input type="file" capture>`). Les permissions doivent malgré tout être déclarées dans `AndroidManifest.xml`, sinon le WebView les refuse. Noter aussi `captureInput: true` et `allowMixedContent: false` (déjà configurés).

---

## 0. Prérequis compte / outillage

- [ ] Compte **Google Play Console** (frais unique 25 USD), application créée.
- [ ] **Android Studio** + JDK à jour.
- [ ] ⚠️ Aligner `@capacitor/cli` (`7.6.2`) sur `8.3.1` avant `npx cap sync android`.
- [ ] **Clé de signature** générée et **sauvegardée hors repo** (jamais commitée) — ou activer **Play App Signing** (recommandé).

## 1. Identité de l'app

- [ ] `applicationId` = `contact.boom.app` (cohérent `build.gradle` ↔ Play Console ↔ `capacitor.config.ts`).
- [ ] **versionCode** : entier incrémenté à chaque upload (1, 2, 3…).
- [ ] **versionName** : version publique (ex. `1.0.0`, à relever depuis `0.1.0`).

## 2. Assets visuels

- [ ] Icône adaptative (foreground + background `#0a0a14`), jeu de densités complet.
- [ ] Splash screen cohérent (`backgroundColor #0a0a14`, configuré).
- [ ] Feature graphic 1024×500 + captures d'écran (pour la fiche, même en interne).

## 3. Permissions — `AndroidManifest.xml` (CRITIQUE)

- [ ] `android.permission.CAMERA` — scan documents + photos dégâts/blessures.
- [ ] `android.permission.RECORD_AUDIO` — déclaration vocale (transcription Whisper).
- [ ] `android.permission.ACCESS_FINE_LOCATION` (+ `ACCESS_COARSE_LOCATION`) — lieu de l'accident.
- [ ] Médias / images : sur **Android 13+**, `READ_MEDIA_IMAGES` ; éviter `READ_EXTERNAL_STORAGE` legacy si possible.
- [ ] `android.permission.INTERNET` (par défaut Capacitor).
- [ ] `android.permission.ACCESS_NETWORK_STATE` — détection offline/reconnect.
- [ ] **Demandes runtime** : vérifier que le WebView déclenche bien les pop-ups de permission Android (souvent nécessite un `WebChromeClient.onPermissionRequest` côté natif — à valider sur device).
- [ ] Retirer toute permission **non utilisée** (Google Play audite ; une permission injustifiée peut bloquer la publication).

## 4. Data Safety (Play Console)

À remplir en cohérence avec `legal/GOOGLE_DATA_SAFETY.md` :

- [ ] Données collectées : email, localisation (précise), photos, audio (converti en texte), signature, identifiants, données d'usage (analytics PostHog/Sentry).
- [ ] **Chiffrement en transit** : oui.
- [ ] **Suppression possible** : oui (fonction suppression de compte).
- [ ] **Pas de partage à des fins publicitaires** ; sous-traitants listés (cf. `legal/DPA_SUBPROCESSORS.md`).
- [ ] **URL politique de confidentialité** publique renseignée (`/privacy`).

## 5. Build & upload

- [ ] `npm run build` → `npx cap sync android`.
- [ ] `npx cap open android` (Android Studio).
- [ ] **Build > Generate Signed Bundle / APK > Android App Bundle (.aab)**, signé.
- [ ] Play Console → canal **Internal testing** → créer une release → uploader l'AAB.
- [ ] Ajouter les **testeurs internes** (liste d'emails) et partager le lien d'opt-in.

## 6. Tests sur appareil Android réel

- [ ] Installer via le lien Internal testing sur un Android physique (récent + milieu de gamme si possible).
- [ ] **Permissions** : caméra / micro / localisation → pop-up présent, refus géré (fallback saisie/texte, pas de crash).
- [ ] **Flow A complet** (intro → … → done).
- [ ] **QR multi-appareils** : 2e device rejoint (B), puis C/D/E.
- [ ] **Stripe** : paiement test → **retour dans l'app** (point de risque #1).
- [ ] **PDF / email** générés et reçus (A + invités).
- [ ] **Offline / reconnect** : couper data/wifi → reprise localStorage + resynchro Socket.io.
- [ ] **Bouton retour Android (back système)** : ne doit pas sortir de l'app au milieu du flow ni casser l'état.

## 7. Observabilité

- [ ] **Sentry** release Android + sourcemaps ; crash test vérifié.
- [ ] **PostHog** événements reçus, sans donnée sensible.
- [ ] **Pre-launch report** Google Play (robot test multi-appareils) analysé : crashs, accessibilité, permissions.

## 8. Points de risque Android spécifiques

- [ ] **Permissions WebView** : `onPermissionRequest` doit accorder `RESOURCE_VIDEO_CAPTURE` / `RESOURCE_AUDIO_CAPTURE` au WebView, sinon `getUserMedia` échoue silencieusement. **À tester explicitement.**
- [ ] **Retour app après Stripe** : Custom Tab / navigateur → retour sur `done` via le schéma/redirect. Critère NO-GO.
- [ ] **allowMixedContent: false** : confirmer qu'aucune ressource HTTP n'est chargée (sinon blocage).
- [ ] Cibler un **targetSdk** récent (exigence Play en vigueur l'année de soumission).

## 9. Checklist publication interne → fermée/ouverte

- [ ] Aucun claim risqué visible (validé : balayage = 0).
- [ ] Data Safety complet et exact.
- [ ] Politique de confidentialité publique en ligne.
- [ ] Compte démo / notes expliquant le flow QR 2 appareils pour les reviewers.
- [ ] Déclaration des permissions sensibles justifiée (caméra, micro, localisation, audio).
- [ ] crash-free rate acceptable observé en Internal testing avant d'élargir.

---
*Document de travail. Build natif + tests device = hors périmètre de l'environnement actuel.*
