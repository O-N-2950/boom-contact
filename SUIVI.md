# boom.contact — SUIVI.md

> Mise à jour : 19 mai 2026 — **Post-audit #5 (grille A/B/C)**

---

## Post-audit #5 — commit e6534c1, déployé SUCCESS, health/home 200

Audit ChatGPT le plus rigoureux (grille appliquée : défaut code réel /
périmètre documenté / bloqueur non-code, sur le bon commit).

### Catégorie A — défauts code réels → TOUS traités
| # | Point | Traitement |
|---|---|---|
| A1 | socket `signing-ready` typé A/B | Élargi A→E (frontend n'émet pas cet event → alignement de type, zéro impact runtime) ✅ |
| A2 | WebP/GIF acceptés mais pas dans PDF | **Déjà corrigé** au commit 8519ebc pour le chemin photos→PDF (enum JPEG/PNG + rejet explicite). Ligne 618 = route `ocr.scan` : images → Claude Vision (extraction texte), jamais dans le PDF. Clos avec preuve, pas de re-fix d'un non-bug ✅ |
| A3 | suivi d'envoi global via pdfUrl | Suivi PAR DESTINATAIRE : `pdfDeliveredAt`/`pdfDeliveryError`/`pdfDeliveryMessageId` dans le JSONB participant (zéro migration). Helper `deliverAndRecord` (sign + webhook + admin resend) capture aussi `ok:false` (gap latent corrigé : échec doux Resend était loggé « envoyé »). Skip par rôle si déjà livré + dedup global → dedup précis : un échec C est rejouable sans re-spammer A/B ✅ |

### Catégorie B — décisions de périmètre documentées (pas des bugs)
PDF C/D/E en annexe · croquis A/B (+ C/D/E représentés) · police A/B
(roadmap hors V1) · tokens HMAC sans colonne DB. Confirmées correctes
par l'audit. Aucune action.

### Catégorie C — bloqueurs non-code (impossibles en sandbox)
Runtime natif iOS/Android signé · validation juridique de fond · test
concurrence réel Postgres (signatures simultanées A-E). Tout est dans
KIT-passage-TestFlight.md.

Vérifié : tsc 0 · build client+serveur OK · tests 45/45 · Railway
SUCCESS (`e6534c1`) · /health 200 · home 200.

### Bilan des 5 audits + audit profond interne
Plus AUCUN défaut code ouvert. Tout ce qui reste = catégorie B
(décisions documentées) ou C (non-code : appareils + juriste).

# boom.contact — SUIVI.md

> Mise à jour : 19 mai 2026 — **Audit profond proactif (auto-initié)**

---

## Audit profond proactif — commit 69f0262, déployé SUCCESS, health/home 200

Recherche active de ce qui peut casser (concurrence, dépendances
externes, fuites, sécurité) — pas de confirmation de ce qui marche.

### 2 vrais bugs production trouvés et corrigés

**BUG 1 — Course critique sans verrou (SÉRIEUX)**
`updateParticipant` / `updateAccident` / `signSession` lisaient la
session en transaction mais SANS `FOR UPDATE`. En READ COMMITTED :
- A et B signent quasi-simultanément → chaque transaction voit l'autre
  « non signé » → `allSigned=false` pour les deux → **constat bloqué en
  `signing`, jamais `completed`, aucun PDF/email auto-envoyé.**
- Lost-update sur la colonne `accident` partagée (A et B éditant
  circonstances/photos en même temps → modifs écrasées).
Fix : `SELECT … .for('update')` sur les 3 fonctions → le read-modify-
write est sérialisé (la 2e transaction attend, relit l'état frais,
recalcule correctement). Correctif standard PostgreSQL, non-cassant
(ne change le comportement que sous concurrence — vers le correct).

**BUG 2 — Client SDK Anthropic sans timeout**
Défaut SDK = 10 min/requête. OCR (chemin utilisateur, scan document
pendant l'accident) pouvait se figer jusqu'à 10 min sur connexion
pendue. Fix : `timeout: 45_000` + `maxRetries: 1` sur le singleton.

### Zones auditées et VÉRIFIÉES SAINES (aucune modif inventée)
- OCR / accident-analyzer : `JSON.parse` IA en try/catch → dégradation
  gracieuse, jamais de 500
- Expiration session : TTL 7 j + jamais d'auto-expiration si
  active/signing/completed → pas de perte de données en cours de saisie
- Bornes Zod : signature/audio/strings tous bornés (≤10 MB)
- Auth Socket.io : middleware JWT + rate-limit anonyme + join-session
  exige et valide le participantToken (events = notifications, pas de
  mutation d'état)
- Webhook Stripe : raw body + `constructEvent` (signature vérifiée) +
  secret fail-closed + idempotence par session
- Puppeteer : timeouts setContent/waitForFunction + `page.close()` en
  finally + `getBrowser()` détecte `disconnected` et relance (auto-heal)
- Tâche background auto-envoi : `try/catch` englobant (pas de crash
  process) + envoi par destinataire résilient
- `useCredit` : décrément atomique en une requête avec garde
  `credits > 0` + ledger idempotent → pas d'underflow, pas de
  double-dépense

Vérifié : tsc 0 · build client+serveur OK · tests 45/45 · Railway
SUCCESS (`69f0262`) · /health 200 · home 200.

> Note honnête : le fix concurrence est le pattern PostgreSQL standard
> (FOR UPDATE) et est validé tsc/build ; un test de concurrence réel
> exige un vrai Postgres (les 45 tests utilisent une DB mockée). À
> rejouer dans la matrice E2E appareils du kit (2 signatures
> simultanées → constat doit passer `completed`).

# boom.contact — SUIVI.md

> Mise à jour : 19 mai 2026 — **Post-audit #4 (tous points code corrigés)**

---

## Post-audit #4 — commit 8519ebc, déployé SUCCESS, health/home 200

| # audit | Point | Correctif | Statut |
|---|---|---|---|
| 2.1 | Footer PDF = URL Railway technique | → `www.boom.contact` (et version unilatérale nettoyée) | ✅ |
| 2.2 | Claims PDF juridiques sensibles | TOUS retirés/reformulés : « légalement valable », « 46 pays », « certifié », « valable mondialement », « Convention Européenne Assurances » → wording factuel « dossier numérique horodaté » ; badge « Preuve blockchain » → « OpenTimestamps (ancrage Bitcoin) » (mécanisme factuel). Vérifié : **0** claim sensible restant dans pdf.service.ts | ✅ |
| 2.3 | Légende croquis A/B trompeuse | Mention « + C/D/E (voir annexe) » ajoutée quand C/D/E présents → non trompeur | ✅ |
| 2.5 | WebP/GIF acceptés mais non intégrables PDF | Upload restreint à **JPEG/PNG** (client produit toujours JPEG → zéro impact) ; WebP/GIF rejetés explicitement → plus d'échec PDF silencieux possible | ✅ |
| 2.6 | Résilience livraison / échec C/D/E masqué | `adminResendPdf` accepte désormais **A-E** (recouvrement manuel C/D/E) + déjà : chaque envoi en try/catch individuel + log `[DELIVERY]` actionnable | ✅ |
| 2.4 | Police A/B | **Décision de périmètre actée** : module police = roadmap M1-M3+, explicitement **HORS V1 publique**. Pas un bug, un scope assumé. | ✅ documenté |

Vérifié : tsc 0 · build client+serveur OK · tests 45/45 · Railway SUCCESS
(`8519ebc`) · /health 200 · home 200.

### Ce qui reste — STRICTEMENT hors-code (impossible en sandbox)
- Runtime natif (builds signés + tests iPhone/Android réels) → kit fourni
- Validation juridique de fond du wording neutre restant (le risqué est
  retiré ; un juriste peut valider le neutre)
- Tests E2E 1-5 véhicules sur appareils réels
- (P2 documenté) croquis = simulation multi-corps ; PDF C/D/E en annexe :
  approche assumée, pas un défaut

# boom.contact — SUIVI.md

> Dernière mise à jour : 19 mai 2026 — **Post-audit expert #2 (corrections code restantes)**

---

## Post-audit #2 — ce qui a été corrigé (commit 7668002, déployé SUCCESS)

| Sujet | Avant | Maintenant | Preuve |
|---|---|---|---|
| Emails « deux conducteurs ont signé » | faux à 3+ véh. | neutre, 13 langues (valide 1-5, solo, piéton) | email.service.ts intros |
| Claim « certifié/certified » email | non validé | → « horodaté » (factuel : OpenTimestamps) | intros 13 langues |
| Footer FR « Valable dans 150+ pays » | claim non prouvé | retiré ; reste « horodaté · Conforme RGPD » | email.service.ts:91 |
| shareText « valable dans 150 pays » | claim non prouvé | reformulé (« à transmettre à votre assureur ») | email.service.ts |
| Pitch B2B « certified PDF blockchain » | flou | « cryptographic blockchain timestamp (OpenTimestamps/Bitcoin) » | email.service.ts:634 |
| Photos catégories C/D/E | absentes (→ « other ») | vehicleC/D/E ajoutées (type partagé + enum serveur + UI filtrée par vehicleCount) | types/index.ts, router.ts:340, PhotoCapture.tsx |
| Croquis C/D/E | A/B uniquement | C/D/E **représentés** dans la scène (serveur PDF + aperçu client), étiquetés type/couleur/plaque — additif, A/B byte-identique | sketch-renderer.service.ts, sketch-engine.ts |
| Webhook Stripe C/D/E | doute audit | **déjà en place** (commit 3329fe0) | stripe.service.ts:374-375 |

Vérifié : tsc 0 · build client+serveur OK · tests 45/45 · Railway SUCCESS
(commit `7668002`) · /health 200 · home 200.

### Honnêteté sur le croquis
Le croquis **représente désormais tous les véhicules présents** (C/D/E
dessinés, étiquetés, positionnés en périphérie hors zone de collision) —
l'audit disait « le croquis ne représente pas C/D/E », ce n'est plus vrai.
**Ce n'est PAS** une simulation physique multi-corps : les trajectoires
précises de collision restent A/B-primaires (un moteur de scénarios 3-5
corps serait un redesign majeur du moteur 2-corps dupliqué client+serveur,
risqué pour l'A/B qui fonctionne). C'est une représentation de présence,
honnête et assumée.

---

# boom.contact — SUIVI.md

> Dernière mise à jour : 18 mai 2026 — **Session 16b (Voie B complète + tous les M)**

---

## SESSION 16b — Refactor multi-véhicules A→E (Voie B) + finitions M

Décision révisée : **VOIE B retenue** (vrai support multi-véhicules complet,
pas de bridage UI). Tout vérifié : **TS 0 erreur · build client+serveur OK ·
tests 45/45 OK** (+1 test de régression Voie B).

### Voie B — multi-véhicules A→E (résout B4 à la racine)
| Élément | Statut |
|---|---|
| Tokens individuels C/D/E (HMAC `JWT_SECRET`, zéro migration DB) | ✅ OK |
| `verifyParticipantToken` : C/D/E vérifient LEUR token (plus de partage tokenB) | ✅ OK |
| `updateParticipant` écrit dans `participant{role}` A-E (plus d'écrasement de B) | ✅ OK |
| `joinSession` role-aware (init participant{role}, ne réécrase pas une reprise) | ✅ OK |
| Route `session.join` : param `role` + vérif du token du rôle | ✅ OK |
| Route `session.get` : accepte les tokens A-E | ✅ OK |
| Nouvelle route `session.participantTokens` (gardée tokenA) pour QR multi | ✅ OK |
| `QRSession` : MAX_VEHICLES=5 + QR avec token individuel par rôle | ✅ OK |
| `JoinSession` : passe `role` à join + composants en `urlRole` (A-E) | ✅ OK |
| PDF : page annexe C/D/E (single-column, signatures) — A/B byte-identique | ✅ OK |
| `generateConstatPDF` : `forRole` A-E + langue selon le rôle | ✅ OK |
| `pdf.generate` : respecte le rôle C/D/E (ne force plus vers A) | ✅ OK |
| Email : `role` A-E + auto-envoi PDF aux participants C/D/E sur signature | ✅ OK |
| `signSession` : `allSigned` déjà multi-participants (vérifié) | ✅ OK |
| Test de régression `deriveParticipantToken` (tokens individualisés) | ✅ OK |

### Items M (finitions)
| # | Sujet | Statut |
|---|---|---|
| M3 | Wording « PDF envoyé à votre assureur » → reformulé (reçu, à transmettre) | ✅ OK |
| M5 | QR écran final : lib `qrcode` locale (plus de tiers api.qrserver.com) | ✅ OK |
| M6 | Auto-email solo/piéton/unilatéral | ✅ DÉJÀ CORRECT (vérifié — `allSigned` couvre ces cas ; audit l'avait sur-signalé) |
| M7 | `/api/monitor/client-error` : throttle 20/min/IP + tailles bornées | ✅ OK |
| M8 | Pagination photos PDF (nouvelle page si débordement) | ✅ OK |
| M9 | PostHog : email pseudonymisé (SHA-256) avant envoi | ✅ OK |
| M10 | Sentry release via `VITE_RELEASE`/`VITE_APP_VERSION` | ✅ OK |
| M11 | `payment.verifyCredit` ne divulgue plus le solde exact | ✅ OK |

### Vérifs finales (locales)
- `npx tsc --noEmit` → **0 erreur**
- `npx vite build` → **OK** · `npm run build:server` → **OK**
- `npx vitest run` → **45/45 OK**
- Sécurité préservée : tokens C/D/E non devinables (HMAC secret serveur),
  routes gardées (tokenA pour participantTokens), aucune migration DB.
- A/B inchangé : rendu PDF A/B byte-identique (C/D/E = pages annexes additives).

### ✅ Déploiement Railway VÉRIFIÉ (prod live)
- Commit `3ea2801` poussé → déploiement `fe8f3910` : **SUCCESS**
  (commitHash confirmé = 3ea2801b…, branch main).
- `/health` 200 (production) · home 200 · `session.create` OK (core inchangé).
- **Voie B live** : `session.participantTokens` renvoie des tokens
  **individuels** B/C/D/E tous distincts (C≠D≠E≠B) → modèle multi-véhicules
  opérationnel en prod.
- **Sécurité** : la même route avec un mauvais token → **401 UNAUTHORIZED**
  (garde tokenA active, pas de fuite des tokens C/D/E).
- Conclusion : Voie B déployée, fonctionnelle, sécurisée — rien cassé.

(le statut déploiement sera ajouté après vérif Railway)

---

# boom.contact — SUIVI.md

> Dernière mise à jour : 18 mai 2026 — **Session 16 (Audit PREMIUM + corrections)**

---

## SESSION 16 — Statut des corrections d'audit

Légende : ✅ OK (corrigé + vérifié build/TS/tests) · 🔵 fait, validation runtime à confirmer · ⏳ TODO (voir TODO.md)

### 🔴 Bloquants

| # | Sujet | Statut | Détail |
|---|---|---|---|
| B1 | Apps natives ne joignaient pas le backend | 🔵 **OK (code)** | `apiBase.ts` créé ; `main.tsx`, `trpc.ts`, `socket.ts`, `QRSession.tsx` câblés ; CORS serveur + origines Capacitor. Web = inchangé (relatif). **Validation appareil natif à faire** (hors sandbox). |
| B2 | Vocal in-form cassé (manque participantToken) | ✅ **OK** | `VoiceRecorder` reçoit `participantToken` (propagé depuis ConstatFlow=tokenA / JoinSession=tokenB) + vrai mimeType iOS (audio/mp4). |
| B3 | Double-débit crédit Stripe par session | ✅ **OK** | `useCredit` idempotent par `sessionId` (transaction + check `creditTxns` reason='use'/ref=sessionId avant débit). |
| B4 | Effondrement multi-véhicules C/D/E | ✅ **OK (Voie A)** | `MAX_VEHICLES = 2` → C/D/E injoignables via UI → plus de corruption possible. Refactor A–E = Voie B (reporté). |

### 🟠 Élevés

| # | Sujet | Statut | Détail |
|---|---|---|---|
| H1 | Piéton QR bloqué (tokenA manquant) | ✅ **OK** | `tokenA={tokenA}` passé au `<QRSession>` piéton. C'était la seule erreur TS du repo → désormais 0 erreur. |
| H2 | Coordonnées piéton (saisies par A) non sauvées | ✅ **OK** | Procédure serveur sécurisée `session.fillAbsentPedestrian` + client câblé via `trpcClient`. |
| H3 | Lien « Témoin officiel » cassé (no-op) | ✅ **OK** | Bloc masqué (rôle 'W' non supporté serveur — roadmap). Plus de feature cassée visible en review. |
| H4 | Suppression compte incomplète (RGPD) | ✅ **OK** | Cascade : delete constats/PII + anonymisation financiers (rétention fiscale). |
| H5 | Photos PNG/WebP perdues dans le PDF | ✅ **OK (PNG)** | Fallback `embedPng` si `embedJpg` échoue. WebP = limite pdf-lib → TODO (conversion sharp). |

### 🟡 Moyens traités

| # | Sujet | Statut | Détail |
|---|---|---|---|
| M1 | `(trpc as any).session.get.fetch` invalide ×2 | ✅ **OK** | Remplacé par `trpcClient.session.get.query` + shape corrigée (`participantB`). |
| M4 | URL avis Google placeholder (404 en prod) | ✅ **OK** | `process.env.GOOGLE_REVIEW_URL` ; bloc masqué si absente. |
| M12 | Config tests fragile (chemin `/root` en dur) | ✅ **OK** | `vitest.config.ts` portable → 44/44 vert. |

### Vérifications finales (locales)
- `npx tsc --noEmit` → **0 erreur**
- `npx vite build` → **OK**
- `npm run build:server` → **OK**
- `npx vitest run` → **44/44 OK**
- Aucune route/fonctionnalité web existante cassée (changements no-op côté web pour B1 ; reste = additif ou ciblé).

### ✅ Déploiement Railway VÉRIFIÉ (prod live)
- Commit `23603f3` poussé sur `main` → déploiement `09912098` : **SUCCESS**
  (build OK + serveur démarré + health check Railway passé).
- `/health` → **200** (env production)
- Home `/` → **200** (pas de page blanche)
- API `session.create` → **OK** (sessionId + qrUrl `www.boom.contact` + tokenA)
- Deep link `/join` → **200**
- **B1 serveur prouvé live** : `Origin: capacitor://localhost` →
  `access-control-allow-origin: capacitor://localhost` (origine native
  désormais acceptée). Origine random (`evil.example.com`) → **toujours
  refusée** → aucune régression de sécurité CORS.
- Conclusion : déploiement validé, **rien de cassé côté web**.

---

# boom.contact — SUIVI.md
> Dernière mise à jour : 23 Mars 2026 — Fin Session 12

---

## Session 12 — Chrome Puppeteer + OSM + Véhicules — 23 Mars 2026
**Dernier deploy** : SUCCESS 23 Mars 2026 07:08:59

### Commits Session 12
| Commit | Description |
|---|---|
| `195454bf` | feat(sketch): add puppeteer-core |
| `3105980c` | feat(sketch): Dockerfile + Chromium Alpine |
| `119172c2` | feat(sketch): sketch-renderer.service.ts |
| `58f31047` | feat(sketch): sketch-engine.js asset serveur |
| `956cb1d3` | feat(sketch): route sketch.render tRPC |
| `91240b50` | feat(sketch): pdf.service Puppeteer intégré |
| `807b1bd8` | fix(sketch): timeout 30s + capture erreurs JS |
| `0cf44cd3` | fix(sketch): engine JS inline valide |
| `1683a72e` | fix(pdf): import logger manquant |
| `06ecab7a` | fix(build): npm install au lieu de npm ci |
| `39c6312f` | fix(router): sketch.render dans appRouter |
| `cd969342` | feat(osm): Dockerfile + Cairo/canvas OSM |
| `da43106b` | feat(osm): osm-map.service.ts — tuiles OSM + geocoding |
| `e1f839da` | feat(osm): pdf.service fetch carte OSM réelle |
| `aa6298c7` | fix(sketch): supprimer drawRoadScene — OSM pur |
| `81e5a57c` | fix(sketch): véhicules proportionnés zoom 18 |
| `43fd0931` | feat(vehicles): train, tracteur, quad, chantier, bateau |
| `e3fa1fe` | feat(sketch): MapVehiclePlacer obligatoire |
| `4e0edbf0` | feat(sketch): SignaturePad prop disabled |
| `ddc5970e` | fix(renderer): drawVan+Train+Tracteur+Quad+Construction+Boat |
| `e89aff42` | fix(renderer): template literals ctx.font |

### Résultats Session 12

#### Chrome Puppeteer headless
- ✅ Chromium Alpine installé sur Railway (851 MB, 193 packages)
- ✅ Chrome cold start : 720ms
- ✅ sketch.render : 98 KB PNG en 1041ms
- ✅ 0 erreur en prod — SKETCH_DONE confirmé dans les logs

#### Carte OSM server-side
- ✅ osm-map.service.ts — tuiles OSM + Cairo/node-canvas
- ✅ Geocoding Nominatim (fallback si lat/lng absent)
- ✅ Carte rendue en ~600ms pour toutes les adresses testées
- ✅ Coordonnées exactes Bellevue 7 Courgenay : 47.4088, 7.1124

#### 16 types de véhicules — tous avec silhouette
car, suv, van, truck, bus, tram, **train** 🆕, motorcycle, scooter, moped, escooter, bicycle, cargo_bike, pedestrian, **quad** 🆕, **tractor** 🆕, **construction** 🆕, **boat** 🆕

#### MapVehiclePlacer obligatoire
- ✅ diagram → sketch → sign (plus de bypass)
- ✅ Bannière orange + bouton si conducteur arrive sans croquis
- ✅ SignaturePad désactivé tant que sketchImage est vide

#### Tests 10 pays — Session 12
| Pays | Lieu | Véhicules | KB | Logs |
|---|---|---|---|---|
| 🇨🇭 CH-1 | Bellevue 7 Courgenay (47.4088, 7.1124) | VW Golf × Renault Clio | 517 KB | ✅ |
| 🇨🇭 CH-2 | Route de Délémont, Courgenay | John Deere × Volvo FH16 | 484 KB | ✅ |
| 🇫🇷 FR | Rond-point Champs-Élysées Paris | Renault Mégane × Citroën C5X | 1657 KB | ✅ |
| 🇩🇪 DE | Autobahn A9 Munich | BMW M3 × BMW R1250GS (moto) | 1698 KB | ✅ |
| 🇧🇪 BE | Boulevard Anspach Bruxelles | VW Polo × Tramway STIB | 1542 KB | ✅ |
| 🇱🇺 LU | Place Guillaume II Luxembourg | Toyota RAV4 × Yamaha NMAX (scooter) | 1794 KB | ✅ |
| 🇮🇹 IT | Corso Buenos Aires Milano | Alfa Romeo × Trek (vélo) | 1410 KB | ✅ |
| 🇪🇸 ES | Carrer de Provença Barcelone | Mercedes Sprinter (van) × Seat Arona | 1592 KB | ✅ |
| 🇬🇧 GB | London Bridge | Lime E-Scooter × Piéton | 886 KB | ✅ |
| 🇦🇺 AU | Bondi Beach Sydney | CF Moto Quad × Toyota HiLux | 1187 KB | ✅ |

**10/10 ✅ — 0 erreur dans les logs Railway**

---

## Session 13 — PLANIFIÉE
**Objectif** : Authentification, Paiement International, Admin, Réseaux Sociaux

### Prochaines tâches (voir TODO.md Session 13)


## 2026-05-28 — Sprint 1 UX/legal (commit bf5c1ee)
Sprint UX/légal/store-readiness, zéro modif backend. 9 fichiers front + 2 i18n.
- Écran intro sécurité/légal avant OCR (ConstatFlow) + bouton urgence dès l'intro.
- Acceptation CGU/privacy invités B/C/D/E (JoinSession, case obligatoire).
- Confirmation légale avant signature A/B/C/D/E (SignaturePad, case obligatoire).
- Claims PDFDownload assainis (plus de "certifié"/"150+ pays"/"deux parties").
- Notice paiement (service, pas achat contenu) + micro-copy micro + confirmation photos blessures.
- QRSession : updateVehicleCount() unifié (corrige divergence UI/DB/PDF sur +/−).
- i18n : section 'legal' (fr+en), fallback FR pour les autres langues.
Vérif : tsc 0 · build client+serveur OK · 45/45 tests · Railway SUCCESS · prod /health+home 200.

## 2026-05-28 — Audit post-Sprint 1 + claims + Legal Pack + docs QA/stores (commit d2a1a3c)
- Audit code Sprint 1 : 7 fichiers OK ; checklist PDFDownload rendue générique (A-E/unilatéral).
- Claims risqués : découverte que seul le flow + pdf.service.ts étaient nettoyés. Assainis en plus :
  pdf.labels.ts (PDF, 12 langues), stripe.service.ts, ~48 locales, LandingPage, B2BPage, ShareBoom,
  PartyUnavailableModal. Balayage final = ZÉRO claim risqué. Railway URL = config (acceptable).
- Legal Pack : 8 docs présents + addendum daté au LEGAL_CLAIMS_REVIEW.
- docs/ créé : ios-testflight, android-internal-testing, qa-mobile-e2e-matrix, store-go-no-go, ux-ui-final-review.
- Vérif : JSON 48/48 · tsc 0 · build OK · 45/45 tests · Railway SUCCESS · prod 200 · bundle live sans claim.
- Reste hors code : builds natifs signés, tests device, validation juriste, App Privacy/Data Safety consoles, screenshots.

---

## Sprint 2 — Native Store Readiness (commit a7d4eaf)

**Date** : 2026-05-28

### Corrections
- **Capacitor CLI** aligné 7.6.2 → 8.3.1 (core/ios/android/cli tous 8.3.1, `cap doctor` OK).
- **Versions app** : iOS `MARKETING_VERSION` 1.0 → **1.0.0** (Debug+Release), build 1 ; Android déjà 1.0.0 / code 1 / appId `contact.boom.app`.
- **Retour Stripe natif câblé** :
  - iOS : `App.entitlements` (associated-domains `applinks:www.boom.contact` + `applinks:boom.contact`) + `CODE_SIGN_ENTITLEMENTS` dans les 2 configs pbxproj.
  - Android : intent-filter `autoVerify="true"` (VIEW/DEFAULT/BROWSABLE, https www.boom.contact + boom.contact) sur MainActivity.
  - `.well-known/{apple-app-site-association,assetlinks.json}` (templates, placeholders `TO_REPLACE`).
  - Routes Express dédiées (`serveWellKnown`) servant `application/json`, avant static + catch-all SPA, sans redirection.
  - `@capacitor/app` + listener `appUrlOpen` (natif only) rejouant les query params dans la WebView locale.
- **Docs** : matrice QA (sections Deep Links/Stripe + Permissions WebView), checklists iOS/Android, go-no-go actualisés.

### Vérifs
- typecheck 0 · build OK · test 45/45 · cap sync OK · cap doctor 8.3.1 aligné.
- Prod : Railway SUCCESS · `/health` 200 · `/` 200 · bundle live = 0 claim.
- `.well-known` live : HTTP 200, `application/json`, JSON valides, placeholders visibles.

### À compléter manuellement (hors code)
Apple Team ID (AASA) · SHA-256 clé de signature (assetlinks) · capability Associated Domains (profil Apple) · builds signés · uploads TestFlight / Internal Testing · tests devices DL-01..09 + PERM-01..04 · juriste.

---

## Sprint 4 — Premium Visual System (commit 32efc12)
**Date** : 2026-05-28
- 3 thèmes comparables : Boom Signature / Trust Premium / Swiss Calm (`client/src/design/themeTokens.ts`).
- `client/src/pages/DesignPreview.tsx` : 8 écrans-maquettes/thème, route **cachée** `/design-preview` (ou `?design=preview`), **noindex**, hors nav publique, code-split (13.7 kB), fonts injectés. N'altère ni le flow réel ni le thème de prod.
- `robots.txt` : `Disallow: /design-preview`.
- `docs/design-theme-review.md` (palettes, matrice 11 critères, accessibilité AA, reco hybride) + `docs/store-screenshot-plan.md` (7 visuels, wording prudent).
- Artifact HTML de comparaison fourni pour visualisation.
- Vérifs : tsc 0 · build OK · 45/45 · 0 claim · Railway SUCCESS · /health 200 · /design-preview 200 · robots Disallow OK · .well-known 200/200.
- **Reco** : App V1 = Trust Premium (base) + orange boom en CTA ; Landing = Boom ; Screenshots = Trust ; B2B = Swiss Calm. Décision Olivier en attente — prod inchangée.

---

## Sprint 4.1 — Hybrid Trust Premium validé (commit f078e8d)
**Date** : 2026-05-28
- Direction V1 actée : **Hybrid Trust Premium** (palette #F5F8FC/#FFFFFF/#102033/#FF6B1A/#123A5A/#18B8E8...).
- `themeTokens.ts` : thème hybrid ajouté + scores (Hybrid 95 / Trust 91 / Swiss 88 / Boom 82) + scheme/recommended.
- `DesignPreview.tsx` : refonte page CLAIRE, 7 mockups Hybrid réalistes (logo boom.contact, cartes blanches, CTA orange + CTA navy « Payer et générer le PDF », chips A/B/C-E) ; alternatives sur leur vrai fond (plus de shell noir).
- docs design-theme-review + store-screenshot-plan mis à jour (reco par surface, accessibilité Hybrid, titres prudents).
- Vérifs : tsc 0 · build OK · 45/45 · 0 claim · Railway SUCCESS · /design-preview 200 · robots Disallow · .well-known 200/200.
- **Reco par surface** : app=Hybrid · landing=Boom adouci · stores=Hybrid/Trust · B2B=Swiss · emails/PDF=Trust/Swiss · admin/police=Swiss.
- Production INCHANGÉE — application réelle = étape suivante après validation.

---

## Sprint 5 — Application Hybrid Trust Premium au flow accident réel (commits e74c1bb + 0c19efd)
**Date** : 2026-05-28
- **Foundation** (index.css) : Manrope auto-hébergé (woff2 latin+latin-ext) ; thème `[data-theme="hybrid"]` = palette stricte mappée sur variables existantes + `--navy #123A5A` / `--cyan #18B8E8` + `--shadow-card 0 8px 24px rgba(16,32,51,.06)` + `--radius-card 18px` + Manrope + inputs/textarea clairs.
- **App.tsx** : `data-theme="hybrid"` scoped au flow accident (constat/join), restauré en sortie. Landing/B2B/admin/police inchangés.
- **Composants** : PDFDownload paiement→navy (download reste orange) ; SignaturePad canvas blanc + encre navy (corrige `strokeStyle` var() invalide) ; QRSession QR `#123A5A` sur blanc + ROLE_COLORS A=orange/B=navy/C-E=gris ; ConstatFlow panneaux sombres→blancs (couplé texte), urgence intro→rouge ; global `#FF3500`→var(--boom), statuts→var ; 2 états disabled illisibles→var(--muted).
- **Non touchés** : backend, Stripe webhook, PDF backend, emails, landing, police, admin, B2B.
- **Vérifs** : tsc 0 · build OK · 45/45 · 0 claim · Railway SUCCESS (0c19efd cycle complet) · /health 200 · / 200 · /design-preview 200 · Manrope live · CSS hybrid live.
- **Reste** : QA visuelle sur appareils réels (device-qa-protocol) — non réalisable dans l'environnement de build.

---

## Sprint 6 — Visual QA + Store screenshots prep + Device capture readiness (commit f0ee34e)
**Date** : 2026-05-28
- **Code** : route `/visual-qa` (lazy, noindex, robots Disallow, hors nav, code-split 14.58 kB) — rend les 10 écrans du flow en `data-theme="hybrid"` avec les **mêmes variables/classes que la production** ; SignaturePad **réel** embarqué (props mockées). Ajustements stricts : buyPack PDFDownload → navy ; `text-green-500` → `text-[var(--green)]`.
- **Docs (5)** : `visual-qa-audit-2026-05-28.md` (10/10 contrôles OK) · `store-screenshot-production-plan.md` (7 captures + wording prudent) · `screenshot-capture-guide.md` (iOS sim + Android émul) · `demo-data-for-screenshots.md` (jeu fictif, 0 donnée réelle) · `accessibility-visual-checklist.md` (WCAG 2.2 AA, actions device).
- **Backend** : non touché.
- **Vérifs** : tsc 0 · build OK · 45/45 · 0 claim vivant · Railway SUCCESS · `/visual-qa` 200 · `/design-preview` 200 · `/health` 200 · Manrope live · CSS hybrid live · robots Disallow ×2.
- **Non public-ready** : Team ID, SHA-256, builds signés, device QA, juriste, App Privacy, Data Safety, beta restent prérequis.

---

## Sprint 7 — Store Screenshot Automation + UX polish QRSession (commits 1224894 + b073f2a)
**Date** : 2026-05-28
- **UX polish** : QRSession +/- véhicules : 32px → **44px** (WCAG 2.2 AA touch target).
- **Visual QA mode screenshot** : `/visual-qa?screenshot=<key>` (intro/qr/voice/photo/signature/pdf/done/emergency/store) ; layout marketing plein écran (gradient #F5F8FC→#EEF4FA, titre Manrope 800 navy, phone mockup centré, brand mark) ; données fictives verrouillées (Camille Martin / Luca Rossi / Sofia Keller / Exemple Auto / VD 000 000 / Assurance Démo / demo@boom.contact / Lausanne) ; QR stylisé propre avec 3 finders.
- **Script Playwright** `scripts/capture-store-screenshots.ts` : 5 viewports (iphone67 1290×2796 / iphone65 1284×2778 / iphone61 1179×2556 / android-phone 1080×1920 / android-tab 1440×2560) × 9 écrans + design-preview desktop ; variables BASE_URL/FORMATS/SCREENS ; sortie `artifacts/store-screenshots/` (gitignored).
- **package.json** : devDep `playwright ^1.49.0` + `npm run capture:screenshots`.
- **Docs MAJ** : store-screenshot-production-plan / screenshot-capture-guide / demo-data-for-screenshots.
- **Smoke test (vs prod live)** : 5 captures en 15.8s · 0 échec · PNG 100-310 kB · rendu visuel validé (titre/mockup/CTA/brand).
- **Vérifs** : tsc 0 · build OK (VisualQA 20.26 kB code-split) · 45/45 · 0 claim · Railway SUCCESS (b073f2a 255s) · `/visual-qa?screenshot=*` toutes 200 · robots Disallow ×2.
- **Backend / Stripe / logique métier non touchés**.

---

## Sprint 8 — Store Assets Finalization + claims leak critique (commits 0affa4a → 2e44111)
**Date** : 2026-05-28

### Livré
- **46/46 screenshots** générés en 120s (5 viewports × 9 écrans + design-preview, 6.4 MB total, gitignored).
- **5 docs stores** créés (~1100 lignes) : `store-screenshot-final-selection.md`, `store-screenshot-copy-fr-en.md`, `store-listing-copy-fr-en.md`, `app-review-instructions.md`, `store-upload-checklist.md`.
- **CookieBanner** + **BugReport** masqués sur `/visual-qa` et `/design-preview` (screenshots propres).

### DÉCOUVERTE CRITIQUE mid-sprint
8 sprints de greps anti-claims ciblaient `client/src + server/src + shared` et **rataient** :
- **`client/index.html`** servi live à chaque page : 18+ claims interdits (meta title/desc/keywords, OG, Twitter Card, 3 JSON-LD, noscript) + **`aggregateRating: 4.8/127` factice** (violation Google Structured Data policy)
- **`client/public/pitch.html`** servi 200 sur `/pitch.html` : 9 claims interdits (150+ pays, certifié, légalement valide, valeur légale officielle, monde entier, conforme CEA)
- **39 fichiers `client/src/i18n/locales/*.json`** : 78 occurrences de `"monde entier"` et `"5. Valeur légale"` non capturées par les patterns originaux
- `client/src/components/constat/VoiceRecorder.tsx` + `server/src/services/voice.service.ts` : `99 langues` inflated (Whisper ~57)
- `client/src/components/BugReport.tsx` : bouton **🐛** fixed bottom-right visible dans tous les screenshots stores

### Corrigé (commit b2b8458 + 2e44111)
- `index.html` réécrit entièrement : wording prudent, `aggregateRating` retiré, Manrope preload, `#FF6B1A`
- `pitch.html` : 9 remplacements ciblés + `Disallow /pitch.html` dans `robots.txt` server route
- 39 locales : 78 remplacements (`monde entier` → `à transmettre à votre assureur`, `5. Valeur légale` → `5. Statut du dossier PDF`)
- `VoiceRecorder` + `voice.service` : `99 langues` → `transcription multilingue`
- `BugReport` : guard `/visual-qa` + `/design-preview`

### Vérifications finales
- **Grep claims étendu** (incl. `client/index.html` + `client/public/*` + `locales`) : **0** ✅
- **HTML live servi** : `/` 0 claim, `/pitch.html` 0 claim ✅
- tsc 0 / build OK / 45-45
- Railway SUCCESS (2e44111, 165s) · tous endpoints 200 (incl. `/privacy`, `/cgu`, AASA, assetlinks)
- robots Disallow ×3 (`/visual-qa`, `/design-preview`, `/pitch.html`)
- 46/46 re-capture post-deploy : screenshots **entièrement propres** (🐛 disparu)

### Échec processus reconnu
Mes greps Sprint 1-7 étaient cantonnés à 3 répertoires alors que `client/index.html`, `client/public/*` et certaines clés i18n contenaient les pires claims. **Toute affirmation antérieure de « 0 claim vivant » était fausse pour les surfaces SEO/social/legal-pages**. Sprint 8 corrige cet angle mort et étend désormais le grep à l'ensemble du périmètre live.

### Placeholders bloquants restants (valeurs externes)
- `client/public/.well-known/apple-app-site-association` L7 : `TEAMID_TO_REPLACE` → Apple Team ID réel requis avant upload App Store
- `client/public/.well-known/assetlinks.json` L8 : `SHA256_CERT_FINGERPRINT_TO_REPLACE` → SHA-256 Play App Signing requis avant upload Google Play

---

## Sprint 9 — Permanent Compliance Guard + Legal Handoff + Reviewer Account (commit ebb8ce1)
**Date** : 2026-05-28
- **Garde-fou permanent claims** : `scripts/check-claims.ts` (300 lignes, 42 patterns FR/EN/DE/ES/IT, 9 catégories : geographic/certification/legal/acceptance/substitution/fake-reviews/inflated/cea). Scan 210 fichiers (client/index.html + client/public + client/src + locales + server/src + shared + docs + legal). Classification A_BLOCKING / B_DOC_ACCEPTABLE / C_FACTUAL_WHITELIST. AUDIT_FILES explicite. Détection négations sémantiques. Exit 1 si vrai risque. **Test fumigène validé** (injection → exit 1, retour → exit 0).
- **npm scripts** : `check:claims` + `quality:prestore` (typecheck + build + test + check:claims chaînés).
- **Docs Sprint 9 créés (6)** :
  - `docs/prestore-quality-gate.md` — checklist obligatoire pré-submission stores
  - `docs/legal-handoff-final.md` — handoff juriste structuré 17 sections + 11 questions à trancher
  - `docs/reviewer-account-setup.md` — préparation compte Apple/Google review
  - `docs/sql/reviewer-account-credits.sql` — SQL annoté **NE PAS EXÉCUTER** (idempotent, ROLLBACK par défaut)
  - `docs/release-monitoring-and-rollback.md` — seuils Sentry/PostHog/Stripe/Resend + rollback Railway
  - `docs/pitch-html-decision.md` — Option A retenue (garder + clean + Disallow + couvert par check:claims)
- **Décision /pitch.html** : Option A (clean, Disallow robots, couvert par garde-fou, non linké depuis pages publiques — vérifié grep 0 lien)
- **Placeholders audit exhaustif** : 2 bloquants (TEAMID_TO_REPLACE + SHA256_CERT_FINGERPRINT_TO_REPLACE, sources uniques), 6 docs templates acceptables, 0 TODO_*, 1 "TESTIMONIAL PLACEHOLDER" honnête (pas un faux témoignage).
- **Vérifs** : `quality:prestore` exit 0 sur 210 fichiers · A_BLOCKING=0 · B_DOC_ACCEPTABLE=111 · C_FACTUAL_WHITELIST=4 · tsc 0 · build OK · 45/45 · Railway SUCCESS (ebb8ce1, 250s) · tous endpoints 200 · robots Disallow ×3.
- **Backend / Stripe webhook / logique métier non touchés** (confirmé).

---

## Sprint 10A — Sécurité Android signing + doc clés (read-only sur placeholders)
**Date** : 2026-05-29
- **Sécurité signature Android** (`android/app/build.gradle`) : suppression du **mot de passe keystore en dur** (`BoomContact2026!`, ancien fallback pour `storePassword` + `keyPassword`). Résolution désormais : 1) env (`KEYSTORE_PASSWORD`/`KEY_PASSWORD`/opt. `KEY_ALIAS`/`KEYSTORE_FILE`), sinon 2) `android/keystore.properties` non commité. `signingConfigs.release` configuré uniquement si secrets présents ; **fail-fast** `GradleException` sur tâches `*Release` si secrets absents (n'affecte ni debug ni tâches Gradle générales) ; aucun secret loggué.
- **.gitignore** (`android/.gitignore`) : activation `*.jks` / `*.keystore` + ajout `keystore.properties` (secrets jamais commités). Keystore binaire toujours non commité.
- **Template** : `android/keystore.properties.example` (format documenté, aucune vraie valeur).
- **Doc** (`docs/well-known-finalization.md`) : nouvelle **section 0 faisant autorité** — placeholders à conserver, distinction **debug key / upload key / Play App Signing key**, valeur finale `assetlinks.json` = **SHA-256 Play App Signing key** de boom.contact (package `contact.boom.app`, source Play Console → App integrity), debug jamais en prod, upload key complément optionnel, timing « ne pas remplacer trop tôt » ; Apple Team ID = compte Developer, appID final `TEAMID.contact.boom.app`, ne jamais inventer ; note **rotation obligatoire** du mot de passe keystore avant publication.
- **Placeholders INTACTS** : `TEAMID_TO_REPLACE` (AASA) + `SHA256_CERT_FINGERPRINT_TO_REPLACE` (assetlinks) — aucun remplacement, aucune valeur inventée ou empruntée.
- **Hors périmètre confirmé non touché** : backend métier, Stripe, logique session/participants/PDF, `check-claims.ts` (aucune nouvelle surface de claim).
- **Vérifs** : `quality:prestore` **exit 0** · tsc 0 · build OK (`✓ built` + `Server compiled`) · 45/45 · check:claims A_BLOCKING=0 (210 fichiers) · placeholders confirmés présents live · endpoints prod 200.
- **Limite honnête** : `./gradlew assembleRelease` non exécutable dans l'environnement de build (pas de SDK Android) — la signature/fail-fast sera validée au premier build réel signé.
- **Finding A restant (à traiter par Olivier)** : rotation du mot de passe du vrai release keystore s'il utilisait l'ancien fallback.

---

## Sprint 10B (préparation) — Runbook d'exécution .well-known prêt-à-dérouler
**Date** : 2026-05-29
- **Aucun remplacement de placeholder** : `TEAMID_TO_REPLACE` + `SHA256_CERT_FINGERPRINT_TO_REPLACE` restent intacts (sources + live). Valeurs externes toujours non disponibles.
- **`docs/phase-10b-well-known-execution-runbook.md`** créé : procédure étape par étape A→I — préparation valeurs (Team ID 10 car., appID `TEAMID.contact.boom.app`, SHA-256 Play App Signing, package `contact.boom.app`, jamais de SHA d'une autre app) · remplacement AASA + assetlinks (JSON valide, autres champs intacts) · `npm run build` + `npx cap sync ios/android` · vérif copies natives (`ios/App/App/public/.well-known/`, `android/app/src/main/assets/public/.well-known/`) · `quality:prestore` · commit/push/Railway SUCCESS · vérifs live curl (200, pas de redirect, application/json, 0 placeholder, appID/package/SHA exacts) · validation externe (Apple AASA, Google Statement List Tester, `adb pm verify-app-links`, test device Internal/TestFlight) · rollback (mauvais Team ID/SHA, JSON cassé, App/Universal Links non validés, `git revert` d'urgence).
- **`docs/phase-10b-values-checklist.md`** créé : checklist courte (Team ID, SHA Play App Signing, upload key opt., date, source console, validé par, remplacé, déployé, testé).
- **Hors périmètre non touché** : backend métier, Stripe, logique session/participants/PDF, `check-claims.ts`, fichiers `.well-known` (valeurs).
- **Vérifs** : `quality:prestore` exit 0 · placeholders intacts · Railway SUCCESS.

---

## Phase 10B partielle — Android assetlinks finalisé (SHA-256 Play App Signing)
**Date** : 2026-05-29
- **assetlinks.json finalisé** : `client/public/.well-known/assetlinks.json` — placeholder `SHA256_CERT_FINGERPRINT_TO_REPLACE` remplacé par le **SHA-256 Play App Signing de boom.contact** (`C5:CC:A0:97:...:4D:99`, 32 octets), package `contact.boom.app`. Valeur traitée comme spécifique à boom.contact uniquement (jamais réutilisée pour une autre app). JSON valide, autres champs (`relation`, `namespace`, `package_name`) inchangés.
- **AASA NON touché** : `apple-app-site-association` garde `TEAMID_TO_REPLACE` (Apple Team ID pas encore fourni). iOS sync volontairement **non exécuté**.
- **cap sync android** : copie native régénérée → `android/app/src/main/assets/public/.well-known/assetlinks.json` contient le SHA réel (vérifié), 0 placeholder. Dossier natif gitignored (régénéré au build).
- **Hors périmètre non touché** : backend métier, Stripe, logique session/participants/PDF, `check-claims.ts`.
- **Vérifs** : `quality:prestore` exit 0 (212 fichiers, A_BLOCKING=0, 45/45) · assetlinks JSON valide · AASA placeholder intact · Railway SUCCESS · live assetlinks 200, SHA présent, 0 placeholder.
- **Reste** : Apple Team ID → AASA + cap sync ios ; validation device (adb verify-app-links après install Internal Testing) ; juriste ; soumission stores. **Pas de public-ready.**

---

## Sprint 10B exécution complète — AASA + assetlinks finalisés
**Date** : 2026-05-29
- **Valeurs externes officielles boom.contact appliquées** :
  - AASA : `appIDs = ["7YWB99G6Q8.contact.boom.app"]` (Apple Team ID `7YWB99G6Q8`, entité PEP's Swiss SA — Team ID commun à l'organisation, normal).
  - assetlinks : SHA-256 Play App Signing `C5:CC:...:4D:99` (propre à boom.contact), package `contact.boom.app` (déjà en place depuis le sprint Android partiel — inchangé).
- **Placeholders éliminés** : `TEAMID_TO_REPLACE` + `SHA256_CERT_FINGERPRINT_TO_REPLACE` → 0 dans les deux sources `.well-known`.
- **cap sync ios + android** : copies natives régénérées et vérifiées (iOS Team ID présent, Android SHA présent, 0 placeholder). iOS `pod install` sauté (CocoaPods absent en CI Linux — sera exécuté sur la machine de build macOS/Codemagic ; sans impact sur la copie `.well-known`).
- **Validation externe** : Google Digital Asset Links Statement List → déclaration publiée OK (package + SHA exacts). Apple AASA → format valide servi 200 (revérif CDN Apple au build signé).
- **Hors périmètre non touché** : backend métier, Stripe, logique session/participants/PDF, `check-claims.ts`.
- **Vérifs** : `quality:prestore` exit 0 (212 fichiers, A_BLOCKING=0, 45/45) · 2 JSON valides · Railway SUCCESS · live AASA + assetlinks 200, application/json, 0 placeholder.
- **Store native links readiness** : ~98/100 (reste validation device après install signée). **Avancement global ~98.7/100.**
- **Prochaine étape** : Codemagic / builds signés iOS+Android → TestFlight + Google Internal Testing → adb verify-app-links + test Universal Links device. **Pas de public-ready** (device QA + juriste + soumission restants).

---

## Sprint Landing — Hybrid Marketing Landing (homepage claire)
**Date** : 2026-05-29
- **Refonte `client/src/pages/LandingPage.tsx`** (594 -> 484 lignes) : home dark/orange agressive -> Hybrid Marketing Landing claire. Palette officielle (bg #F5F8FC, cartes #FFFFFF, elevated #EEF4FA, texte #102033/#5D6B7C, CTA orange #FF6B1A/#F05A0A, trust navy #123A5A, accent cyan #18B8E8, border #DDE7F0, shadow officielle). Manrope. Landing explicitement claire (override du fond sombre parent).
- **Architecture** : Hero = bleu nuit/graphite adouci (#102033->#123A5A, grille subtile, mockup produit clair, CTA orange + secondaire contour clair). Sections produit claires, cartes blanches. B2B = Swiss Calm. CTA principal orange ; confiance navy ; urgence rouge (encart secours) ; succes vert (badges).
- **Sections** : Hero, Comment ca marche (5 etapes i18n), QR / photos-voix-signature / PDF horodate / a transmettre a l assureur, Concu pour situations stressantes (+ encart ne remplace pas secours/police/avocat/assureur), Tarifs (1/3/10), B2B courtiers/flottes/partenaires, FAQ reformulee, CTA final, Footer clair.
- **Claims interdits supprimes** : mondial (x2), OCR universel / Formulaire universel (nettoyes FR/EN/DE/IT), faux temoignages retires, badge Modele constat europeen retire, FAQ reference CEA reformulee, section drapeaux coverage retiree, compteurs 1.8M retires.
- **i18n** : ajout landing.hero.title + subtitle (FR/EN/DE/IT, wording recommande) ; cta.start FR -> Commencer un constat ; step3 nettoye. Limite documentee (cat B) : residus universel/mondial dans ~39 locales long-tail (non rendus sur la nouvelle landing, non bloquants check:claims) -> sprint i18n dedie.
- **SEO index.html** : title -> boom.contact - Constater un accident simplement ; meta description recommandee ; og + twitter alignes ; H1 unique ; pas d aggregateRating ni faux avis.
- **Hors perimetre non touche** : backend, Stripe, logique session/participants/PDF, AASA/assetlinks (placeholders finalises intacts), check-claims.ts, /visual-qa, /design-preview, /privacy, /cgu.
- **Perf** : bundle landing 33.6 -> 28.4 kB, aucune dependance ajoutee.
- **Verifs** : quality:prestore exit 0 (212 fichiers, A_BLOCKING=0, 45/45) ; typecheck 0 ; build OK ; 0 mot interdit landing+index.html ; H1 unique.

---

## Sprint Landing (suite) — Modale ShareBoom alignée Hybrid clair
**Date** : 2026-05-29
- **`client/src/components/ShareBoom.tsx`** : la modale de partage etait restee dark plein ecran (rgba(6,6,12,0.95)) + bouton rouge agressif #FF3500 -> incoherente avec la landing claire (signale par Olivier via capture). Refonte en **carte modale centree claire** : scrim navy translucide + blur, carte blanche (#FFF, border #DDE7F0, shadow), titre navy, CTA "Partager maintenant" orange controle #FF6B1A, tuiles canaux claires (#F5F8FC) avec couleurs de marque conservees (WhatsApp/Telegram/etc.), email -> navy, stats en navy, encart TikTok en elevated clair. Bug corrige : doublon de stat "5 min / pour un constat" (x2) -> 3 stats distinctes (5 min / QR / PDF).
- **Logique 100% preservee** : channels, share(), messages par contexte, useFocusTrap, navigator.share/clipboard inchanges. Utilisee aussi par PostConstatCTA + AccountPage (surfaces deja claires) -> coherent partout.
- **Verifs** : quality:prestore exit 0 (A_BLOCKING=0, 45/45) ; typecheck 0 ; 0 couleur sombre residuelle ; bundle ShareBoom 8.78 kB.

---

## Sprint Landing (suite 2) — CGUModal + LanguageSwitcher + BugReport alignés Hybrid clair
**Date** : 2026-05-29
- **Revue des 3 surfaces secondaires lancees depuis la landing** (demande Olivier) -> toutes recolorees en Hybrid clair, logique 100% preservee :
  - **CGUModal** : bottom-sheet dark #0E0E18 -> carte blanche (scrim navy translucide, texte navy #102033/#5D6B7C, accent + onglets + liens + checkbox en orange #FF6B1A, bordures #DDE7F0, input clair). Ajout couleur de base #102033 (corrige des textes qui auraient herite du blanc -> invisibles sur fond blanc). tRPC saveConsent / consentement CGU+marketing CH / handleSubmit inchanges.
  - **LanguageSwitcher** : boutons drapeaux blanc-translucides (invisibles sur fond clair) -> bordure #DDE7F0 / fond blanc, actif orange #FF6B1A + fond orange 10%. applyLang inchange.
  - **BugReport** (fab 🐛) : pill + popover dark #06060C -> blanc translucide discret, bordures #DDE7F0, texte navy, CTA orange controle, toast succes vert #16A34A. trpc.email.bugReport inchange. Visibilite inchangee (masque sur /visual-qa + /design-preview).
- **Hors perimetre non touche** : backend, Stripe, logique session/participants/PDF, AASA/assetlinks, check-claims.ts.
- **Verifs** : quality:prestore exit 0 (A_BLOCKING=0, 45/45) ; typecheck 0 ; 0 couleur sombre residuelle (hors blancs translucides voulus).

---

## Sprint Landing (suite 3) — PricingPage en Hybrid clair + audit thème global
**Date** : 2026-05-29
- **Cause racine identifiee** : data-theme="hybrid" (palette claire) n'est applique QUE pendant le flow (App.tsx). Hors flow, le :root SOMBRE par defaut s'applique. Les pages qui CODENT leurs couleurs en dur (pas via var()) restent donc sombres -> incoherence (signale par Olivier sur la page tarifs).
- **`client/src/pages/PricingPage.tsx`** recolore en Hybrid clair : fond #F5F8FC, cartes blanches, devise active orange #FF6B1A, prix popular orange / autres navy, bouton achat popular orange + autres navy (#123A5A = action paiement), badge populaire orange, badges confiance/scenarios clairs, erreurs en rouge clair. Logique 100% preservee (detectCurrency, checkoutMutation Stripe, PACKAGES, PRICES, handleBuy). Stripe NON touche.
- **Audit complet des pages** (etat) : CLAIR -> LandingPage, ConstatFlow/PoliceFlow/VisualQA (tokens var()), DesignPreview, PricingPage (corrige), + modales ShareBoom/CGUModal/LanguageSwitcher/BugReport. SOMBRE HARDCODE restant -> AccountPage, PrivacyPage, B2BPage, JoinSession (user-facing), AdminDashboard, PoliceLogin/Dashboard/Intervention (interne). A traiter dans un sprint coherence dedie.
- **Verifs** : quality:prestore exit 0 (A_BLOCKING=0, 45/45) ; typecheck 0 ; 0 couleur sombre residuelle dans PricingPage.

---

## Fix — BugReport "Signaler un probleme" : saisie lettre par lettre (focus vole)
**Date** : 2026-05-29
- **Bug** : dans la fenetre Signaler un probleme, le focus etait vole a chaque frappe (saisie lettre par lettre). Cause : `BugReport` appelait `useFocusTrap(() => setOpen(false))` avec une **fonction inline recreee a chaque rendu** ; l'effet du hook dependait de `[onClose]` -> se relancait a chaque keystroke (setText -> re-render) et rappelait `first.focus()`, deplacant le focus du champ vers le bouton de fermeture.
- **Fix (hook `useFocusTrap.ts`, robuste pour tous les appelants)** : `onClose` stocke dans un ref (l'identite ne retrigger plus l'effet) ; ajout d'un parametre `active` (defaut true) dans les deps, pour (re)initialiser le piege de focus quand une modale a montage permanent s'ouvre. `BugReport` passe desormais `useFocusTrap(() => setOpen(false), open)`.
- **Compatibilite** : ShareBoom / CGUModal / AuthModal / PartyUnavailableModal (onClose stable, active=true par defaut) -> comportement identique (effet une seule fois au montage), et desormais proteges de tout vol de focus meme avec des champs de saisie. Escape/Tab-trap preserves (onClose via ref, focusables recalcules au keydown).
- **Verifs** : typecheck 0 ; quality:prestore exit 0 (A_BLOCKING=0, 45/45).

---

## Fix (suite) — Forcer la MAJ PWA (cache v5 -> v6) pour livrer le correctif focus
**Date** : 2026-05-29
- Le correctif useFocusTrap (saisie lettre par lettre) etait deja en prod (2e77de4) mais les clients PWA pouvaient encore tourner sur l'ancien bundle en cache (service worker). Bump `CACHE_NAME` boom-contact-v5 -> v6 (sw.js) : reinstall SW + skipWaiting + clients.claim + purge des anciens caches a l'activate -> rechargement du nouveau code. Aucun changement de logique applicative.
- Verifs : quality:prestore exit 0 (45/45, A_BLOCKING=0).

---

## Fix — BugReport : erreur Zod brute affichee + validation client manquante
**Date** : 2026-05-29
- **Bug (capture Olivier)** : a l'envoi d'un message < 5 caracteres, l'erreur Zod brute en JSON ([ { code: too_small, ... } ]) etait affichee a l'utilisateur. Cause : serveur valide message z.string().trim().min(5) ; le client affichait err.message tel quel (JSON Zod).
- **Fix complet (cote client, le bon endroit)** :
  - Module pur teste `client/src/components/bugReportUtils.ts` : MIN_MESSAGE (=5, aligne serveur), isValidEmail, validateBugReport(), friendlyError() qui ne renvoie JAMAIS d'erreur brute (JSON Zod/objet -> message FR propre).
  - `BugReport.tsx` : validation client (message >= 5, email valide si rempli) -> bouton Envoyer desactive tant que non valide ; indices inline ("5 caracteres minimum (n/5)", "email invalide ou laissez vide") ; onError mappe via friendlyError ; reset des champs apres succes.
  - **Test unitaire** `server/src/__tests__/bugReport.test.ts` (18 cas) : prouve le rejet < 5, l'email invalide, et que la ZodError brute de la capture devient un message propre (sans "too_small"/"[").
- **SW** : bump v6 -> v7 pour livrer le correctif aux clients PWA.
- **Verifs** : typecheck 0 ; quality:prestore exit 0 ; **63 tests** (45 -> 63) ; A_BLOCKING=0 (214 fichiers).

---

## Fix — Service Worker : erreur "Request scheme 'chrome-extension' is unsupported"
**Date** : 2026-05-29
- **Bug (console Olivier)** : `Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported` (sw.js, staleWhileRevalidate). Le SW interceptait les requetes d'extensions navigateur (chrome-extension://) et tentait de les mettre en cache -> erreur (schema non cachable).
- **Fix** : guard en tete du handler `fetch` -> on n'intercepte que http(s) ; tout autre scheme (chrome-extension://, data:, blob:...) est laisse au navigateur. Aucune logique applicative modifiee.
- **SW** : bump v7 -> v8.
- **Note** : le "je ne peux pas envoyer" du bug report n'est PAS un bug -> message < 5 caracteres = bouton desactive par design (validation alignee serveur), l'indice "5 caracteres minimum (n/5)" s'affiche. >= 5 caracteres -> bouton actif.
- **Verifs** : quality:prestore exit 0 ; 63 tests ; A_BLOCKING=0.

---

## Audit + fixes — Auth (lien magique CASSÉ), verification email, UI AuthModal
**Date** : 2026-05-29
**Declencheur** : Olivier — "le lien de connexion n'a pas fonctionne c'est grave". Capture : lien email = "\?magic=<token>" (RELATIF, sans domaine).

### CRITIQUE — lien magique relatif (corrige)
- **Cause** : `config.ts` -> `CLIENT_URL = optional('CLIENT_URL')` = chaine VIDE en prod (Railway n'a NI CLIENT_URL NI BASE_URL ; seulement RAILWAY_PUBLIC_DOMAIN=www.boom.contact). `auth.router.ts` construit `${CLIENT_URL}/?magic=${token}` -> "/?magic=..." relatif -> lien mort.
- **Fix** : `resolveClientUrl(env)` (fonction PURE, testee) : CLIENT_URL explicite -> https://RAILWAY_PUBLIC_DOMAIN -> https://www.boom.contact. Garantit une URL ABSOLUE. En prod -> https://www.boom.contact -> lien magique = https://www.boom.contact/?magic=token.
- **Test** : `server/src/__tests__/clientUrl.test.ts` (5 cas) — prouve qu'aucune config ne produit d'URL relative.

### BUG — lien de verification d'email (?verify=) non traite (corrige)
- L'inscription envoie un email avec `?verify=token` mais App.tsx ne lisait que ?magic= et ?gift=. Ajout du traitement ?verify= -> appel auth.verifyEmailToken -> message de confirmation/erreur.

### UI/UX — AuthModal recolore (thème clair Hybrid)
- Etait entierement sombre (#111 / #1a1a1a / #D42D00) -> recolore en clair coherent (carte blanche, scrim navy+blur, inputs #F5F8FC, CTA orange #FF6B1A, boutons secondaires navy, focus orange). Logique et cles i18n strictement identiques. "Mot de passe oublie" -> bascule lien magique (recuperation passwordless, OK).

### Email lien magique restyle (clair + lien texte de secours)
- Header navy, bouton orange #FF6B1A, + lien en TEXTE BRUT sous le bouton (utile quand le bouton est bloque, ex. avertissement securite Outlook).

### Audit Garage
- vehicle.router.ts (list/save/delete, protege JWT) + AccountPage (onglets garage/historique/profil, scan carte grise OCR) : cable et fonctionnel.

- **SW** : bump v8 -> v9 (livraison UI).
- **Verifs** : typecheck 0 ; quality:prestore exit 0 ; 68 tests (63 -> 68) ; A_BLOCKING=0.

---

## Sprint — Account Access UX + Auth Validation + Garage-to-Constat Flow
**Date** : 2026-05-29
**Deja corrige (non refait)** : magic link absolu, ?verify=, AuthModal claire, email magic restyle + lien texte, tests.

### Navigation compte (header) — AJOUTE
- `UserMenu.tsx` (nouveau, thème clair) : menu deroulant connecte -> Mon compte / Mon garage / Mes credits: X (+ Acheter) / Deconnexion (clic-exterieur + Echap).
- Header LandingPage adaptatif : DECONNECTE -> "Me connecter" + "Commencer un constat" (+ "Preparer mon garage" dans le hero) ; CONNECTE -> UserMenu (email + badge credits) + "Commencer un constat". Retrait du bloc compte redondant du hero. Prop `onLogin` branchee dans App.

### Garage (deja fonctionnel, valide)
- vehicle.router (list/save/delete protege JWT) + AccountPage (garage/historique/profil, scan carte grise OCR, ajout/edition/suppression vehicules, etat vide explicatif). "Preparer mon garage" -> garage si connecte, sinon AuthModal puis redirection garage (pendingAction).

### Garage-to-Constat Flow (deja present, AMELIORE + teste)
- A l'etape scan, si l'utilisateur est connecte ET a >=1 vehicule : bouton "Choisir un vehicule de mon garage" -> liste -> selection -> PREREMPLIT (vehicule + assurance + donnees permis via mapGarageVehicleToParticipant) et SAUTE l'OCR (setStep('location')). Le scan devient secondaire ("ou scanner un nouveau vehicule"), jamais obligatoire.
- Logique extraite en module PUR teste : `garageVehicleMap.ts` (mapGarageVehicleToParticipant, shouldOfferGarage, isScanRequiredAfterGarageSelection).
- Cas A-H couverts par tests : A(0 veh->pas de garage), B/C(1/plusieurs->garage), D(non connecte->jamais), scan optionnel apres selection. Annuler/Utiliser un autre/Ajouter nouveau geres par l'UI. B/C/D/E : le garage s'applique a l'initiateur authentifie (role A) ; les autres conducteurs rejoignent par QR (JoinSession).

### Credits
- Visibles : badge header (UserMenu), carte profil "CREDITS DISPONIBLES", badge stats compte. 0 credit affiche en rouge dans le menu. "Acheter" -> pricing.

### UI/UX — AccountPage recoloree (Hybrid Trust Premium)
- Etait entierement sombre (#06060C/#111/#1a1a1a/#D42D00/#FF3500...) -> recoloree : fond #F5F8FC, cartes blanches, texte #102033, secondaire #5D6B7C, CTA orange #FF6B1A, onglet actif orange, plaques navy #123A5A, assurance vert #16A34A, danger #DC2626, bordures #DDE7F0. 0 residu sombre, 0 text-white invisible. Sélecteur garage du ConstatFlow recolore aussi (etait en var(--green) cassees).

### Tests
- +10 (garageFlow.test.ts). Total 78 (68 -> 78). quality:prestore exit 0, A_BLOCKING=0 (218 fichiers).

### Non touche : webhook Stripe, AASA/assetlinks (verifie intacts), backend metier. SW v9 -> v10.

---

## Sprint global — Account UX + Auth + Garage + Fleet audit + i18n audit + Strategic
**Date** : 2026-05-29
### Corrections code (sures, evidentes) appliquees
- **Logo header** : 44px fixe -> responsive 50px desktop / 40px mobile (display block, aligne).
- **Claim "50 langues" (CATEGORIE A, trompeur)** : seuls FR/EN sont a 100% ; DE/IT a 34% ; switcher n'expose que 4 langues (fr/de/it/en) ; les 46 autres locales sont inatteignables. "50 langues/languages/idiomas/lingue/Sprachen" etait servi dans les 50 locales (cles landing.badges/coverage ORPHELINES non rendues), pitch.html, AccountPage, B2BPage, email footer. -> Tout neutralise en "Multilingue/Multilingual/Multilingüe/Mehrsprachig". 
- **check-claims durci** : + patterns ES/PT (valido mundialmente, legalmente valido, aceptado/aceito por todas, sustituye/substitui a la policia, prueba/prova incontestable, 150 paises, primera aplicacion/primeiro aplicativo mundial, reconocido/reconhecido oficialmente) + garde anti "50 langues" toutes langues. NB: "certificado de seguro" (ES) reste autorise (nom de document legitime). 60 patterns au total.
- **Email footer** : "50 languages · multi-country" -> "available in multiple languages".

### Audits livres (NON construits — voir rapport)
- **Fleet/B2B** : vehicles.userId uniquement (personnel strict), users.company libre, credits par user, aucune entite organisation. Architecture NON bloquee (jsonb, schema propre) -> roadmap org_id progressive.
- **i18n reel** : 50 locales, FR/EN 100%, DE/IT 34%, 46 autres 34% et inatteignables. Manquant en DE/IT = produit (constatForm/ocrScanner/auth/signature/postConstat/pricingPage/voice) ; present = landing/location/ocr/cgu. fallbackLng='fr'.

### Non touche : webhook Stripe, AASA/assetlinks (verifie), flow constat, sessions. SW v10 -> v11.
### Verifs : tsc 0, quality:prestore exit 0, 78 tests, A_BLOCKING=0 (218 fichiers).

---

## Sprint i18n Switzerland Completion (DE + IT 100%)
**Date** : 2026-05-29
### Réalisé
- **DE et IT complétés à 100 %** du périmètre grand public (559/559 clés, tableaux développés ; vérifié par 2 méthodes + test). Avant : 34 % (213). +275 clés core × 2 langues fusionnées.
- Namespaces traduits : postConstat(48), ocrScanner(46), constatForm(46), pricingPage(39), auth(24), voice(24), app(19), legal(15), signature(14). **police (132) volontairement laissé FR-first** (B2G, hors périmètre stores).
- **Méthode** : API Anthropic claude-sonnet-4-6, prompt strict (préservation placeholders {{}}/HTML/emojis validée par script ; terminologie verrouillée DE/IT ; vouvoiement ; formulations prudentes ; claims interdits bannis). 18/18 namespaces×langues OK du 1er coup. PCI-DSS-zertifiziert = factuel Stripe (légitime).
- **Statut qualité** : traduction auto vérifiée par garde-fous ; relecture humaine recommandée avant publication stores (documenté), non bloquante pour TestFlight.
- **Outillage** : `scripts/check-i18n.ts` + `npm run check:i18n` (échoue si langue EXPOSÉE < 100% core ; locales non exposées en informatif) **intégré à quality:prestore**. Test `i18nCompleteness.test.ts` (4 langues). Doc `docs/i18n-readiness-audit.md`.
- **LanguageSwitcher** : FR/EN/DE/IT désormais tous réellement utilisables de bout en bout (plus de repli français sur le formulaire/scan/auth/signature/post-constat/tarifs en DE/IT).
- **ES/PT** : audités, ~50% core, NON exposés (getLangOrder inchangé). Roadmap = sprint dédié. Score ES/PT 50/100.

### Vérifs : tsc 0, quality:prestore exit 0, **82 tests** (78→82), A_BLOCKING=0, check:i18n vert. SW v11→v12.
### Non touché : webhook Stripe, AASA/assetlinks (vérifié intacts), flow constat, sessions, getLangOrder.

---

## Sprint Analytics Funnel + Growth Instrumentation
**Date** : 2026-05-29
### Audit existant
- Infra DÉJÀ présente : posthog-js, @sentry/react+node, client/src/analytics.ts (track unifié PostHog+GA4), CookieBanner. MAIS : **0 event instrumenté** + PostHog/GA4 initialisés SANS consentement (incohérent avec le bandeau « aucun tracking »).
### Corrections / ajouts
- **Consentement** : PostHog + GA4 ne s'activent QUE si boom_cookie_consent === 'all' (gating dans initPostHog/initGA4). Accepter le bandeau active l'analytics immédiatement (enableAnalyticsAfterConsent, sans reload). Sentry = intérêt légitime, replay désactivé (privacy).
- **Privacy** : `sanitizeProps()` filtre toute PII (email/nom/plaque/tel/GPS/transcript/pdf/description/iban/token + email-like + texte libre >64c). track() sanitise TOUJOURS.
- **Taxonomie centralisée** : client/src/analytics-events.ts (EVENTS, VEHICLE_SOURCES, sanitizeProps, creditsBucket, isValidEventName) — module pur testable.
- **16 events MVP câblés** : landing_viewed, cta_start/garage/login, auth_magic_link_success, account_viewed, garage_viewed, garage_vehicle_added, constat_started, constat_vehicle_source_selected (garage/scan/manual), constat_garage_vehicle_selected, constat_scan_success, payment_started, payment_success, pdf_generation_success, participant_joined_via_qr.
- **Docs** : analytics-event-taxonomy.md, analytics-funnel-dashboard-spec.md (4 funnels + KPIs + seuils), analytics-privacy-review.md (RGPD/nLPD + stores).
- **Tests** : +11 (analytics.test.ts : sanitize, taxonomie, creditsBucket). Total 93 (82→93).
### Non touché : webhook Stripe, flow constat, auth/compte/garage/crédits, AASA/assetlinks. SW v12→v13.
### Vérifs : tsc 0, quality:prestore exit 0, A_BLOCKING=0, check:i18n vert.

---

## Sprint Analytics Activation + PostHog Funnels Setup Guide
**Date** : 2026-05-29
### Audit variables (toutes build-time, inline Vite -> rebuild requis)
- VITE_POSTHOG_KEY (requise, PostHog off si absente) · VITE_POSTHOG_HOST (opt, défaut eu.i.posthog.com) · VITE_GA4_ID (opt) · VITE_SENTRY_DSN (opt) · VITE_RELEASE/VITE_APP_VERSION (opt). Aucune clé en dur dans Git.
### Ajouts
- **Helper debug dev-only** dans analytics.ts : `window.__boomAnalytics.status()` -> { prod, consent, posthog, ga4, sentry, recent[] }. AUCUNE clé exposée. `console.debug('[analytics]', event, safe)` uniquement hors prod. Pas de panneau utilisateur.
- **Docs** : analytics-activation-runbook.md (vars Railway, rebuild, vérif bundle, désactivation) · posthog-funnels-setup-guide.md (4 funnels + breakdowns) · analytics-manual-test-plan.md (17 scénarios, events attendus, PII interdites, PASS/FAIL).
### Consentement (re-confirmé) : refus -> 0 event PostHog/GA4 ; accept all -> events ; Sentry séparé (erreurs, replay off, autocapture off).
### Non touché : webhook Stripe, flow constat, auth/compte/garage/crédits, AASA/assetlinks. SW v13->v14.
### Vérifs : tsc 0, quality:prestore exit 0, 93 tests, A_BLOCKING=0, check:i18n vert.
### ACTION OLIVIER : poser VITE_POSTHOG_KEY (+ host) dans Railway -> rebuild -> accepter cookies -> vérifier window.__boomAnalytics.status() + PostHog Live events.

---

## Sprint Analytics Activation — CORRECTIF build (analytics était mort en prod)
**Date** : 2026-05-29
### Diagnostic (vérifié sur le bundle prod servi)
- Les variables VITE_POSTHOG_KEY/HOST/GA4_ID/SENTRY_DSN SONT bien définies dans Railway.
- MAIS le bundle prod ne contenait AUCUNE référence (api_host, eu.i.posthog.com, phc_, anonymize_ip) : le code d'init était éliminé (`async function rr(){}` vide). Analytics INACTIF en prod.
- Cause : `railway.toml` builder = dockerfile ; le Dockerfile lançait `npm run build` SANS les VITE_* dans l'env du stage builder → import.meta.env.VITE_* = undefined au build → dead-code elimination.
- Stripe NON affecté : VITE_STRIPE_PUBLISHABLE_KEY non utilisée côté client (paiement = redirection Stripe Checkout pilotée serveur).
### Correctif
- Dockerfile : ARG + ENV VITE_POSTHOG_KEY/HOST/GA4_ID/SENTRY_DSN avant `RUN npm run build` (Railway injecte les variables de service comme build args). Valeurs publiques client (pas des secrets serveur).
- Runbook §7 ajouté. SW v14->v15.
### À VÉRIFIER post-deploy : bundle prod doit contenir l'init (host/phc_) + window.__boomAnalytics.status() => posthog:true après consentement.
### Non touché : webhook Stripe, flow, auth/garage, AASA/assetlinks. quality:prestore exit 0, 93 tests.

---

## Sprint Fleet B2B MVP — Architecture + Product Spec (docs, pas de build du système org)
**Date** : 2026-05-29
### Audit architecture actuelle (read-only)
- vehicles : userId notNull (FK users.id, onDelete cascade) — PERSONNEL uniquement, pas d'organizationId.
- crédits : users.credits + creditTxns (par userEmail) + payments (par userEmail) — par utilisateur uniquement.
- auditLog : EXISTE DEJA (event/userId/sessionId/ip/detail) — réutilisable pour la flotte.
- users.role : varchar simple ; users.company : texte libre (pas un lien org).
- PDF/email : 1 destinataire à la fois (driverEmail/recipientEmail + attachments) — multi-destinataires à ajouter (boucle).
- B2BPage existe (route /b2b, /partners) + section landing pro ; CTA = modal partage.
- Architecture ne BLOQUE PAS l'extension entreprise : tout est additif (colonne nullable + nouvelles tables), zéro migration destructive.
### Docs créés
- docs/fleet-b2b-data-model.md (6 tables + vehicles.organizationId nullable, non destructif)
- docs/fleet-b2b-mvp-spec.md (MVP 30j, personae, flows, débit wallet, done)
- docs/fleet-b2b-security-review.md (12 risques + matrice permissions + RGPD/nLPD)
- docs/fleet-b2b-monetization.md (3 modèles + partenaires + impact Stripe)
- docs/fleet-b2b-roadmap.md (30/90/12 mois)
- analytics-event-taxonomy.md : section Fleet B2B (11 events planifiés + props sans PII)
### Quick win APPLIQUÉ (sûr)
- fleet_cta_clicked câblé sur le CTA B2B de la landing (track + EVENTS déjà importés). Risque nul (additif, consentement-gaté, no PII). Fichier : client/src/pages/LandingPage.tsx. SW v15->v16.
### Garanties : webhook Stripe, flow constat, garage perso, auth/crédits, AASA/assetlinks — INTACTS. quality:prestore exit 0, 93 tests, A_BLOCKING=0.

---

## Sprint Fleet B2B Foundation — Organizations + Members + Permission Guards
**Date** : 2026-05-29
### Implémenté (backend uniquement, AUCUNE UI publique)
- Schéma : tables organizations + organization_members (additif, schema.ts).
- Migration : migrate.ts Block 14 (CREATE TABLE/INDEX IF NOT EXISTS + unique (org,user)), idempotent, exécuté au boot par runMigrations(). Aucune modif users/vehicles/payments/creditTxns.
- Service organization.service.ts : matrice de permissions PURE (roleCan/canAssignRole/canRemoveRole/isViewerRole) + guards DB (getUserOrganizationRole, assertOrganizationMember/Admin/Owner, canManageOrganizationVehicles, canInviteOrganizationMember) + CRUD (create→owner, listMine, get, listMembers, addMember [user existant], updateMemberRole, removeMember [soft], leave). Protection dernier owner.
- Router organization.router.ts : 8 routes protectedProcedure, erreurs mappées TRPCError, enregistré dans appRouter.
- Audit : org.created / member_added / member_role_updated / member_removed / member_left (logAudit, sans PII). AuditEvent étendu.
- Tests : organization.test.ts — 16 tests (matrice pure + service mock DB). Total suite 93→109.
### Volontairement NON construit : UI, invitation email (user inexistant), vehicles.organizationId, wallet, PDF multi, dashboard.
### Garanties anti-régression : webhook Stripe / AASA / assetlinks / users / vehicles / payments / garage perso / flow constat — INTACTS. quality:prestore exit 0, 109 tests, A_BLOCKING=0.
### Docs : fleet-b2b-implementation-notes.md (nouveau) + MAJ data-model/roadmap/security-review.

---

## Sprint Fleet B2B Value Chain — Organization Vehicles + Unified Garage + Constat Selection
**Date** : 2026-05-29
### Livré
- Migration Block 15 (additif) : vehicles.organization_id nullable + index vehicles_org_idx. userId reste NOT NULL. Aucun effet sur véhicules existants (tous NULL=perso).
- Schéma : vehicles.organizationId (réf paresseuse organizations, onDelete set null).
- Service : listVehicles filtré perso (isNull org) ; +listPersonalVehicles, listOrganizationVehicles, listAccessibleVehicles (garage unifié), guards assertCanRead/Manage/CreateOrganizationVehicle, saveOrganizationVehicle, deleteOrganizationVehicle.
- Routes : vehicle.listAccessible / saveOrganization / deleteOrganization (list/save/delete perso INCHANGÉES). Erreurs mappées TRPCError.
- ConstatFlow : sélecteur → listAccessible (perso + org), badge scope (Personnel/🏢 org), sélection véhicule d'org préremplit + SKIP OCR (même mapping), analytics scope-aware (source=organization_garage + fleet_vehicle_selected_for_constat).
- AccountPage : section « Véhicules d'entreprise » conditionnelle (membres only) ; gestion add/edit/delete pour owner/fleet_admin (saveOrganization/deleteOrganization), lecture pour driver. Chemin perso strictement inchangé.
- Analytics : VEHICLE_SOURCES + organization_garage ; events fleet_vehicle_added / fleet_vehicle_selected_for_constat câblés (props scope, sans PII).
- Tests : fleetVehicles.test.ts (11) — mapping pur, guards lecture/gestion, garage unifié. analytics.test.ts MAJ. Total 109→120.
### Hors scope (volontaire) : wallet entreprise, PDF multi-destinataires, dashboard complet, invitation email, import CSV.
### Anti-régression : webhook Stripe / AASA / assetlinks / save+delete perso / garage perso / flow constat B2C — INTACTS. quality:prestore exit 0, 120 tests, A_BLOCKING=0. SW v16->v17.

---

## Sprint Fleet B2B Monetization — Organization Wallet + Credit Routing
**Date** : 2026-05-29
### Livré
- Migration Block 16 (additif) : credit_wallets + wallet_transactions + sessions.billing_organization_id nullable. users.credits NON migré.
- wallet.service.ts : getOrCreate/getBalance/addOrganizationCredits/consumeOrganizationCredit (idempotent session, jamais négatif), canUseOrganizationWallet (owner/fleet_admin/driver), setConstatBillingOrganization, resolveBillingSourceForConstat, consumeCreditForConstat (routage).
- Routes : payment.attachConstatBilling, consumeForConstat, organizationWallet, myOrganizationWallets. payment.useCredit + webhook Stripe INCHANGÉS.
- ConstatFlow : véhicule d'org → attachConstatBilling. PDFDownload : consommation routée (consumeForConstat) ; message "Crédits entreprise insuffisants".
- AccountPage : solde crédits entreprise par org (lecture) + bouton achat placeholder. Analytics fleet_wallet_viewed/used + events monetization.
- Tests : walletBilling.test.ts (13). Total 120→133.
### Règle routage NON bloquante : org si billingOrg + membre consommateur + wallet>0, sinon perso. Tant qu'aucun achat org (placeholder) → fallback perso transparent.
### Anti-régression : webhook Stripe / stripe.service.useCredit / crédits perso / paiement / AASA / assetlinks / garage / flow — INTACTS. quality:prestore exit 0, 133 tests, A_BLOCKING=0. SW v17->v18.
### Reste : achat réel crédits org (Checkout metadata → addOrganizationCredits, webhook inchangé), dashboard finance, PDF multi-destinataires.

---

## Sprint Fleet B2B Monetization Part 2 — Organization Credit Purchase (Stripe)
**Date** : 2026-05-29
### Livré
- payment.createOrgCheckout (owner/fleet_admin) → Stripe Checkout, metadata.kind='org_credits' + organizationId + actorUserId. Réutilise PACKAGES/getPrice. payments en pending (userEmail=acteur).
- Webhook checkout.session.completed : BRANCHE org_credits isolée EN TÊTE → creditOrganizationFromPurchase (idempotent par session Stripe via relatedPaymentId) → return. Chemin PERSO byte-identique (95 ajouts, 0 suppression dans stripe.service.ts).
- wallet.service : creditOrganizationFromPurchase (idempotent, montant>0), canManageOrganizationBilling (owner/fleet_admin). myOrganizationWallets expose canManageBilling.
- UI AccountPage : 3 boutons achat (1/3/10) par org pour owner/fleet_admin ; détection retour ?org_credits=success → toast + refetch + analytics fleet_wallet_credit_added.
- AUCUNE migration (réutilise Block 16). Tests : +4 (creditOrganizationFromPurchase succès/idempotent/invalide, canManageOrganizationBilling). Total 133→137.
### Anti-régression : webhook perso (credits-granted/purchase/auto-PDF) + useCredit + crédits perso + AASA/assetlinks INTACTS (diff: 0 ligne supprimée). quality:prestore exit 0, 137 tests, A_BLOCKING=0. SW v18->v19.
### Effet : le wallet org peut être approvisionné → routage org effectif (org débitée en priorité quand solde>0). Monetization bout-en-bout.
### Reste : abonnements/packs récurrents, dashboard finance, PDF multi-destinataires, QA device, relecture juridique facture entreprise.

---

## Sprint Stripe B2B Billing QA — Checkout → Webhook → Wallet Validation
**Date** : 2026-05-29 (QA/validation, pas de feature)
### Livré
- Test automatisé du VRAI webhook : server/src/__tests__/stripeWebhookOrg.test.ts (7) — event org crédite wallet org + chemin perso JAMAIS exécuté (db.transaction non appelé), idempotence (payments paid → skip), event org sans organizationId/credits=0 → refus propre, event perso → chemin perso intact, signature invalide → throw, createOrgCheckout metadata + success_url.
- docs/stripe-b2b-billing-test-plan.md : procédure pas-à-pas mode test (carte 4242, rejeu event idempotence, non-régression perso, erreurs, rollback, logs, variables Stripe test vs live).
- scripts/verify-org-wallet.mjs : inspection LECTURE SEULE (DATABASE_URL env, aucun secret) → solde wallet org + transactions + détection double crédit.
- Audit : route webhook = POST /webhook/stripe ; prod = clés LIVE → test réel à faire en MODE TEST séparé. analytics fleet_wallet_credit_added consentement-gaté.
### Aucun bug trouvé. Aucune modification du webhook perso (code runtime inchangé ce sprint). Aucune migration. quality:prestore à valider.
### RESTE : exécuter l'aller-retour Stripe réel en mode test (Olivier, hors sandbox) avant vente B2B / stores.

---

## Sprint Stripe B2B Test Execution — Real Test Mode (2026-06-01)
### Exécuté RÉELLEMENT (moitié serveur de la boucle)
- Postgres 16 local + vrai handleStripeWebhook + vraie signature Stripe (generateTestHeaderString) + runMigrations + rejeu.
- Test : server/src/__tests__/stripeWebhookOrg.integration.test.ts (3, gardé RUN_DB_IT=1 → skipped en CI).
- PROUVÉ : wallet org crédité (balanceAfter=10), 1 txn purchase, payments paid ; REJEU → skip + solde inchangé + 1 seule txn (idempotence réelle) ; event perso → users.credits=1 sans txn wallet (perso intact) ; signature invalide rejetée.
- Script scripts/verify-org-wallet.mjs réécrit en postgres.js (dépendance projet), testé lecture seule contre la vraie base.
- quality:prestore exit 0 : 144 passés + 3 skipped (intégration), A_BLOCKING=0. Aucun code runtime modifié (test+script+docs).
### RESTE (hors sandbox) : Checkout HÉBERGÉ Stripe + livraison webhook réelle en mode test (clés sk_test/whsec test) — config, à valider par Olivier avant vente B2B / stores.
### Aucun bug trouvé. Webhook live non touché.

---

## Sprint Stripe CLI E2E Runbook — Hosted Checkout + Real Delivery (2026-06-01)
### Livré (docs + outillage, aucune feature, aucun code runtime)
- docs/stripe-cli-e2e-b2b-runbook.md : runbook pas-à-pas pour Olivier — prérequis, Mode A (local + Stripe CLI `stripe listen --forward-to localhost:3000/webhook/stripe`), Mode B (staging Railway), commandes exactes, paiement carte 4242, vérifs DB/Dashboard/UI, idempotence réelle (`stripe events resend`), non-régression perso, checklist 12 points PASS/FAIL, dépannage, rollback.
- scripts/stripe-b2b-e2e-checklist.mjs : vérif E2E LECTURE SEULE (postgres.js, sans secret) — wallet, idempotence (doublon related_payment_id), txn purchase unique/montant, payment paid ; PASS/FAIL + exit code. Testé OK contre base réelle.
- Note clé : `stripe trigger` ne porte PAS metadata.kind=org_credits → le test org DOIT passer par le vrai createOrgCheckout (bouton UI) puis rejeu de CET event.
### Reste (Olivier, hors sandbox) : exécuter le runbook avec sk_test + carte 4242 + livraison webhook Stripe réelle → Billing Confidence 89 → 95.

---

## Stripe B2B — Quick Execution Checklist (2026-06-01)
- docs/stripe-b2b-quick-execution-checklist.md : version courte "copier-coller" du runbook (clés test, stripe listen :3000, npm run dev, owner/org test, achat 4242, vérifs, scripts verify/checklist, rejeu resend, non-régression perso, checklist 12/12 → 95/100).
- Aucune feature, aucun code runtime modifié. Docs uniquement.

---

## Sprint Fleet Finance Dashboard — Wallet Visibility + Transactions History (2026-06-01)
### Livré (lecture seule, aucun impact paiement)
- Guards : canViewOrganizationWallet/Transactions/Export = owner/fleet_admin (driver + viewers exclus).
- Service : getOrganizationWalletView + listOrganizationTransactions (DTO anti-PII : IDs session/payment tronqués, createdByUserId NON exposé, pagination cursor createdAt).
- Routes : payment.getOrganizationWallet + listOrganizationTransactions (protégées, lecture seule). useCredit/webhook/createOrgCheckout INCHANGÉS.
- UI : OrgFinancePanel (AccountPage) — badge statut (disponibles/bas/aucun), historique paginé "Voir plus", export CSV client (depuis DTO sanitisé), états vides ; owner/fleet_admin only.
- Analytics : fleet_wallet_transactions_viewed/export_clicked/low_balance_seen/empty_seen (sans PII).
- Tests : fleetFinance.test.ts (8). Total 144→152.
### Anti-régression : stripe.service NON modifié (0 ligne), AASA/assetlinks intacts, garage/véhicules/wallet/flux constat intacts. quality:prestore exit 0, 152 tests + 3 skipped, A_BLOCKING=0. SW v19->v20.
### Export = Option A (client-side, sans risque serveur). Visibilité prête indépendamment du test Stripe E2E 12/12.

---

## Sprint Fleet B2B Onboarding — createOrganization transactionnel + invitations email (2026-06-01)
### Livré
- createOrganization ATOMIQUE (db.transaction : org + membership owner) → plus d'org orpheline.
- Table organization_invites (Block 17, additif) : tokenHash sha256 (token brut JAMAIS stocké/loggé/renvoyé), status pending/accepted/revoked/expired, TTL 7j, expiration.
- Service : inviteMember (owner/fleet_admin, rôles driver/fleet_admin, révoque pending existant), listInvites (sans tokenHash), revokeInvite (admin + appartenance), acceptInvite (email connecté == email invité, expiration, déjà-accepté no-op, membership transactionnel).
- Routes : organization.inviteMember/listInvites/revokeInvite/acceptInvite. Email Resend sendOrganizationInvite (sujet flotte, lien 7j, sans claim).
- Client : App.tsx détecte ?invite= (accepte si connecté, sinon login puis acceptation post-login). AccountPage OrgMembersPanel (membres + invitation + révocation, owner/fleet_admin).
- Analytics : organization_member_invite_started/invited/invite_accepted/revoked/failed (sans PII).
- Tests : fleetOnboarding.test.ts (15) + fleetOnboarding.integration.test.ts (4, RUN_DB_IT, rollback réel + token non stocké prouvés). Total 152→167.
### Anti-régression : stripe.service 0 ligne, AASA/assetlinks/webhook intacts, B2C/garage/finance intacts. quality:prestore exit 0, 167 tests + 7 skipped, A_BLOCKING=0. SW v20->v21. Block 17 migré.

---

## Sprint Fleet B2B Member Management — Role Changes + Removal + Invite Resend (2026-06-01)
### Livré
- Backend audité : updateMemberRole / removeMember / leaveOrganization déjà corrects (guards canAssignRole/canRemoveRole + protection DERNIER owner sur démotion/retrait/départ). NOUVEAU : resendInvite (Option A : nouveau token, prolonge +7j, pending only, ré-émet email, token jamais exposé) + AuditEvent org.invite_resent + route.
- UI OrgMembersPanel : actorRole (listMine) → select rôle driver↔fleet_admin + bouton Retirer (confirm), masqués si interdit/dernier owner ; invitations pending → Renvoyer + Révoquer ; messages clairs.
- Analytics : member_role_update_started/updated, member_removed, invite_resent, member_action_failed (sans PII).
- Email QA : lien texte brut déjà sous le bouton (comme magic link), wording sans claim, token jamais loggé. Test réel délivrabilité à faire.
- Tests : fleetMemberMgmt.test.ts (13). Total 167→180.
### Anti-régression : stripe.service 0 ligne, AASA/assetlinks/webhook intacts, B2C/garage/finance/invitations intacts. quality:prestore exit 0, 180 tests + 7 skipped, A_BLOCKING=0. SW v21->v22.

---

## Sprint Store Readiness Final Push (2026-06-01)
### Livré (docs + config CI, AUCUN runtime/natif modifié)
- codemagic.yaml (racine) : workflows android-internal (AAB → Google Internal Testing) + ios-testflight (IPA → TestFlight), quality gate bloquant, secrets via env Codemagic (aucun en clair), pas de soumission App Store auto. YAML validé.
- .gitignore durci : *.keystore/*.jks/*.p8/*.p12/keystore.properties/*service-account*.json.
- Docs : codemagic-store-build-runbook, codemagic-yaml-proposal, mobile-permissions-review (ancré manifest/plist réels), app-store-privacy-final, google-play-data-safety-final, store-reviewer-account-final, device-qa-master-checklist (P0-P3), store-assets-final-review, legal-store-final-checklist, store-readiness-7-day-execution-plan.
### Audit natif (réel) : Android applicationId contact.boom.app, versionCode 1, versionName 1.0.0, minSdk 23/target 35, signing via env, App Links autoVerify ✅. iOS bundle contact.boom.app, MARKETING_VERSION 1.0.0, 4 UsageDescription OK, Associated Domains ✅. Team ID 7YWB99G6Q8. Icônes présentes.
### Bloquants identifiés : codemagic.yaml (réglé), screenshots définitifs FR/EN/DE/IT + feature graphic (P1), bouton suppression compte + consentement analytics à confirmer device (P0), validation juriste (P0 public).
### quality:prestore exit 0, 180 tests + 7 skipped, A_BLOCKING=0. Aucun runtime/natif/webhook touché. SW inchangé (v22).

---

## Sprint Store Execution Day 1 (2026-06-01)
### Fait (assistant)
- AUDIT Codemagic : bug réel trouvé — `codemagic.yaml` passait des `-P` Gradle alors que `android/app/build.gradle` lit des VARIABLES D'ENV (System.getenv). Sans correctif → fail-fast signature → build KO.
- CORRECTIF : build Android utilise désormais env vars (KEYSTORE_PASSWORD/KEY_PASSWORD/KEY_ALIAS lus par gradle) + KEYSTORE_FILE exporté depuis CM_KEYSTORE (base64). YAML re-validé. En-tête yaml clarifié (noms EXACTS, pas de préfixe CM_ sur les 3 secrets gradle).
- Runbook MAJ : étapes manuelles exactes A–F (keytool + base64, groupes Codemagic android_signing/google_play, clé ASC boom_contact_asc_key, lancement workflows, vérifs).
- quality:prestore exit 0, 180 tests, A_BLOCKING=0.
### Bloqué (action Olivier — accès externes requis, l'assistant ne peut pas les faire)
- Générer le keystore + le stocker en sûreté (jamais commité).
- Créer les secrets Codemagic (android_signing + google_play) + clé App Store Connect API.
- Connecter le repo à Codemagic + lancer android-internal et ios-testflight.
- AAB → Google Internal Testing ; IPA → TestFlight.
### Aucun runtime/natif/webhook modifié. AASA/assetlinks intacts. Pas de secret/keystore dans Git.

---

## Android Internal Testing ACTIF (2026-06-01)
- boom.contact en **test interne Google Play** — version **1.0.0** / versionCode **1**, canal Tests internes, statut **Actif**.
- Lien : https://play.google.com/apps/internaltest/4701728878089201088
- Pipeline Codemagic résolu de bout en bout : Node 22 → JDK 21 → doublons Kotlin (stdlib 1.8.22) → AAB signé.
- Docs QA : android-internal-tester-instructions.md (lien réel + parcours), android-internal-feedback-template.md, android-internal-qa-report.md (triage P0/P1/P2/P3 + GO/NO-GO).
- **Prochaine étape : QA device** (récent + milieu de gamme + Android 8/9 ancien). Bump versionCode + quality:prestore obligatoires avant tout build correctif.
- iOS/TestFlight : pipeline prêt, en attente clé ASC + lancement.

---

## Migration Jelastic — Phase J-2 EXÉCUTÉE (2026-06-07, GO Olivier)
- **Image GHCR** : `ghcr.io/o-n-2950/boom-contact:latest` construite par GitHub Actions (workflow `deploy-jelastic.yml`, manuel, input deploy=false) — même Dockerfile que Railway, parité canvas/Chromium.
- **Env Jelastic créé** : `boom-contact-prod` → `boom-contact-prod.jcloud-ver-jpc.ik-server.com` (DC suisse, même que swissrh-prod). Topologie : bl nginx + cp Docker (2-12 cloudlets) + sqldb postgres16 (1-6).
- **DB** : rôle `boom` + base `boom_contact` provisionnés ; connexion réseau interne validée ; **16 tables créées automatiquement par runMigrations au boot**.
- **27 vars d'env** posées sur cp (copie Railway sans RAILWAY_*, CLIENT_URL=https://www.boom.contact, DATABASE_URL interne Jelastic).
- **Smoke tests** : `/health` 200 · `/api/monitor/health` → `database:{ok:true}, stripe:{ok:true}` **identique à Railway** · AASA + assetlinks **identiques octet-à-octet** à Railway ✅.
- **Secrets GitHub** posés (7) : JELASTIC_TOKEN/ENV_NAME/HEALTH_HOST + VITE_*.
- **Prod Railway : AUCUNE modification** (lectures seules).
- **Prochaines étapes** : J-1 = dump/restore à blanc (⚠️ nécessite activation du TCP proxy public sur le service PostgreSQL Railway — accord Olivier requis) + 2e endpoint webhook Stripe vers Jelastic. J0 = dump final + bascule DNS (TTL 300s la veille) + SSL Let's Encrypt. J+7 = coupure Railway.

## Migration Jelastic — Phase J-1 EXÉCUTÉE (2026-06-08, « OK proxy »)
- **TCP proxy Railway activé** sur le service PostgreSQL (`acela.proxy.rlwy.net:16304`) — unique modification Railway, réversible, à supprimer après J0.
- ⚠️ Constat : le Postgres Railway n'a pas SSL → dump via proxy en clair (standard Railway). Risque accepté et minimisé : fenêtre de quelques secondes, base early-stage, flux direct Railway→nœud sqldb Jelastic (aucun tiers), dump supprimé après restore.
- **Dump/restore exécuté SUR le nœud sqldb Jelastic** : dump 3.2 MB, restore 0 erreur.
- **Parité données prouvée par count(*) exacts** : sessions 254/254 · users 6/6 · payments 10/10 · credit_txns 4/4 · vehicles 2/2 · audit_log 12/12 · organizations 0/0. (n_live_tup s'était révélé non fiable côté source — stats collector remis à zéro.)
- **Post-restore** : cp redémarré, `/health` 200, `database:{ok:true}`, landing//privacy//cgu/assetlinks 200.
- **boom-contact-prod (Suisse) = copie fonctionnelle de la prod avec données réelles.**
- Reste avant J0 : QA device Olivier sur le domaine technique · 2e endpoint webhook Stripe (confirmation Olivier) · TTL DNS 300s la veille · à J0 : dump final delta + bascule DNS + SSL Let's Encrypt.
