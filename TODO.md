# boom.contact — TODO.md
> Mise à jour : 21 Mars 2026 — Fin Session 6

---

## ✅ FAIT — Session 1 (Build & Infrastructure)

- [x] Build Railway SUCCESS
- [x] Service web doublon supprimé — projet propre : boom-contact + PostgreSQL
- [x] tRPC v11 mutations corrigées
- [x] CORS production configuré
- [x] Variables Railway : DB, Claude, Stripe, Resend, Webhook
- [x] Logs Railway visibles (Morgan + logger.ts centralisé)

---

## ✅ FAIT — Session 2 (Paiement & RGPD)

- [x] Stripe live keys (récupérées depuis PEP's V2, même compte bancaire)
- [x] Webhook Stripe dédié boom.contact (we_1TDJLbGpzOqyzNB7UBSnffLM)
- [x] Métadonnées application:'boom.contact' sur toutes les transactions
- [x] 3 packages : 1/3/10 constats — CHF 4.90 / 12.90 / 34.90
- [x] Tables DB : users, payments, credit_txns
- [x] CGUModal — case obligatoire CGU + case optionnelle marketing PEP's Swiss SA
- [x] Consentements horodatés en base
- [x] DNS boom.contact : A → Railway, CNAME www, SPF, DMARC
- [x] MX + SPF Resend

---

## ✅ FAIT — Session 3 (Qualité & Véhicules)

- [x] Fix crash QRSession
- [x] Fix PDF WinAnsi — ASCII uniquement
- [x] Positionnement mondial — références formulaire papier supprimées
- [x] 17 circonstances reformulées
- [x] OCRScanner — capture=environment mobile
- [x] Compression image 1024px / q=85%
- [x] tRPC client propre — zéro fetch brut dans composants principaux
- [x] ErrorBoundary
- [x] SignaturePad DPR Retina
- [x] VehicleType exhaustif 17 types
- [x] LocationStep — 17 types groupés + blessures
- [x] 8 silhouettes SVG
- [x] Mapper 700+ modèles
- [x] VehicleDiagram silhouette + couleur réelle
- [x] ColorPicker 28 swatches
- [x] pitch.html — page présentation

---

## ✅ FAIT — Session 4 (Photos & Architecture)

- [x] PhotoCapture — 5 catégories, compression 1024px, légendes, preview, max 5 photos
- [x] PhotoCapture intégré ConstatFlow + JoinSession
- [x] LocationStep câblé dans ConstatFlow (manquait dans le JSX)
- [x] photos persistées localStorage + DB via updateAccident
- [x] updateAccident tRPC — schéma étendu avec photos[]
- [x] PricingPage — fetch() brut → mutation tRPC ✅
- [x] CGUModal — fetch() brut → mutation tRPC ✅
- [x] Email sender corrigé contact@boom.contact
- [x] DKIM Resend confirmé actif et propagé ✅
- [x] Module Police documenté dans TODO + CONTEXT
- [x] Logo réel intégré partout (LandingPage, flows, pitch.html)
- [x] Session TTL 2h → 24h (police peut intervenir tard)
- [x] QR persistant écran Done avec message police
- [x] Numéros urgences géolocalisés 35 pays

---

## ✅ FAIT — Session 5 (Croquis, Multi-véhicules, PDF complet)

- [x] AccidentSketch — canvas section 13 (crayon, tampons A/B, flèche, route, texte, gomme)
- [x] Croquis intégré ConstatFlow + JoinSession, persisté localStorage + DB
- [x] ConstatForm section Complément — date/heure éditable, témoins, dégâts tiers, observations (section 14), dégâts apparents (section 11), preneur assurance différent
- [x] PDF enrichi — page croquis PNG + page photos grille 2 colonnes + témoins + dégâts tiers
- [x] QRSession multi-véhicules — sélecteur 2→5, QR coloré par rôle
- [x] JoinSession — lit ?role=B/C/D/E dans URL, mutations dynamiques
- [x] ParticipantRole A|B|C|D|E dans shared/types
- [x] ConstatForm/VehicleDiagram/SignaturePad/PDFDownload — rôle étendu A-E
- [x] signSession — supporte N véhicules, allSigned = tous présents ont signé
- [x] router sign + sendToDriver — acceptent rôles A-E
- [x] Rate limiting étendu : session.create(5/min) + session.join(10/min) + payment(3/min)
- [x] accidentData poussé en DB dès création session
- [x] CGUModal — validation email regex renforcée
- [x] PWA icons 192/512 générés depuis vrai logo
- [x] index.html — SEO complet, Open Graph, Twitter Card, fonts préchargées
- [x] LandingPage — 9 features (photos, croquis, multi-véhicules, police, urgences)

---

## ✅ FAIT — Session 6

### PWA Offline-first ✅
- [x] Service Worker — cache-first assets, network-first API, SPA fallback offline
- [x] IndexedDB — stocker session offline (boom-offline store)
- [x] Background Sync quand connexion rétablie
- [x] Hook useOffline.ts + OfflineBanner composant (banner orange)
- [x] Préparé Push Notifications pour module Police

### Carte verte optionnelle ✅
- [x] Si carte verte absente → saisie inline société + N° contrat dans OCRScanner
- [x] Données injectées dans result avant onComplete (fini le "pensez à renseigner")

### Module Police B2B ✅ (base)
- [x] Tables police_stations + police_users (migration auto au démarrage)
- [x] police.service.ts — login JWT 8h, verifyToken, getPoliceDashboard
- [x] tRPC police.login / police.dashboard / police.joinSession
- [x] PoliceLogin.tsx — auth institutionnelle email+password
- [x] PoliceDashboard.tsx — sessions actives 24h, stats, search, refresh 30s
- [x] App.tsx route ?police=true, token persisté localStorage
- [x] Suppression toutes références "CEA" du frontend

## 🔴 PRIORITÉ — Session 7

---

## 🟠 PRIORITÉ 2 — Session 6-7

### Tests réels
- [ ] Flow complet A+B sur 2 téléphones iOS + Android
- [ ] Test PDF téléchargement + email reçu avec DKIM
- [ ] Test OCR : permis CH / carte grise FR / Green Card internationale
- [ ] Test Stripe paiement réel CHF
- [ ] Test multi-véhicules 3 téléphones

### Champs CEA restants
- [ ] Attestation assurance valable du/au (dates validité)
- [ ] Catégorie permis (A, B...) — vérifier dans DriverData
- [ ] Date de naissance conducteur — vérifier dans DriverData
- [ ] Preneur d'assurance adresse complète

---

## 🟠 PRIORITÉ 2 — Module Police B2B (suite)

- [x] Tables police_stations + police_users ✅
- [x] Auth JWT rôle "police" ✅
- [x] Dashboard sessions actives ✅
- [ ] PoliceFlow.tsx — vue détaillée session + annotations agent
- [ ] Enrichissement PV : infractions, mesures, témoins assermentés
- [ ] Template PDF "Rapport d'intervention" distinct du PDF conducteur
- [ ] SMS pré-envoi conducteur avant arrivée police
- [ ] Script onboarding canton pilote (Jura / Vaud) — créer station + agent

**Règle absolue** : police jamais notifiée automatiquement — uniquement sur action volontaire utilisateur.

---

## 🟡 PRIORITÉ 4 — i18n

- [ ] i18next + react-i18next
- [ ] FR / DE / IT / EN minimum (Suisse quadrilingue)
- [ ] Détection auto langue navigateur
- [ ] Bascule RTL/LTR pour arabe/hébreu

---

## 🟡 PRIORITÉ 5 — Qualité & Robustesse

### Silhouettes niveau 2
- [ ] 50 modèles courants avec silhouettes distinctes (hatchback_3/5, SUV small/large, pick-up...)

### Dark mode
- [ ] prefers-color-scheme — critique pour accidents nocturnes

### Rate limiting DB
- [ ] Nettoyer sessions expirées > 7 jours (cron job)

---

## 🟢 PRIORITÉ 6 — Features avancées

### Score cohérence IA
- [ ] Claude analyse contradictions entre déclarations A et B avant signature
- [ ] Ex : "A dit priorité droite, B ne coche pas cette circonstance"
- [ ] Alerte non bloquante — informatif uniquement

### Mode Témoin officiel
- [ ] 3ème QR pour témoin (différent du conducteur C/D/E)
- [ ] Photos + déclaration + signature témoin

### Intégration assureurs CH (B2B)
- [ ] AXA, Baloise, Helvetia, Mobilière — APIs partenaires
- [ ] Push déclaration directement dans leur système à la signature

### Géofencing juridiction
- [ ] Détection canton/département pour routing interne dashboards police
- [ ] Pas de notification automatique

---

## 🔵 PRIORITÉ 7 — Business & Go-Live

### Intégration NEO / WIN WIN
- [ ] API /api/accidents/stats pour neo-api-gateway
- [ ] Dashboard CEO : nb constats/jour, pays, langues
- [ ] Si client WIN WIN impliqué → alerte cockpit winwin.swiss

### App Store
- [ ] PWA installable (manifest + Service Worker)
- [ ] Publication App Store iOS + Google Play (Capacitor ou PWA)

---

## 📋 CHECKLIST AVANT LANCEMENT COMMERCIAL

- [x] Build Railway SUCCESS
- [x] Health check /health répond
- [x] ANTHROPIC_API_KEY valide
- [x] DATABASE_URL PostgreSQL connecté
- [x] Migrations DB au démarrage
- [x] Rate limiting actif (4 routes)
- [x] Logs Railway visibles
- [x] Stripe live configuré
- [x] 2 services propres (boom-contact + PostgreSQL)
- [x] DNS A + CNAME www configurés
- [x] DKIM Resend actif ✅
- [x] Email contact@boom.contact ✅
- [x] Logo officiel intégré ✅
- [x] PWA installable (manifest + icons)
- [x] SEO / Open Graph complet
- [ ] Test flow complet mobile iOS + Android
- [ ] Test PDF téléchargement + email reçu
- [ ] Test Stripe paiement réel
- [ ] Test multi-véhicules 3 téléphones
- [x] PWA Service Worker offline ✅
