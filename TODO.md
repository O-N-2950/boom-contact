# boom.contact — TODO.md
> Mise à jour : Mars 2026 — Revue architecturale complète
> Priorités basées sur audit code + retour terrain

---

## ✅ RÉSOLU — Build & Infrastructure

- [x] Build Railway SUCCESS — suppression vite.config.ts (conflit ESM)
- [x] Service web doublon supprimé — projet propre: boom-contact + PostgreSQL
- [x] Logger centralisé (Morgan + logger.ts) — tous les logs visibles Railway
- [x] tRPC v11 mutations corrigées — plus de wrapper {json:{}}
- [x] Stripe API version corrigée — checkout live fonctionnel
- [x] CORS production — boom.contact + www.boom.contact acceptés
- [x] Variables Railway — DB, Claude, Stripe, Resend, Webhook configurés

---

## 🔴 URGENCE — Corrections critiques (session courante)

### Fix 1 — OCRScanner mobile ✅ FAIT
- [x] `capture="environment"` sur mobile, fallback file picker desktop
- [x] Compression image avant envoi Claude Vision (max 1024px, q=85%) → -80% coût OCR

### Fix 2 — tRPC client propre ✅ FAIT
- [x] `main.tsx` wrappé QueryClientProvider + trpc.Provider
- [x] `trpc.ts` créé — createTRPCReact + createTRPCClient
- [x] `ConstatFlow.tsx` — session.create + sign via trpc.useMutation()

### Fix 3 — Error Boundary React ✅ FAIT
- [x] ErrorBoundary.tsx — page d'erreur propre au lieu de page blanche
- [x] App.tsx wrappé ErrorBoundary

### Fix 4 — Remaining fetch() → tRPC (à faire)
- [ ] JoinSession.tsx — remplacer fetch() par trpc.session.join.useMutation()
- [ ] QRSession.tsx — trpc.session.get.useQuery()
- [ ] PDFDownload.tsx — trpc.pdf.generate.useMutation()
- [ ] PricingPage.tsx — trpc.payment.createCheckout.useMutation()
- [ ] CGUModal.tsx — trpc.user.saveConsent.useMutation()

---

## 🟠 PRIORITÉ 1 — Core App fonctionnelle

### Rate limiting étendu
- [ ] Limiter session.create (anti-bot DB saturation) — 5/min par IP
- [ ] Limiter session.join — 10/min par IP
- [ ] Captcha optionnel si abus détecté

### CarDiagram SVG responsive
- [ ] Migrer vers SVG viewBox relatif (%, pas px fixes)
- [ ] Zones touch-friendly min 44px (WCAG)
- [ ] Zones se chevauchent sur iPhone SE (375px) → à corriger

### SignaturePad canvas responsive
- [ ] Ajouter ResizeObserver — recalcule canvas.width/height si fenêtre change
- [ ] Correction scaling : rect.width ≠ canvas.width sur devicePixelRatio > 1

### OCR Engine — tests terrain
- [ ] Tester sur vrai permis CH (VD, GE, BE)
- [ ] Tester carte grise française (SIV format)
- [ ] Tester Green Card internationale
- [ ] Tester Zulassungsbescheinigung DE
- [ ] Tester 行驶证 chinois
- [ ] Tester RC Book indien
- [ ] Fallback UI si confidence < 0.5 (saisie manuelle)

### PDF Generator
- [ ] Tester génération PDF bout-en-bout (données réelles)
- [ ] Vérifier lisibilité signatures embedded
- [ ] PDF multilingue selon langue conducteur A

### JoinSession (Driver B)
- [ ] Détecter langue navigateur → sélectionner automatiquement
- [ ] WebSocket reconnect automatique si déconnexion

---

## 🟡 PRIORITÉ 2 — Qualité & Robustesse

### Photos des dégâts dans le PDF ★ NOUVEAU
- [ ] Après l'OCR, permettre 3 photos des dégâts physiques
- [ ] Miniatures intégrées dans le PDF final (valeur légale ++)
- [ ] Compression avant upload (même logique que OCR)

### Compression image côté client ✅ FAIT (OCR)
- [ ] Appliquer aussi aux photos de dégâts

### Détection contradictions par IA ★ NOUVEAU
- [ ] Avant signature: Claude analyse les 2 déclarations
- [ ] Alerte si contradiction: "A dit priorité droite, B ne coche pas cette circonstance"
- [ ] Optionnel — ne bloque pas la signature

### Mode Témoin ★ NOUVEAU
- [ ] 3ème QR code pour un témoin de l'accident
- [ ] Témoin prend photos + signe en tant que témoin
- [ ] Valeur légale considérable

### Tests
- [ ] Tests E2E Playwright: flow complet A+B
- [ ] Tests unitaires: session.service, pdf.service, ocr.service
- [ ] Test de charge: 100 sessions simultanées

