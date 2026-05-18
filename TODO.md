# boom.contact — TODO.md

> Mise à jour : 18 mai 2026 — Session 16b

---

## ✅ FAIT — Session 16b (Voie B complète + tous les M) — voir SUIVI.md
Voie B multi-véhicules A→E complète (tokens individuels, persistance par
rôle, join/PDF/email A-E, QR 5 véhicules). M3, M5, M7, M8, M9, M10, M11.
M6 vérifié déjà correct. État : TS 0 · build OK · tests 45/45.

## ✅ FAIT — Session 16 (bloquants) — voir historique
B1 (code), B2, B3, H1, H2, H3, H4, H5, M1, M4, M12.

---

## ⏳ RESTE AVANT SOUMISSION STORES

### Validation (pas du code)
- [ ] **B1 — test runtime natif** : IPA + AAB **signés**, test iPhone +
      Android réels (session, QR scanné par 2e appareil, vocal, PDF, retour
      Stripe). Nécessite Xcode/Android Studio + certificats.
- [ ] Signature release iOS (cert+provisioning) / Android (keystore) dans
      `build-ios.yml` / `build-android.yml`.
- [ ] Tester end-to-end un constat **3/4/5 véhicules** sur device réel
      (C/D/E rejoignent, signent, PDF annexe correct, emails reçus).

### Décision juridique (ne pas trancher seul)
- [ ] **M2 — claims légaux** PDF (« légalement valable / 46 pays », « valable
      auprès des assurances ») → validation juriste + reformulation prudente.

### Améliorations (P2, non bloquantes)
- [ ] WebP dans le PDF : conversion serveur (`sharp`) — pdf-lib = JPG/PNG only.
- [ ] Croquis multi-véhicules (le croquis reste orienté A/B ; les données
      C/D/E sont dans la page annexe mais le schéma visuel ne place que A/B).
- [ ] Mode « Témoin officiel » (rôle 'W' serveur) — réactiver le bloc masqué.

### Roadmap
- [ ] Module police (PoliceFlow, sous-domaine, PDF par pays) — M1-M3+.
- [ ] Intégration assureurs (API/webhook) — M12+.

# boom.contact — TODO.md

> Mise à jour : 18 mai 2026 — Session 16

---

## ✅ FAIT cette session (Session 16) — voir SUIVI.md
B1 (code), B2, B3, B4 (Voie A), H1, H2, H3, H4, H5 (PNG), M1, M4, M12.
État : TS 0 erreur · build client/serveur OK · tests 44/44 OK.

---

## ⏳ RESTE À FAIRE — avant soumission stores

### Bloquant résiduel (validation, pas code)
- [ ] **B1 — validation runtime native** : générer IPA + AAB **signés**,
      tester sur iPhone + Android réels le flux complet (création session,
      QR scanné par 2e appareil, vocal, PDF, retour Stripe). Nécessite
      Xcode/Android Studio + certificats Apple/Google. *Le code est prêt ;
      seul le test appareil + la signature release manquent.*
- [ ] Config signature release iOS (certificat + provisioning) et Android
      (keystore) dans les workflows `build-ios.yml` / `build-android.yml`.

### Décisions produit / juridique (ne pas trancher seul)
- [ ] **M2 — claims légaux** PDF : « Document légalement valable - 46 pays »,
      « valable auprès des assurances » → faire valider/reformuler par un
      juriste (risque review Apple/Google + risque légal). Reformulation
      prudente suggérée : « dossier PDF structuré + horodatage
      cryptographique, à transmettre à votre assureur ».
- [ ] **M3 — wording** « PDF envoyé à votre assureur » (UI) vs modèle réel
      (envoyé au conducteur qui transmet). Aligner le texte.

### Améliorations qualité (P1/P2, non bloquantes)
- [ ] M5 — remplacer le QR de l'écran « done » (tiers `api.qrserver.com`)
      par la lib `qrcode` locale (offline + confidentialité).
- [ ] M6 — auto-email aussi pour constats solo / piéton / partie B
      indisponible (aujourd'hui : seulement sur double signature).
- [ ] M7 — rate-limit dédié + limite de taille sur
      `/api/monitor/client-error`.
- [ ] M8 — pagination des photos dans le PDF (multi-pages si > N photos).
- [ ] H5b — WebP : conversion serveur (sharp) avant embed PDF (pdf-lib ne
      supporte que JPG/PNG).
- [ ] M9 — pseudonymiser/hasher l'email comme distinctId PostHog.
- [ ] M10 — release Sentry alignée sur les versions iOS/Android.
- [ ] M11 — `payment.verifyCredit` : ne plus exposer le solde par email.

### Roadmap (hors V1 — Voie B / police)
- [ ] Refactor multi-véhicules A–E : tokens individualisés, updateParticipant
      A–E, PDF/email/croquis dynamiques, tests E2E A/B/C/D/E.
- [ ] Réactiver « Témoin officiel » (rôle 'W' serveur : enum Zod +
      signSession keyMap + PDF).
- [ ] Module police (PoliceFlow, sous-domaine, PDF par pays) — roadmap M1-M3+.

---

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
