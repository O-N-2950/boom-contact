# boom.contact — SUIVI.md
> Journal de développement par session — mis à jour à chaque fin de session

---

## Session 1 — Infrastructure & Build
**Date** : Mars 2026

### Problèmes résolus
- Build Railway cassé → fix tsconfig + esbuild
- Service web doublon → projet propre boom-contact + PostgreSQL
- tRPC v11 format mutations corrigé
- CORS production configuré

---

## Session 2 — Core Flow & OCR
**Date** : Mars 2026

### Accompli
- Flow constat A+B complet (SCAN→LIEU→PHOTOS→QR→INFOS→CROQUIS→CHOC→SIGN)
- OCR Claude Vision permis CH/FR/DE/GB + carte verte
- Socket.io temps réel A↔B
- Stripe live CHF+EUR — 3 packages

---

## Session 3 — PDF & Email
**Date** : Mars 2026

### Accompli
- PDF multilingue pdf-lib
- Email Resend DKIM actif
- PWA offline-first

---

## Session 4 — i18n & Qualité
**Date** : Mars 2026

### Accompli
- i18n FR/DE/IT/EN complet
- OCR mondial IMIC 50 langues
- Redirection apex → www

---

## Session 5-6 — PoliceFlow DB & Auth
**Date** : Mars 2026

### Accompli
- Tables police_stations, police_users
- JWT police 8h
- PDF multilingue 12 langues
- Deploy SUCCESS i18n

---

## Session 7 — Qualité prod
**Date** : 21 Mars 2026
**Commit final** : i18n complet, deploy SUCCESS Railway

### Accompli
- Fix iOS OCR/langue
- PDF multilingue 12 langues stable

---

## Session 8 — Features avancées
**Date** : 21-22 Mars 2026

### Accompli
- Géolocalisation IP → langue (180+ pays)
- Scanner multi-documents (4 photos, merge parallèle)
- Navigation retour entre étapes
- Véhicule pré-sélectionné depuis OCR
- Driver B débloqué + pré-rempli
- Croquis templates + fix iOS

---

## Session 9 — Vocal + IA + Carte
**Date** : 22 Mars 2026

### Accompli
- Whisper-1 transcription vocale (99 langues, $0.006/min)
- Flow vocal → Claude Sonnet → questions → croquis auto
- sketch-engine.ts : silhouettes réalistes + couleurs OCR
- Détection multi-véhicules (2/3/4)
- Reordering flow : VOCAL→QR→CROQUIS
- MapVehiclePlacer v1 (ESRI satellite, coordonnées test)

---

## Session 10 — Carte OSM + Audit + BugFix PDF
**Date** : 22 Mars 2026
**Dernier deploy** : SUCCESS 2026-03-22T19:46:32

### Problèmes identifiés et résolus

#### 🐛 BUG CRITIQUE — PDF bloqué "Both parties must sign"
**Cause** : `presentParticipants` vérifiait `driver.firstName` et `vehicle.licensePlate`, mais le client envoie `name` et `vehicle.plate`. Résultat : 0 participants "présents" → bothSigned=false → status reste 'signing' → PDF bloqué.
**Fix** : `session.service.ts` — condition élargie pour accepter tous les formats de champs.
**Commit** : `fix(session): broaden presentParticipants check`

#### 🐛 BUG — PDF crash JPEG
**Cause** : `pdf.service.ts` appelait `embedPng` sur des images JPEG (carte OSM).
**Fix** : auto-detect `isJpeg` via magic bytes `0xFF 0xD8`, puis `embedJpg` ou `embedPng`.
**Commit** : `fix(pdf): auto-detect JPEG/PNG`

#### 🐛 BUG — Carte centrée sur Delémont hardcodé
**Cause** : coordonnées fallback hardcodées 47.3602/7.3448 (Delémont) au lieu d'utiliser l'adresse.
**Fix** : géocodage Nominatim de l'adresse saisie + pass `accidentAddress/City/Country` depuis ConstatFlow.

#### 🐛 BUG — Voitures fantômes sur satellite
**Cause** : ESRI World Imagery (satellite) montre les vraies voitures au moment de la prise de vue.
**Fix** : Plan OSM par défaut (routes dessinées, aucune voiture) + toggle satellite optionnel.

#### 🐛 BUGS SYNTAXE — 4 FAILED en prod (QRSession.tsx)
**Cause** : apostrophes non échappées dans JSX + ternaire mal formé lors du patch piéton/solo.
**Leçon** : toujours valider la syntaxe TypeScript avant push. 4 commits de fix inutiles.

### Nouvelles fonctionnalités livrées

| Feature | Fichiers modifiés |
|---|---|
| MapVehiclePlacer v2 — Plan OSM + toggle satellite | `MapVehiclePlacer.tsx` |
| Géocodage Nominatim fallback | `MapVehiclePlacer.tsx` |
| Image carte envoyée au serveur pour PDF | `ConstatFlow.tsx` |
| Mode piéton/solo/objet — bypass QR | `QRSession.tsx` |
| Auto-detect JPEG/PNG dans PDF | `pdf.service.ts` |
| Fix bothSigned → completed | `session.service.ts` |

### Audit A→Z — Résultats

| Route | Status |
|---|---|
| session.create | ✅ |
| session.get | ✅ |
| session.updateAccident | ✅ |
| session.updateParticipant | ✅ |
| session.join | ✅ |
| session.sign A+B | ✅ |
| bothSigned → completed | ✅ CORRIGÉ |
| pdf.generate | ✅ CORRIGÉ |
| payment.packages | ✅ 3 packages |
| PWA Service Worker | ✅ |
| ocr.scan | ⚠️ format documentType à vérifier |

### Résultat deploy
- 4 FAILED (bugs syntaxe QRSession entre 18h37-18h41)
- SUCCESS stable depuis 19:46:32
- Logs Railway : `SESSION completed` confirmé → fix bothSigned opérationnel

---

## Session 11 — À faire
**Objectif** : Tests E2E 8 pays + PDF + début PoliceFlow

### Plan
1. Tests E2E 8 pays depuis session fraîche (sandbox connexion OK)
2. Vérifier PDFs générés dans tous les pays
3. Commencer PoliceFlow + police.boom.contact