### Sécurité OWASP
- [ ] Rate limiting session.create + join (pas seulement /ocr)
- [ ] Validation taille image: max 5MB avant compression
- [ ] CORS: vérifier headers en prod

---

## 🟢 PRIORITÉ 3 — Features avancées

### PWA Offline-first ★ CRITIQUE pour accidents sans réseau
- [ ] Service Worker: cache assets + formulaire
- [ ] IndexedDB: stocker session offline
- [ ] Sync quand connexion rétablie
- [ ] Essentiel: accidents en montagne, tunnel, campagne

### Détection contours documents (OCR précision)
- [ ] Détecter rectangle du document dans la photo
- [ ] Recadrer automatiquement avant envoi Claude Vision
- [ ] OCR 2x plus précis, 4x moins cher

### NFC en plus du QR
- [ ] Android + iOS 17+: tap NFC partage l'URL de session
- [ ] Plus rapide que QR sous la pluie

### Dark mode automatique
- [ ] Accidents de nuit: écran blanc aveuglant
- [ ] prefers-color-scheme automatique
- [ ] L'app est déjà dark — vérifier que le mode clair est aussi supporté

### Voix guidée OCR
- [ ] Guidance audio à l'étape OCR
- [ ] "Posez votre carte grise à plat, prenez la photo maintenant"
- [ ] Web Speech API, TTS natif

### Email (Resend) — DKIM manquant
- [ ] Ajouter TXT resend._domainkey sur Infomaniak (manuel, API bloquée)
- [ ] Tester envoi PDF après double signature
- [ ] Templates multilingues

### Géolocalisation enrichie
- [ ] Reverse geocoding: GPS → adresse complète
- [ ] Carte Leaflet/OSM pour confirmer le lieu
- [ ] Timestamp légal certifié

### Langues (50)
- [ ] i18next + react-i18next
- [ ] Traduction UI complète (actuellement FR only)
- [ ] Détection auto langue navigateur
- [ ] Bascule RTL/LTR dynamique

---

## 🔵 PRIORITÉ 4 — Business & Go-Live

### Stripe & Packages ✅ FAIT
- [x] 3 packages: 1 / 3 / 10 constats
- [x] CHF 4.90 / 12.90 / 34.90
- [x] Webhook + crédits DB
- [x] Métadonnées application: 'boom.contact' (filtre Stripe dashboard)

### CGU & RGPD ✅ FAIT
- [x] CGUModal avec acceptation obligatoire
- [x] Case optionnelle marketing PEP's Swiss SA
- [x] Consentements horodatés en DB

### Domaine & DNS ✅ QUASI COMPLET
- [x] boom.contact → Railway (A + CNAME www)
- [x] SPF: infomaniak + resend
- [x] DMARC: p=quarantine
- [ ] DKIM Resend: ajouter manuellement sur Infomaniak Manager

### Intégration NEO / WIN WIN
- [ ] API /api/accidents/stats pour neo-api-gateway
- [ ] Dashboard CEO: nb constats/jour, pays, langues
- [ ] Relier sinistres → opportunités WIN WIN (courtage)
- [ ] Si client WIN WIN impliqué: alerte temps réel cockpit

### Intégrations assureurs suisses (B2B)
- [ ] AXA, Baloise, Helvetia, Mobilière — APIs partenaires
- [ ] Push déclaration direct dans leur système
- [ ] Premier sinistre déclaré en 30s en Suisse

---

## 📋 CHECKLIST AVANT MISE EN PRODUCTION

- [x] Build Railway SUCCESS
- [x] Health check /health répond
- [x] ANTHROPIC_API_KEY valide en prod
- [x] DATABASE_URL connecté PostgreSQL
- [x] Migrations DB appliquées au démarrage
- [x] Rate limiting OCR actif
- [x] Logs Railway visibles (Morgan + logger)
- [x] Stripe live keys configurées
- [x] 2 services propres (boom-contact + PostgreSQL)
- [ ] DKIM Resend ajouté (Infomaniak manuel)
- [ ] Tests E2E passent
- [ ] Backup DB configuré
- [ ] Test flow complet mobile iOS + Android
- [ ] Test avec vrais documents (3 pays minimum)
- [ ] CarDiagram responsive vérifié iPhone SE
- [ ] SignaturePad ResizeObserver

---

## 🤖 AGENTS DISPONIBLES

| Agent | Utiliser quand |
|-------|---------------|
| `debugger` | Build cassé, erreur Railway, bug logique |
| `deployment-validator` | Avant chaque deploy Railway |
| `backend-architect` | Nouvelle route tRPC, nouveau service |
| `database-architect` | Schéma DB, migrations, requêtes |
| `frontend-developer` | Nouveaux composants React |
| `security-auditor` | Avant mise en production |
| `performance-engineer` | Optimisation OCR, PDF, WebSocket |
| `code-reviewer` | Avant merge sur main |
| `test-automator` | Écriture tests E2E Playwright |
