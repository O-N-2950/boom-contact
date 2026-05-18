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

