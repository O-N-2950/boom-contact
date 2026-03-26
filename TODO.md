# boom.contact — TODO.md
> Mise à jour : 26 Mars 2026 — Fin Session 14

---

## ✅ FAIT — Sessions 1-13 (voir SUIVI.md pour détails)

- [x] Infrastructure Railway + PostgreSQL + tRPC v11
- [x] Flow constat complet A+B (10 étapes)
- [x] OCR Claude Vision 50 langues
- [x] Stripe live CHF+EUR+GBP+AUD+USD+CAD+SGD+JPY — 3 packages
- [x] PDF multilingue 12 langues + carte OSM + Puppeteer
- [x] i18n FR/DE/IT/EN
- [x] MapVehiclePlacer obligatoire avant signature
- [x] Mode piéton/solo/objet
- [x] Transcription vocale Whisper-1
- [x] WinWin intégration partenaire CH
- [x] Auth Magic Links + mot de passe + JWT 30j
- [x] Garage véhicules CRUD + OCR
- [x] Admin Dashboard (stats, users, revenus, coûts IA)
- [x] Numéros urgence 60+ pays + AI fallback
- [x] Insurance lookup 100+ assureurs + AI fallback
- [x] PostConstatCTA — 3 modes conversion
- [x] Stripe international multi-devises + factures PDF
- [x] RGPD : Cookie banner + Privacy page + CGU 4 langues
- [x] Réseaux sociaux : Facebook ✅ TikTok ✅ Instagram ✅

---

## ✅ FAIT — Session 14 (26 Mars 2026)

### SEO critique
- [x] robots.txt — route Express AVANT express.static (corrige bug SPA)
- [x] sitemap.xml — multilingue hreflang FR/DE/IT/EN, route Express dédiée
- [x] LandingPage.tsx — fix syntax error TSX ligne 488 (ShareBoom orphan div)
- [x] Build SUCCESS vérifié — health + robots.txt + sitemap.xml testés en prod

### Générateur marketing automatique
- [x] `server/src/db/schema.ts` — table `social_posts` (platform, pillar, text, hashtags, staging, status, postedAt)
- [x] `server/src/services/social-generator.service.ts` — génération Claude Sonnet, CRUD posts
- [x] Routes tRPC `marketing.*` inlinées dans appRouter (posts/generate/approve/markPosted/archive)
- [x] Cron quotidien 7h — génère 4 posts/jour par rotation plateforme/pilier
- [x] Import schema corrigé — tables importées directement depuis `../db/schema.js`

### Kit contenu réseaux sociaux
- [x] 60 posts générés par Claude — 15 TikTok + 15 Instagram + 15 Facebook + 15 LinkedIn
- [x] 4 piliers équilibrés (A=douleur B=démo C=éducation D=preuve) — 3-4 posts par pilier par plateforme
- [x] Humanizer appliqué — ton direct, tutoiement, vrais chiffres, 0 bullet TikTok/IG
- [x] Outil HTML interactif — filtres plateforme + pilier + copie 1 clic + note mise en scène

---

## 🔴 SESSION 15 — PRIORITÉ HAUTE

### Seed posts en DB (5 min)
- [ ] Script one-shot : insérer les 60 posts Session 14 via `marketing.seed` tRPC
- [ ] Vérifier via `marketing.posts` que les 60 posts apparaissent en statut `pending`

### Dashboard marketing admin (UI)
- [ ] Onglet "Marketing" dans AdminDashboard.tsx
- [ ] Liste des posts pending avec aperçu texte + plateforme + pilier
- [ ] Boutons : ✅ Approuver / 📤 Marquer publié / 🗄 Archiver
- [ ] Filtre par plateforme et statut
- [ ] Bouton "Générer 4 nouveaux posts" (appel `marketing.generate`)
- [ ] Compteurs : pending / approved / posted cette semaine

### PoliceFlow (pilote Canton Jura) — 🔴 CRITIQUE
- [ ] police.boom.contact subdomain Railway
- [ ] PoliceFlow.tsx — 4 sections (résumé, conducteurs, médias, annotations)
- [ ] PDF rapport d'intervention CH modulaire
- [ ] Auth police login + JWT 8h
- [ ] Audit trail RGPD consultations agents

### Qualité produit
- [ ] Champs CEA manquants (dates validité assurance, permis, date naissance, adresse preneur)
- [ ] 50 silhouettes véhicules niveau 2 (hatchback, SUV small/large, pick-up...)
- [ ] Tests iOS + Android réels
- [ ] Dark mode (prefers-color-scheme)
- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Mode Témoin officiel (3ème QR dans ConstatFlow)

### LinkedIn
- [ ] Créer Page boom.contact séparée depuis ordi
- [ ] Lier avec PEP's Swiss SA comme organisation mère

---

## 📊 ÉTAT TECHNIQUE ACTUEL

| Composant | État |
|---|---|
| Frontend | React 18 + Vite + TypeScript + i18n FR/DE/IT/EN |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL — 10 tables (+ social_posts Session 14) |
| OCR | Claude Vision (Sonnet) — 50 langues |
| PDF | pdf-lib server-side + Puppeteer Chrome headless |
| Carte | OSM tiles server-side + GPS conducteur |
| Email | Resend — DKIM actif |
| Paiement | Stripe live 8 devises |
| Auth | JWT 30j + Magic Links + scrypt |
| Hébergement | Railway Europe West — SUCCESS |
| SEO | robots.txt ✅ sitemap.xml ✅ og:image ✅ |
| Réseaux sociaux | Facebook ✅ TikTok ✅ Instagram ✅ LinkedIn (partiel) |
| **Générateur marketing** | **Cron 7h ✅ — 60 posts prêts — UI admin à faire** |
