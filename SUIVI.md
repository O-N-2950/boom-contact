# boom.contact — SUIVI.md
> Journal de développement par session — mis à jour à chaque fin de session

---

## Session 1 — Infrastructure & Build
**Date** : Mars 2026
**Commit final** : initial build

### Problèmes résolus
- Build Railway cassé → fix tsconfig + esbuild
- Service web doublon → projet propre boom-contact + PostgreSQL
- tRPC v11 mutations — syntaxe corrigée
- CORS production — origines explicites

### Livré
- App déployée et accessible sur Railway
- Variables d'environnement configurées
- Logs visibles dans Railway dashboard

---

## Session 2 — Paiement & RGPD
**Date** : Mars 2026

### Livré
- Stripe live intégré (même compte PEP's V2, metadata boom.contact)
- Webhook Stripe dédié we_1TDJLbGpzOqyzNB7UBSnffLM
- 3 packages tarifaires : 1/3/10 constats à CHF 4.90/12.90/34.90
- CGUModal RGPD — case obligatoire CGU + case optionnelle marketing
- Tables users/payments/credit_txns en DB
- DNS boom.contact : A, CNAME, SPF, DMARC, MX Infomaniak

---

## Session 3 — Qualité & Véhicules
**Date** : Mars 2026

### Problèmes résolus
- Crash QRSession quand sessionId null → guard `enabled: !!sessionId`
- PDF WinAnsi → remplacement ①②③✓ par ASCII

### Livré
- 17 types véhicules (trottinette, tram, train, engin chantier...)
- LocationStep — sélecteur groupé + blessures
- 8 silhouettes SVG (voiture, moto, scooter, vélo, camion, bus, tram, piéton)
- Mapper 700+ modèles → carrosserie + couleur (30 langues)
- VehicleDiagram — silhouette adaptée + couleur OCR réelle
- ColorPicker — 28 swatches visuels
- SignaturePad DPR Retina
- ErrorBoundary — page erreur propre
- tRPC client — zéro fetch brut dans composants
- pitch.html — page présentation

---

## Session 4 — Photos de scène & Architecture
**Date** : 21 Mars 2026
**Commits** : 8584bc0 → f005e6e → 6e17856 → 2d6f3cb

### Décisions importantes
- **Module Police** — outil métier officiel, jamais notification automatique
- **Multi-véhicules** — game changer, limité à 5 (vs 2 papier CEA)
- **Session 24h** — police peut intervenir longtemps après l'accident
- **Logo officiel** intégré (voitures bleue+orange + explosion BOOM)

### Livré
- PhotoCapture — 5 catégories, compression 1024px, légendes, preview, max 5 photos
- PhotoCapture intégré ConstatFlow + JoinSession
- LocationStep câblé dans ConstatFlow (manquait dans le JSX)
- PricingPage + CGUModal — migration fetch → tRPC ✅
- Email expéditeur corrigé contact@boom.contact
- DKIM Resend confirmé actif ✅
- Logo réel partout (LandingPage, flows, pitch.html)
- Session TTL 24h
- QR persistant écran Done (police peut scanner)
- Numéros urgences géolocalisés 35 pays (117/144 CH, 17/15 FR, 999 UK, 911 US...)
- pitch.html enrichi — sections Police B2B + Multi-véhicules

---

## Session 5 — Croquis, Multi-véhicules, PDF complet
**Date** : 21 Mars 2026
**Commits** : e4f5c14 → 49cd1d2 → eca6f10 → 57ce33a → 7ab8652

### Décisions importantes
- **Architecture multi-véhicules** : ParticipantRole A|B|C|D|E dans shared/types
- **Flow Police** : QR persistant + rejoindre session via URL ?role=
- **signSession** : "allSigned" = tous participants présents ont signé (N véhicules)

### Livré

**Croquis section 13**
- AccidentSketch — canvas libre : crayon, tampon A/B (silhouettes voiture), flèche, route double ligne, texte, gomme, 6 couleurs, 3 épaisseurs
- Intégré ConstatFlow + JoinSession entre form et diagram
- Persisté localStorage + DB via updateAccident

**Champs CEA complets (ConstatForm section Complément)**
- Date/heure accident éditable
- Dégâts apparents texte libre (section 11)
- Dégâts matériels à des tiers (oui/non)
- Témoins texte libre
- Observations libres conducteur A/B (section 14)
- Preneur d'assurance différent du conducteur

**PDF enrichi**
- Page dédiée croquis (PNG embarqué)
- Page photos de scène (grille 2 colonnes, catégories, légendes)
- Section témoins
- Section dégâts tiers

**Multi-véhicules**
- QRSession — sélecteur 2→5, QR coloré par rôle (B orange/C vert/D violet/E ambre)
- JoinSession — lit ?role=B/C/D/E dans URL
- Toutes mutations sign/update/send — rôles A-E
- signSession N-véhicules — allSigned quand tous présents ont signé

**Sécurité & qualité**
- Rate limiting : session.create(5/min) + session.join(10/min) + payment(3/min) + OCR(10/min)
- accidentData + photos poussés en DB dès création session
- Validation email regex renforcée dans CGUModal
- PWA icons 192/512 depuis logo réel
- index.html — SEO, Open Graph, Twitter Card, fonts préchargées
- LandingPage — 9 features (photos, croquis, multi-véhicules, police, urgences)

---

## Session 6 — PWA Offline + Police B2B + Carte verte
**Date** : 21 Mars 2026
**Commits** : 459efc5 → 1f8c597

### Décisions importantes
- **Suppression CEA** — toutes références "CEA / conforme CEA" retirées du frontend : boom.contact est supérieur au formulaire papier, pas une copie
- **Module Police isolé** — couche séparée (police.*), ne touche pas au flow conducteur
- **PWA offline** — Service Worker cache-first / Background Sync / OfflineBanner

### Livré

**PWA Offline-first**
- `client/public/sw.js` — cache-first assets, network-first API, SPA fallback 503
- Background Sync (`sync-session`) pour remonter sessions sauvegardées localement
- Push Notifications préparé (pour Module Police futur)
- `client/src/hooks/useOffline.ts` — détecte offline, expose `saveOffline()` IndexedDB
- `OfflineBanner.tsx` — banner orange fixe quand hors ligne, compte sessions en attente
- `main.tsx` — registration SW déjà présent depuis Session 5

**Carte verte optionnelle améliorée**
- `OCRScanner.tsx` — saisie inline société + N° contrat quand carte verte absente
- Données injectées dans `result.greenCard.insurance` avant `onComplete`
- Fini le message passif "pensez à renseigner" — action directe dans le flow

**Module Police B2B — base complète**
- Migration DB : tables `police_stations` + `police_users` (auto au démarrage)
- `police.service.ts` : `loginPoliceUser` (JWT 8h), `verifyPoliceToken`, `getPoliceDashboard` (sessions actives 24h + stats)
- tRPC `police.login` / `police.dashboard` / `police.joinSession`
- `PoliceLogin.tsx` — login email+password, design dark cohérent
- `PoliceDashboard.tsx` — stats 3 cartes, liste sessions triées, search, refresh 30s, accès via `?police=true`
- `App.tsx` — route police, token JWT persisté localStorage 8h

**Wording**
- `LandingPage.tsx` : "PDF complet CEA" → "PDF certifié 150+ pays", "Section 13 CEA" → "Croquis libre"

---

## Session 7 — Prévue

### Priorités dans l'ordre
1. **Tests réels** — 2 téléphones iOS + Android, PDF + email, Stripe, multi-véhicules
2. **PoliceFlow.tsx** — vue détaillée session conducteur + annotations agent + PDF rapport
3. **i18n** — FR/DE/IT/EN (i18next, détection auto, RTL arabe/hébreu)
4. **Script onboarding pilote** — créer station Jura + agent test
5. **Score cohérence IA** — détection contradictions A vs B avant signature

---

## État production actuel

| Élément | Statut |
|---|---|
| URL prod | https://boom-contact-production.up.railway.app ✅ |
| URL custom | https://www.boom.contact ✅ |
| Health check | /health → ok ✅ |
| Dernier commit | 1f8c597 |
| DKIM email | ✅ actif et propagé |
| Stripe live | ✅ configuré |
| Rate limiting | ✅ 4 routes |
| Multi-véhicules | ✅ jusqu'à 5 |
| Session durée | ✅ 24h |
| PDF complet | ✅ croquis + photos + 14 sections CEA |
| PWA installable | ✅ manifest + icons |
| PWA Service Worker | ✅ offline-first |
| Module Police | ✅ login + dashboard (base) |
| SEO | ✅ Open Graph + Twitter Card |
