# Checklist iOS / TestFlight — boom.contact

> Préparation d'un build iOS signé pour TestFlight, puis revue App Store.
> Stack : React + Vite (build web embarqué) dans une WebView **Capacitor**.
> `appId` = `contact.boom.app` · `appName` = `boom.contact` · `webDir` = `dist/client`.

⚠️ **Spécificité majeure de ce projet** : aucun plugin natif Capacitor pour la caméra, le micro ou la géolocalisation n'est installé. L'app utilise les **web APIs du WebView** (`getUserMedia`, `navigator.geolocation`, `<input type="file" capture>`). Les chaînes d'autorisation `Info.plist` restent **obligatoires** : sans elles, iOS bloque l'accès dans le WebView (rejet ou crash silencieux).

---

## 0. Prérequis compte / outillage

- [ ] Compte **Apple Developer Program** actif (99 USD/an), rôle Admin ou App Manager.
- [ ] **Xcode** à jour (macOS requis) + ligne de commande `xcode-select --install`.
- [ ] Certificat de distribution + **provisioning profile** App Store (ou *Automatically manage signing*).
- [ ] App créée dans **App Store Connect** avec le bundle id `contact.boom.app`.
- [ ] ⚠️ **Aligner les versions Capacitor** : `@capacitor/cli` est en `7.6.2` alors que `core/ios/android` sont en `8.3.1`. Passer le CLI en `8.x` avant `npx cap sync` pour éviter les divergences de génération du projet natif.

## 1. Identité de l'app

- [ ] Bundle identifier : `contact.boom.app` (identique App Store Connect ↔ Xcode ↔ `capacitor.config.ts`).
- [ ] **Version (CFBundleShortVersionString)** : passer de `0.1.0` à une version publique cohérente (ex. `1.0.0`).
- [ ] **Build number (CFBundleVersion)** : incrémenté à chaque upload TestFlight (1, 2, 3…).
- [ ] Nom affiché : `boom.contact`.

## 2. Assets visuels

- [ ] **Icône** 1024×1024 sans transparence ni coins arrondis (App Store) + jeu complet via Xcode AppIcon.
- [ ] **Splash screen** cohérent avec `backgroundColor: #0a0a14` (déjà configuré dans `capacitor.config.ts`, `launchShowDuration: 2000`).
- [ ] StatusBar `style: DARK`, fond `#0a0a14` (configuré).
- [ ] Vérifier l'absence de barre blanche / flash clair au lancement (fond sombre partout).

## 3. Permissions — `Info.plist` (CRITIQUE)

Chaînes d'usage obligatoires (rédigées dans la langue de soumission, idéalement localisées) :

- [ ] `NSCameraUsageDescription` — ex. « boom.contact utilise l'appareil photo pour scanner vos documents (permis, carte verte) et photographier les dégâts. »
- [ ] `NSMicrophoneUsageDescription` — ex. « boom.contact utilise le micro pour transcrire votre déclaration vocale d'accident. »
- [ ] `NSLocationWhenInUseUsageDescription` — ex. « boom.contact utilise votre position pour localiser le lieu de l'accident. »
- [ ] `NSPhotoLibraryAddUsageDescription` — si l'app propose d'enregistrer le PDF/photos dans la galerie.
- [ ] **Cohérence avec les micro-copies du Sprint 1** : les textes `Info.plist` doivent dire la même chose que `legal.mic_notice`, l'écran intro et l'avertissement photos blessures (pas de promesse supplémentaire).

## 4. Privacy Manifest (`PrivacyInfo.xcprivacy`)

- [ ] Déclarer les **catégories de données collectées** (cohérentes avec `legal/APP_STORE_PRIVACY.md`) : données de contact (email), localisation, contenu utilisateur (photos, audio→texte, signature), identifiants, données d'usage (analytics).
- [ ] Déclarer les **Required Reason APIs** si utilisées par des libs (UserDefaults, file timestamp, etc.).
- [ ] **App Tracking Transparency** : l'app **ne fait pas de tracking publicitaire** → pas de prompt ATT requis. Vérifier que PostHog/Sentry sont configurés sans IDFA ni cross-app tracking.

