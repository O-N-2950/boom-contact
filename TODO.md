# boom.contact — TODO.md
> Mise à jour : 21 Mars 2026 — Fin Session 3

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
- [x] Métadonnées `application:'boom.contact'` sur toutes les transactions
- [x] 3 packages : 1/3/10 constats — CHF 4.90 / 12.90 / 34.90
- [x] Tables DB : users, payments, credit_txns
- [x] CGUModal — case obligatoire CGU + case optionnelle marketing PEP's Swiss SA
- [x] Consentements horodatés en base
- [x] DNS boom.contact : A → Railway, CNAME www, SPF, DMARC
- [x] MX + SPF Resend (send._domainkey, send TXT)

---

## ✅ FAIT — Session 3 (Qualité & Véhicules)

- [x] Fix crash QRSession — `enabled: !!sessionId && !partnerJoined`
- [x] Fix PDF WinAnsi — `①②③✓` remplacés par ASCII → PDF génère correctement
- [x] Positionnement mondial — toutes références au formulaire papier supprimées partout
- [x] 17 circonstances reformulées dans nos propres termes
- [x] OCRScanner — `capture="environment"` mobile, file picker desktop
- [x] Compression image 1024px / q=85% avant Claude Vision (-80% coût)
- [x] tRPC client propre — main.tsx wrappé, trpc.ts créé
- [x] Zéro `fetch('/trpc/...')` brut dans tous les composants principaux
- [x] ErrorBoundary — page erreur propre au lieu de page blanche
- [x] SignaturePad — ResizeObserver + DPR Retina
- [x] VehicleType exhaustif : 17 types (trottinette, tram, train, engin de chantier…)
- [x] LocationStep — sélecteur 17 types groupés + blessures détaillées
- [x] 8 silhouettes SVG techniques (voiture, moto, scooter, vélo, camion, bus, tram, piéton)
- [x] Mapper 700+ modèles marque+modèle → carrosserie + couleur (30 langues)
- [x] VehicleDiagram — silhouette adaptée au type + couleur réelle OCR sur SVG
- [x] ColorPicker — 28 swatches visuels + saisie libre dans ConstatForm
- [x] Page de présentation /pitch.html

---

## 🔴 PRIORITÉ 1 — Session 4 à faire en premier

### Photos de scène — MANQUANT CRITIQUE
- [ ] Composant `PhotoCapture` — à créer
  - Catégories : Lieu du sinistre · Dommages véhicule A · Dommages véhicule B · Blessures · Autre
  - Max 5 photos au total, compression 1024px avant stockage
  - Prévisualisation + suppression + légende libre
  - Stockage dans `AccidentData.photos[]` (type ScenePhoto déjà dans shared/types)
- [ ] Intégrer PhotoCapture dans ConstatFlow (après LocationStep, avant QR)
- [ ] Intégrer PhotoCapture dans JoinSession
- [ ] PDF — afficher les photos en grille 2 colonnes avec légendes
- [ ] Email — photos en pièces jointes ou inline

### DKIM Resend — 1 action manuelle Olivier
- [ ] Infomaniak Manager → boom.contact → DNS → Ajouter TXT :
  - Nom : `resend._domainkey`
  - Valeur : `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/9W6A0Ku3MNuKTPAgNqno/gfoWs5pojTRG4XpLhpsxJIUK1lEmGv75tYHgLzUC7aBd9tfKMGRV/WMpk3AJJA6xGyKtPmhixW2A96Vv9ZQ6cCzLsQqS0rCVvYbonlaARDlru4i8UqqWjslN+IbYzO1yrnEYYglIm34ZA8FJJ9TVQIDAQAB`
  - ⚠️ API Infomaniak bloque les `_domainkey` — doit être fait manuellement

### fetch() bruts restants — à migrer tRPC
- [ ] `PricingPage.tsx` — `fetch('/trpc/payment.createCheckout')` → mutation tRPC
- [ ] `CGUModal.tsx` — `fetch('/trpc/user.saveConsent')` → mutation tRPC

---

## 🟠 PRIORITÉ 2 — Formulaire complet

### Champs manquants par rapport au formulaire standard
- [ ] Date/heure accident — éditable (actuellement timestamp session, pas modifiable)
- [ ] Témoins — champ texte libre (noms, tél)
- [ ] Dégâts matériels à des tiers autres que A et B (oui/non)
- [ ] Blessés (oui/non) — ✅ déjà dans LocationStep
- [ ] Observations libres conducteur A et B (section 14)
- [ ] Dégâts apparents texte libre (section 11)
- [ ] Preneur d'assurance (différent du conducteur) — champs séparés
- [ ] N° carte verte — ✅ déjà dans InsuranceData
- [ ] Attestation valable du/au — dates validité assurance
- [ ] Catégorie permis (A, B...) — ✅ déjà dans DriverData
- [ ] Date de naissance conducteur — ✅ à vérifier dans DriverData

### Carte verte optionnelle
- [ ] Si carte verte absente → saisie manuelle NOM société + N° contrat uniquement
- [ ] OCR : si aucune carte verte → passer directement à la saisie manuelle assurance

