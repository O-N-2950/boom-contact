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

## ✅ FAIT — Session 4 (Photos & Qualité)

- [x] Composant `PhotoCapture` — 5 catégories, compression 1024px, légendes, preview, suppression, max 5 photos
- [x] `PhotoCapture` intégré dans `ConstatFlow` (step photos après location)
- [x] `PhotoCapture` intégré dans `JoinSession` (step photos après location)
- [x] `LocationStep` correctement câblé dans `ConstatFlow` (était manquant dans le JSX)
- [x] `photos` persistées en localStorage + envoyées en DB via `updateAccident`
- [x] `updateAccident` tRPC — schéma étendu avec le champ `photos[]`
- [x] `PricingPage.tsx` — migré de `fetch()` brut vers mutation tRPC `payment.createCheckout`
- [x] `CGUModal.tsx` — migré de `fetch()` brut vers mutation tRPC `user.saveConsent`
- [x] Email sender corrigé : `contact@boom.contact` (était `constat@boom.contact`)
- [x] Module Police documenté dans TODO + CONTEXT (roadmap B2B stratégique)

---

## ✅ FAIT — Session 5 (Croquis, Multi-véhicules, PDF complet)

- [x] `AccidentSketch` — canvas dessin libre section 13 (crayon, tampons A/B, flèche, route, texte, gomme)
- [x] Croquis intégré ConstatFlow + JoinSession, persisté localStorage + DB
- [x] `ConstatForm` section Complément — date/heure éditable, témoins, dégâts tiers, observations section 14, dégâts apparents section 11, preneur assurance différent
- [x] PDF enrichi — page croquis + page photos grille 2 colonnes + témoins + dégâts tiers
- [x] Session TTL 24h effectif (police peut intervenir longtemps après)
- [x] QR persistant écran Done avec message "police peut scanner"
- [x] `QRSession` multi-véhicules — sélecteur 2→5 véhicules, QR coloré par rôle (B orange, C vert, D violet, E ambre)
- [x] `JoinSession` — lit paramètre `?role=C` dans URL, toutes mutations utilisent le rôle dynamique
- [x] `ConstatForm`, `VehicleDiagram`, `SignaturePad`, `PDFDownload` — role étendu à A/B/C/D/E
- [x] `signSession` et `sendToDriver` router — acceptent rôles A-E
- [x] Numéros urgences géolocalisés 35 pays (117/144 CH, 17/15 FR, 110/112 DE, 999 UK, 911 US...)
- [x] Logo réel intégré partout (LandingPage, flows, pitch.html)
- [x] pitch.html — sections Module Police B2B + Multi-véhicules ajoutées

---

## 🔴 PRIORITÉ 1 — Session 6

### Photos de scène — ✅ FAIT Session 4
### DKIM Resend — 1 action manuelle Olivier (inchangé)
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

### Module Police / Institutions ★ STRATÉGIQUE B2B

boom.contact comme **outil métier officiel** pour les corps de police.
Les agents rejoignent une session existante via QR ou créent leur propre rapport sur scène.

#### Principe fondamental — NO auto-notification
⚠️ La police N'EST JAMAIS notifiée automatiquement — la majorité des accidents se règlent
sans police et les conducteurs ne veulent pas de sanctions inutiles.
La police est impliquée UNIQUEMENT si l'utilisateur le demande explicitement.

#### Déclenchements possibles (tous volontaires)
- Bouton "Appeler la police" dans LocationStep ou écran Done → génère lien/QR partageable
- Case "Accident grave / blessés graves" cochée → option apparaît pour alerter secours
- Police arrive d'elle-même → scanne le QR du conducteur → rejoint la session existante
- Police pré-envoie un lien au conducteur avant d'arriver → conducteur commence à remplir

#### QR code persistant — durée de vie étendue
- Session active pendant 24h minimum (actuellement 2h — trop court)
- QR code toujours affichable depuis l'écran "Done" même après signature
- Si police arrive 1-2h après → scanne, accède à tout, enrichit le dossier
- Statut session : `waiting` → `active` → `signed` → `completed` (pas `expired` pendant 24h)

#### Flow Police rejoint une session existante
1. Policier scanne le QR sur téléphone du conducteur A
2. App détecte login institutionnel → mode Police activé
3. Policier voit tout ce qui a été saisi (données OCR, photos, circonstances, signatures)
4. Il enrichit avec : infractions constatées, mesures, témoins assermentés, état conducteurs
5. Il signe en tant qu'autorité → PDF enrichi généré (constat + PV officiel)

#### Flow Police pré-envoie lien (gain de temps)
1. Policier/centrale envoie SMS au conducteur : "boom.contact/join?police=xxx"
2. Conducteur commence à remplir pendant que la patrouille arrive
3. Policier arrive, scanne, tout est déjà prêt — il finalise et signe

#### Architecture technique
- Table `police_stations` (id, pays, région, zone GPS, email, langue)
- Table `police_users` (id, station_id, login, JWT rôle "police")
- Session étendue 24h + statut `signed` distinct de `expired`
- QR accessible depuis écran Done (nouveau composant `SessionQR`)
- Router `/police` protégé + flow `PoliceFlow.tsx`
- PDF template "PV officiel" distinct du template CEA

#### Idées avancées (sessions suivantes)
- 🔴 Intégration assureurs temps réel (AXA, Baloise, Helvetia APIs) — envoi auto à signature
- 🟠 Score cohérence IA — Claude analyse contradictions entre déclarations A et B
- 🟡 Mode Témoin officiel — 3ème QR pour agent/témoin assermenté
- 🟢 Escalade "accident grave" — si blessés graves cochés → option alerte secours (112/144)
- 🔵 Géofencing — détection juridiction pour routing interne (sans notification auto)

#### Marché cible
- Cantons suisses (26 cantons, ~350 postes)
- Départements français (101 départements)
- Länder allemands, provinces belges, etc.
- Modèle : CHF/€ 200–500/mois par poste = MRR massif récurrent

- [ ] Allonger durée session 2h → 24h
- [ ] QR code accessible depuis écran Done (`SessionQR` composant)
- [ ] Bouton volontaire "Appeler la police" dans LocationStep
- [ ] Maquette flow Police
- [ ] Table `police_stations` + `police_users` (migrations)
- [ ] Authentification institutionnelle JWT "police"
- [ ] `PoliceFlow.tsx` — flow agent rejoignant session existante
- [ ] Template PDF "PV officiel"
- [ ] Dashboard poste `/police/dashboard`
- [ ] Démo canton pilote (Jura / Vaud ?)

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
- [x] DKIM Resend ajouté (Infomaniak manuel — fait ✅)
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