## 5. Build & upload

- [ ] `npm run build` (génère `dist/client` embarqué — l'app fonctionne offline, exigence App Store 4.2 anti « web clip »).
- [ ] `npx cap sync ios`.
- [ ] Ouvrir dans Xcode : `npx cap open ios`.
- [ ] Sélectionner *Any iOS Device (arm64)* → **Product > Archive**.
- [ ] **Validate** puis **Distribute App > App Store Connect > Upload**.
- [ ] Attendre le traitement dans App Store Connect → activer le build pour **TestFlight interne**.

## 6. Tests sur iPhone réel (TestFlight)

- [ ] Installer via l'app TestFlight sur un iPhone physique.
- [ ] **Permissions** : déclencher caméra, micro, localisation → vérifier que la demande système apparaît, que **Refuser** n'entraîne pas de crash (fallback saisie manuelle / texte).
- [ ] **Flow A complet** : intro → OCR → location → photos → QR → vocal → formulaire → croquis → choc → signature → done.
- [ ] **QR multi-appareils** : un 2e téléphone (B) scanne le QR et rejoint la session ; tester aussi C/D/E.
- [ ] **Stripe** : paiement one-shot en mode test → **retour dans l'app** après checkout (point de risque #1 — voir §8).
- [ ] **PDF / email** : PDF généré + email reçu (via Resend) pour A et pour les invités.
- [ ] **Téléchargement / partage PDF** sur iOS (feuille de partage native).
- [ ] **Offline / reconnect** : couper le réseau pendant le flow, vérifier la reprise (localStorage) et la resynchro Socket.io.
- [ ] **Mode sombre** : l'app est en thème sombre fixe — vérifier la lisibilité.

## 7. Observabilité

- [ ] **Sentry** : créer une **release** correspondant au build, uploader les sourcemaps, vérifier qu'un crash test remonte.
- [ ] **PostHog** : vérifier la réception d'événements sans donnée personnelle sensible.
- [ ] Récupérer les **crash logs** TestFlight (Organizer Xcode) après les sessions de test.

## 8. Points de risque iOS spécifiques

- [ ] **Retour app après Stripe** : le checkout ouvre un navigateur ; le retour doit ramener dans l'app sur l'écran `done`. Vérifier le schéma de redirection (`boom.contact` / universal link / `PUBLIC_ORIGIN`). **À tester en priorité** — c'est un critère NO-GO.
- [ ] **getUserMedia dans WKWebView** : confirmer que caméra + micro fonctionnent dans le WebView Capacitor (et non seulement dans Safari).
- [ ] **Permissions refusées** : chaque refus doit dégrader proprement (intro le dit déjà : saisie manuelle possible).

## 9. Checklist App Store Review (avant soumission publique)

- [ ] Aucun claim risqué visible (validé : balayage code = 0 — voir `legal/LEGAL_CLAIMS_REVIEW.md`).
- [ ] App Privacy « Nutrition Label » rempli (cf. `legal/APP_STORE_PRIVACY.md`).
- [ ] URL politique de confidentialité publique accessible (`/privacy`).
- [ ] Compte de démonstration / notes de revue expliquant le flow QR à 2 appareils (les reviewers testent souvent seuls → fournir un mode démo ou des instructions claires).
- [ ] Pas de mention « beta », pas de lien mort, pas de fonctionnalité incomplète visible.
- [ ] Conformité 4.2 (app autonome, pas un simple wrapper de site) — le bundle embarqué + fonctionnement offline le couvrent.

---
*Document de travail — à compléter au fil des builds. Statut natif/runtime : hors périmètre de l'environnement actuel (nécessite macOS + Xcode + device réel).*
