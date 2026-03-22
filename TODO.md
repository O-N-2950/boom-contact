# boom.contact — TODO.md
> Mise à jour : 22 Mars 2026 — Fin Session 10

---

## ✅ FAIT — Sessions 1-4 (Infrastructure + Core)

- [x] Build Railway SUCCESS
- [x] Service web doublon supprimé
- [x] tRPC v11 mutations corrigées
- [x] CORS production configuré
- [x] PostgreSQL + Drizzle ORM
- [x] Flow constat complet A+B (SCAN→LIEU→PHOTOS→QR→INFOS→CROQUIS→CHOC→SIGN)
- [x] OCR Claude Vision — permis CH/FR/DE/GB + carte verte
- [x] Stripe live CHF+EUR — 3 packages (1/3/10 constats)
- [x] Webhook Stripe vérifié
- [x] PDF multilingue pdf-lib (12 langues)
- [x] Email Resend — DKIM actif, domaine boom.contact vérifié
- [x] Socket.io temps réel A↔B
- [x] PWA offline-first (Service Worker + IndexedDB)
- [x] i18n FR/DE/IT/EN

---

## ✅ FAIT — Sessions 5-7 (Qualité + i18n)

- [x] OCR mondial IMIC — 50 langues, prompt universel
- [x] Redirection apex → www
- [x] PDF multilingue 12 langues (FR/DE/IT/EN/ES/PT/NL/PL/RO/CS/SK/HR)
- [x] PoliceFlow DB tables (police_stations, police_users)
- [x] JWT police 8h — auth séparée des conducteurs
- [x] i18n FR/DE/IT/EN complet, deploy SUCCESS

---

## ✅ FAIT — Sessions 8-9 (Features avancées)

- [x] Géolocalisation IP → langue (180+ pays, cascade 4 niveaux)
- [x] Scanner multi-documents (jusqu'à 4 photos simultanées, merge résultats)
- [x] Navigation retour entre étapes (bouton ← Retour)
- [x] Véhicule pré-sélectionné depuis OCR (type auto-détecté)
- [x] Driver B débloqué — pré-rempli depuis données A
- [x] Croquis — 6 templates + description textuelle + fix iOS
- [x] Transcription vocale réelle — Whisper-1, 99 langues, max 3 min
- [x] Flow vocal → IA → questions → croquis automatique
- [x] Moteur dessin professionnel (sketch-engine.ts) — silhouettes + couleurs OCR
- [x] Détection multi-véhicules (2/3/4 véhicules)
- [x] Reordering flow : VOCAL avant QR, CROQUIS après QR
- [x] allVehicles state — enrichi au fur et à mesure

---

## ✅ FAIT — Session 10 (Carte + PDF + Audit)

- [x] MapVehiclePlacer — conducteur place son véhicule sur carte réelle
- [x] Plan OSM par défaut (pas de voitures fantômes) + toggle satellite ESRI
- [x] Géocodage Nominatim — fallback si lat/lng absent
- [x] Mode piéton/solo/objet — bypass QR sans 2e conducteur
- [x] Boutons Piéton/Enfant, Objet/Animal, Seul dans QRSession
- [x] Image carte JPEG envoyée au serveur (updateAccidentMutation)
- [x] PDF auto-detect JPEG vs PNG (fix crash embedPng sur JPEG)
- [x] **BUG FIX CRITIQUE** : bothSigned → status 'completed' — presentParticipants élargi
- [x] Audit A→Z complet — 11/14 routes OK (3 bugs trouvés et corrigés)

---

## ✅ FAIT — Session 11 (Tests E2E + WinWin)

- [x] Tests E2E 8 pays — CH/FR/DE/BE/LU/IT/GB/ES — 80/80 étapes PASS ✅
- [x] 5 Edge cases PASS (session inexistante, PDF sans sig, WinWin clés, packages)
- [x] Section partenariat WinWin sur LandingPage (home boom.contact) ✅
- [x] BUG FIX : URL WinWin /api/trpc → /trpc (commit 1050838) ✅
- [x] Intégration WinWin validée bout-en-bout : clé valide → session pré-chargée prefilled=true ✅

---

## 🔴 PRIORITÉ 1 — PoliceFlow (pilote Jura)

- [ ] `police.boom.contact` — subdomain Railway + routing
- [ ] `PoliceFlow.tsx` — vue session + annotations agent
  - [ ] Section 1 : Résumé incident (lieu, date, heure, blessés)
  - [ ] Section 2 : Conducteurs A & B (OCR + divergences)
  - [ ] Section 3 : Médias (galerie 5 catégories + croquis)
  - [ ] Section 4 : Annotations agent (infractions, mesures, témoins)
- [ ] PDF "Rapport d'intervention" modulaire CH (2 pages)
- [ ] Auth police — login + JWT 8h
- [ ] Audit trail consultations agents (RGPD)
- [ ] Séparation droits par juridiction/poste
- [ ] Script onboarding Canton Jura (créer station + agent en DB)

---

## 🔴 PRIORITÉ 2 — Tests terrain complets

- [x] Tests 8 pays E2E avec PDF — 8/8 PASS, 80/80 étapes, 37.7s ✅ (22 Mars 2026)
- [ ] Flow complet A+B sur 2 iPhones réels
- [ ] Test Stripe paiement CHF réel
- [ ] Test vocal → IA → questions → croquis en conditions réelles
- [ ] Vérifier questions IA ciblées (pas génériques)
- [ ] Vérifier parking_reverse correctement détecté

---

## 🟠 PRIORITÉ 3 — Qualité produit

- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Champs CEA manquants : date validité assurance, catégorie permis, date naissance
- [ ] Mode Témoin officiel (3e QR dans ConstatFlow)
- [ ] PDF conducteur B avec sa propre déclaration vocale
- [ ] Transcription vocale dans PDF (section 14 observations)
- [ ] Croquis IA dans PDF (remplace croquis manuel)
- [ ] 50 silhouettes véhicules niveau 2 (hatchback, SUV small/large, pick-up...)
- [ ] Cron nettoyage sessions > 7 jours
- [ ] Dark mode (prefers-color-scheme)

---

## 🟡 PRIORITÉ 4 — Scaling / B2G Europe

- [ ] Templates PDF rapport police par pays : FR (LRPPN), BE, LU
- [ ] i18n PoliceFlow DE/FR/IT/EN
- [ ] API assureurs : webhook export structuré sinistre
- [ ] Migration Infomaniak CH (déclenchée par premier contrat cantonal)
- [ ] Mode Témoin officiel
- [ ] Intégration assureurs CH : AXA, Baloise, Helvetia, Mobilière
- [ ] Google Maps Static API — créer nouvelle clé non expirée
- [ ] Multi-tenant par canton/pays