---

## 🟠 PRIORITÉ 3 — Croquis de l'accident (Section 13)

- [ ] Composant `AccidentSketch` — canvas dessin libre
  - Outils : ✏️ Crayon · **A** Tampon véhicule A · **B** Tampon véhicule B · → Flèche · | Ligne route · **T** Texte · 🗑 Effacer
  - Les tampons A et B utilisent la silhouette SVG du véhicule correspondant
  - Export PNG → stocké dans `AccidentData.sketchImage`
  - Intégré dans le PDF section croquis
- [ ] Intégrer dans le flow entre Form et Diagram

---

## 🟡 PRIORITÉ 4 — Qualité & Robustesse

### Silhouettes Niveau 2
- [ ] 50 modèles les plus courants avec silhouettes distinctes par carrosserie
  (hatchback_3 vs hatchback_5, SUV small vs large, pick-up, etc.)
- [ ] Base : les 8 formes SVG actuelles + sous-variantes

### CarDiagram visibilité
- [ ] Le SVG est parfois trop sombre sur fond noir — ajouter fond légèrement contrasté
- [ ] Tester sur iPhone en conditions réelles

### Rate limiting étendu
- [ ] session.create — 5/min par IP (actuellement only /ocr est limité)
- [ ] session.join — 10/min par IP

### Tests
- [ ] Flow complet A+B sur 2 téléphones réels
- [ ] Test PDF bout-en-bout (téléchargement + email)
- [ ] Test OCR : permis CH / carte grise FR / Green Card internationale
- [ ] Test Stripe paiement réel CHF

---

## 🟢 PRIORITÉ 5 — Features avancées

### PWA Offline-first ★ CRITIQUE
- [ ] Service Worker : cache assets + formulaire
- [ ] IndexedDB : stocker session offline
- [ ] Sync quand connexion rétablie
- [ ] Essentiel pour accidents en montagne, tunnel, campagne

### i18n — Interface multilingue
- [ ] i18next + react-i18next
- [ ] FR / DE / IT / EN minimum (Suisse quadrilingue)
- [ ] Détection auto langue navigateur
- [ ] Bascule RTL/LTR pour arabe/hébreu

### Mode Témoin
- [ ] 3ème QR pour un témoin de l'accident
- [ ] Photos + déclaration + signature témoin
- [ ] Valeur légale considérable

### Détection contradictions IA
- [ ] Avant signature : analyser les déclarations des 2 conducteurs
- [ ] Alerter si contradiction flagrante
- [ ] Ex : "A dit priorité droite, B ne coche pas cette circonstance"

### Dark mode automatique
- [ ] prefers-color-scheme
- [ ] Critique pour accidents nocturnes (écran blanc aveuglant)

---

## 🔵 PRIORITÉ 6 — Business & Go-Live

### Intégration NEO / WIN WIN
- [ ] API /api/accidents/stats pour neo-api-gateway
- [ ] Dashboard CEO : nb constats/jour, pays, langues
- [ ] Si client WIN WIN impliqué → alerte temps réel cockpit winwin.swiss

### Intégrations assureurs suisses (B2B)
- [ ] AXA, Baloise, Helvetia, Mobilière — APIs partenaires
- [ ] Push déclaration directement dans leur système

### App Store
- [ ] PWA installable (manifest + Service Worker)
- [ ] Publication App Store iOS + Google Play (via Capacitor ou PWA)

---

## 📋 CHECKLIST AVANT LANCEMENT COMMERCIAL

- [x] Build Railway SUCCESS
- [x] Health check /health répond
- [x] ANTHROPIC_API_KEY valide
- [x] DATABASE_URL PostgreSQL connecté
- [x] Migrations DB au démarrage
- [x] Rate limiting OCR actif
- [x] Logs Railway visibles
- [x] Stripe live configuré
- [x] 2 services propres (boom-contact + PostgreSQL)
- [x] DNS A + CNAME www configurés
- [ ] DKIM Resend ajouté (Infomaniak manuel — 2 min)
- [ ] Test flow complet mobile iOS + Android
- [ ] Test PDF téléchargement + email reçu
- [ ] Test Stripe paiement réel
- [ ] Photos de scène fonctionnelles
- [ ] CGU + RGPD en production vérifiés

---

## 🤖 Agents IA disponibles

| Agent | Utiliser quand |
|---|---|
| `debugger` | Build cassé, erreur Railway, bug logique |
| `deployment-validator` | Avant chaque deploy Railway |
| `backend-architect` | Nouvelle route tRPC, nouveau service |
| `database-architect` | Schéma DB, migrations |
| `frontend-developer` | Nouveaux composants React |
| `security-auditor` | Avant mise en production |
| `performance-engineer` | Optimisation OCR, PDF, WebSocket |
| `code-reviewer` | Avant merge sur main |
| `test-automator` | Écriture tests E2E Playwright |

Accès : https://boom-contact-production.up.railway.app?agents=true
