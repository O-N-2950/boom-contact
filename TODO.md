# boom.contact — TODO.md
> Mise à jour : 11 Avril 2026 — Fin Session 15

---

## ✅ FAIT — Sessions 1-13 (voir SUIVI.md pour détails)

- [x] Infrastructure Railway + PostgreSQL + tRPC v11
- [x] Flow constat complet A+B (10 étapes)
- [x] OCR Claude Vision 50 langues
- [x] Stripe live CHF+EUR+GBP+AUD+USD+CAD+SGD+JPY — 3 packages
- [x] PDF multilingue 12 langues + carte OSM
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
- [x] robots.txt — route Express AVANT express.static
- [x] sitemap.xml — multilingue hreflang FR/DE/IT/EN
- [x] Build SUCCESS vérifié en prod

### Générateur marketing automatique
- [x] Table `social_posts` + service `social-generator.service.ts`
- [x] Routes tRPC `marketing.*` + cron quotidien 7h
- [x] 60 posts générés — 15×TikTok 15×IG 15×FB 15×LI

---

## ✅ FAIT — Session 15 (11 Avril 2026)

### Audit complet + corrections (78 tests E2E)
- [x] 202+ erreurs TypeScript → 0 erreurs
- [x] 12/44 tests → 44/44 tests passés
- [x] Post-paiement Stripe fiabilisé (retry, dedup, webhook one-shot)
- [x] Zod 3.25 résolu (customConditions + alias vitest)

### 10 KO corrigés (audit 78 questions)
- [x] Proportions véhicules sur carte (camion, moto, vélo, trottinette)
- [x] Champs optionnels pour vélos/piétons (plaque, assurance)
- [x] Zoom +/- et pinch-to-zoom sur la carte accident
- [x] Support RTL PDF (arabe/hébreu) — polices Noto Sans embarquées
- [x] Traduction azerbaïdjanaise complète (az.json)
- [x] Rapport police multilingue (FR/DE/IT/EN) avec labels traduits
- [x] Envoi email des rapports police (sendPoliceReportEmail)
- [x] Traçabilité modifications police (policeCorrections + annotation PDF)
- [x] Avertissement expiration session (countdown 1h45)
- [x] Accessibilité aria-invalid/aria-describedby sur champs requis

### Bugs d'affichage corrigés
- [x] Balises HTML brutes dans traductions i18n (49 locales nettoyées)
- [x] Date/heure accident pré-remplie (plus de carrés blancs)
- [x] Affichage date lisible ("10 avril 2026" au lieu de "2026-04-10")

### Qualité code
- [x] Erreurs silencieuses → bandeaux rouges visibles (5 composants)
- [x] BugReport ne montre plus "succès" en cas d'erreur
- [x] z-index CookieBanner 9000 → 50 (ne bloque plus les modales)

### i18n complète (50 langues)
- [x] PricingPage — entièrement traduit FR+EN
- [x] OCRScanner — entièrement traduit FR+EN
- [x] PostConstatCTA — entièrement traduit FR+EN
- [x] AuthModal — entièrement traduit FR+EN
- [x] VoiceSketchFlow — entièrement traduit FR+EN
- [x] SignaturePad — entièrement traduit FR+EN
- [x] ConstatForm — labels traduits FR+EN
- [x] App.tsx — alert() traduits
- [x] 7 composants police — entièrement traduits FR+EN

### Nouvelles fonctionnalités
- [x] **PWA offline complet** — SW v5, IndexedDB mutation queue, Background Sync, replay auto
- [x] **Horodatage blockchain** — SHA-256 + OpenTimestamps Bitcoin, route verifyProof, badge PDF

---

## 🔴 SESSION 16 — PRIORITÉ HAUTE

### API B2B pour assureurs
- [ ] API REST/tRPC avec API keys pour partenaires
- [ ] SDK JavaScript intégrable dans apps assureurs
- [ ] Dashboard partenaire (usage, facturation, stats)
- [ ] Documentation API (OpenAPI/Swagger)
- [ ] Webhooks pour notifier les assureurs (nouveau constat, PDF prêt)
- [ ] Rate limiting par API key

### IA estimation de responsabilité
- [ ] Intégrer barème IDA/IRSA comme contexte Claude
- [ ] Générer % responsabilité estimé à partir du croquis + dégâts + circonstances
- [ ] Afficher dans le PDF et dans l'UI post-constat
- [ ] Disclaimer légal ("estimation, non contractuelle")

### PoliceFlow (pilote Canton Jura)
- [ ] police.boom.contact subdomain Railway
- [ ] Auth police login + JWT 8h
- [ ] Audit trail RGPD consultations agents

---

## 🟠 SESSION 17+ — MOYEN TERME

### Produit
- [ ] Intégration dashcam (Tesla, Nexar, Viofo)
- [ ] Marketplace réparation (garages partenaires géolocalisés)
- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Mode Témoin officiel (3ème QR dans ConstatFlow)
- [ ] 50 silhouettes véhicules niveau 2
- [ ] Dark mode (prefers-color-scheme)
- [ ] Champs CEA manquants

### Marketing
- [ ] Seed des 60 posts Session 14 en DB
- [ ] Dashboard marketing admin (UI)
- [ ] LinkedIn Page boom.contact séparée

---

## 📊 ÉTAT TECHNIQUE (11 Avril 2026)

| Composant | État |
|---|---|
| TypeScript | 0 erreurs strict mode |
| Tests | 44/44 passés (vitest) |
| Frontend | React 18 + Vite + TailwindCSS v4 + i18n 50 langues |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL — 13 tables |
| PDF | pdf-lib + Noto Sans (RTL arabe/hébreu) + badge blockchain |
| PWA | SW v5 + IndexedDB + Background Sync (offline complet) |
| Horodatage | OpenTimestamps SHA-256 Bitcoin |
| Hébergement | Railway Europe West — auto-deploy depuis main |
