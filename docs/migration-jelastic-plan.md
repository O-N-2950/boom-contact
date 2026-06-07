# Migration Railway → Infomaniak Jelastic (datacenter Suisse) — Dossier complet

> Audit par preuves (fichier:ligne). Référence : topologie Jelastic réelle lue via l'API
> (compte Infomaniak) + modèle kombo-api. **Rien n'a été modifié en prod Railway.**

## 1. AUDIT DE MIGRATION

### 1.1 Services Railway utilisés
| Service | Preuve | Verdict |
|---|---|---|
| 1 service web unique (HTTP+WebSocket) | `server/src/index.ts:28,44,1100` — Express + Socket.io sur le MÊME httpServer, un seul port | Simple : 1 nœud applicatif |
| PostgreSQL managé Railway | `server/src/db/index.ts:5-9` — `DATABASE_URL` obligatoire, client postgres.js | À migrer vers postgres16 Jelastic |
| Workers/cron séparés : AUCUN | `server/src/index.ts:823,1055,1079` — crons in-process via `setInterval` (expiry sessions, etc.) | Rien à provisionner |
| Volumes/disque : AUCUN | `server/src/db/schema.ts:194` (base64), `:36-49` (jsonb) — photos/signatures/preuves stockées EN BASE ; PDF générés à la volée | Dump DB = 100% des données |
| Build | `railway.toml:2-3` — builder **dockerfile** (`nixpacks.toml` présent mais INUTILISÉ) | L'image Docker est la vérité |
| Healthcheck/restart Railway | `railway.toml:6-9` — `/health`, on_failure ×5 | À reproduire (Docker HEALTHCHECK existe déjà : `Dockerfile:77-78`) |

### 1.2 Variables d'environnement requises
Source : `.env.example:1-77`. Obligatoires au boot : `DATABASE_URL` (db/index.ts:5-6), `JWT_SECRET`, `PORT` (index.ts:1051, défaut 3000).
Fonctionnelles : `ANTHROPIC_API_KEY` (OCR), `OPENAI_API_KEY` (voix), `RESEND_API_KEY` (email), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `CLIENT_URL`, `ADMIN_*`, `WINWIN_*`, `TWILIO_*`, `GOOGLE_MAPS_API_KEY`, `SENTRY_DSN_BACKEND`, `POSTHOG_*`, `PUPPETEER_EXECUTABLE_PATH` (.env.example:60).
Build-time client : `VITE_*` (Dockerfile:28-35 — args inlinés par Vite au build).
**Dépendance Railway unique dans le runtime** : `RAILWAY_PUBLIC_DOMAIN` en **fallback** de `CLIENT_URL` (`server/src/services/stripe.service.ts:10`). → Sur Jelastic, définir `CLIENT_URL=https://www.boom.contact` et cette dépendance disparaît. Aucun autre usage runtime (le reste = tests).

### 1.3 Compatibilité build Vite+TS sur Jelastic Node.js
- Build = `npm run build` → `vite build` + `node build-server.mjs` (package.json scripts) ; start = `node dist/server/index.js` (package.json + Dockerfile:82). Pur Node, aucun service propriétaire.
- Nœuds Jelastic dispo : **nodejs22-npm** (prouvé : kombo-api, placio, devispro, swissrh-prod). Node 22 ≥ Node 20.19 du Dockerfile ; le repo build déjà sous Node 22 sur Codemagic. **Compatible.**
- ⚠️ Deux dépendances NATIVES : `canvas` (Cairo — Dockerfile:11-15 builder, :46-49 runtime) et **Chromium pour Puppeteer** (Dockerfile:51-52, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`, rendu croquis). Sur un nœud Node.js nu, il faudrait installer Cairo+Chromium dans le conteneur Jelastic (fragile aux redeploys). **→ Recommandation : nœud Docker custom avec NOTRE image existante** (parité totale, zéro réécriture).

### 1.4 Dépendances Railway à adapter
| Élément | Preuve | Adaptation |
|---|---|---|
| `railway.toml` healthcheck/restart | railway.toml:6-9 | Docker HEALTHCHECK déjà dans l'image (Dockerfile:77-78) + restart policy du nœud Jelastic |
| `RAILWAY_PUBLIC_DOMAIN` fallback | stripe.service.ts:10 | Définir `CLIENT_URL` (déjà prévu .env.example:13) |
| `trust proxy` derrière LB | index.ts:27 (`app.set('trust proxy', 1)`) | Déjà prêt pour le LB nginx Jelastic ✅ |
| `.well-known` AASA/assetlinks servis par Node | index.ts:641-648 (AVANT static) | Aucun changement — le LB doit juste proxifier tel quel |
| WebSockets (Socket.io) | index.ts:44 | LB nginx Jelastic : support Upgrade natif ✅ |

### 1.5 PostgreSQL
- Cible : **postgres16 Jelastic** (pattern prouvé sur les 7 envs du compte). Drizzle = `driver: 'pg'` + `connectionString` (drizzle.config.ts:3-9) → simple changement de `DATABASE_URL`.
- Schéma : `runMigrations()` au boot (`server/src/index.ts:14,1096`) crée/complète les tables (blocks additifs) → la cible se structure seule ; le dump/restore apporte les données.

### 1.6 Assets statiques
Servis par Node/Express : `index.ts:668` (`dist/client`), `:725` (`/assets` avec cache), `:754` (static global). **Garder tel quel** (simplicité, SW/PWA déjà calibrés). CDN Infomaniak = optimisation future optionnelle, PAS un prérequis.

## 2. PLAN DE MIGRATION (zéro-downtime)

### Topologie cible (alignée sur swissrh-prod, prouvée)
```
ENV jelastic : boom-contact-prod (région Infomaniak CH)
├── bl    : nginx load balancer  (SSL, websockets, IP publique)
├── cp    : Docker custom — image ghcr.io/o-n-2950/boom-contact:<tag>  (2-12 cloudlets)
└── sqldb : postgres16  (2-8 cloudlets)
```
(Option B sans Docker : cp nodejs22-npm + installation Cairo/Chromium — déconseillée, voir 1.3.)

### Étapes
1. **J-2 — Préparer l'image** : activer le workflow GitHub Actions (fichier §3.2) → image sur GHCR. Aucune incidence Railway.
2. **J-2 — Créer l'env Jelastic** `boom-contact-prod` (topologie ci-dessus), région Suisse.
3. **J-2 — Variables d'env** sur le nœud cp (liste §1.2 ; `CLIENT_URL=https://www.boom.contact`, `DATABASE_URL` pointant le sqldb interne, `PORT=3000`). Secrets saisis dans la console Jelastic, jamais committés.
4. **J-1 — Restore à blanc** : dump Railway → restore Jelastic (script §3.3) → démarrer le cp → smoke tests checklist §4 sur le domaine technique `boom-contact-prod.jcloud.ik-server.com`.
5. **J-1 — Stripe** : créer un SECOND endpoint webhook (mode test puis live) vers le domaine Jelastic → noter le nouveau `STRIPE_WEBHOOK_SECRET` Jelastic. (Deux endpoints coexistent sans conflit ; idempotence déjà en place.)
6. **J0 — Gel court (~15 min, heure creuse)** :
   a. Activer la page « maintenance 2 min » OU accepter une micro-fenêtre (l'app est offline-first : les constats en cours se resynchronisent — SW/IndexedDB).
   b. Dump final Railway → restore Jelastic (delta complet, script §3.3).
   c. **DNS** : `www.boom.contact` + `boom.contact` → CNAME/A vers le LB Jelastic (TTL abaissé à 300 s la veille).
   d. Vérifier checklist §4 sur le domaine réel ; SSL Let's Encrypt via add-on Jelastic.
7. **J0+1h — Bascule des webhooks** : désactiver l'endpoint Stripe Railway ; Resend inchangé (API sortante).
8. **J0 → J+7 — Période de double-run** : Railway reste allumé en lecture (rollback chaud) mais ne reçoit plus de trafic. **Ne PAS couper Railway avant J+7.**
9. **J+7** : snapshot final Railway (archive), puis arrêt du service Railway.

### Rollback (si échec à J0)
- DNS re-pointé vers Railway (TTL 300 s → effet < 5 min).
- Réactiver l'endpoint webhook Stripe Railway.
- Les écritures faites sur Jelastic pendant la fenêtre : exporter le delta (sessions créées depuis J0, `created_at >`) et rejouer sur Railway si nécessaire.
- Condition de déclenchement : tout échec de la checklist §4 non corrigé en 30 min.

## 3. FICHIERS (avant → après)
- **Dockerfile : AUCUN changement requis** (preuve de portabilité §1.3-1.4). L'image actuelle tourne telle quelle dans un nœud Docker Jelastic.
- `.github/workflows/deploy-jelastic.yml.disabled` : NOUVEAU (CI/CD ; activé en retirant `.disabled`).
- `scripts/migrate-db-railway-to-jelastic.sh` : NOUVEAU (dump/restore sans secrets).
- `.env.example` : commentaire CLIENT_URL (diff minime, voir Git).
Contenus complets : voir les fichiers committés.

## 4. CHECKLIST DE VALIDATION POST-MIGRATION (avant coupure Railway)
- [ ] `GET /health` → 200 `db:true` (index.ts:446)
- [ ] `GET /.well-known/apple-app-site-association` ET `assetlinks.json` → 200, contenu identique octet-à-octet à Railway (index.ts:641-648) — **CRITIQUE app mobile**
- [ ] Signup magic link → email Resend reçu → login OK
- [ ] Création constat complet (2 navigateurs, QR join) → signature → PDF généré (Puppeteer/canvas dans l'image !) → email reçu
- [ ] **Croquis/carte** rendu dans le PDF (preuve Chromium fonctionne)
- [ ] Achat crédits Stripe test → webhook Jelastic reçu → crédits livrés (idempotence)
- [ ] Suppression de compte → données purgées
- [ ] WebSocket : session temps réel A↔B (Socket.io à travers le LB)
- [ ] App Android Internal Testing pointée sur www.boom.contact → tous les endpoints répondent après bascule DNS (aucun changement app requis : domaine identique)
- [ ] `SELECT count(*)` des tables principales = compte Railway au moment du dump final

## 5. POINTS DE VIGILANCE
- **Souveraineté** : toutes les données vivent dans PostgreSQL (preuve §1.1) → DB Jelastic CH = 100% des données en Suisse. PDF générés à la volée (non persistés sur disque). ⚠️ Les emails transitent par Resend (AWS eu-west-1, `MX_resend`) et l'OCR par l'API Anthropic (US) : à documenter dans le registre de traitement — la migration ne change PAS ces flux.
- **Secrets** : tous saisis dans la console Jelastic / GitHub Secrets. Aucun secret dans les fichiers committés (le workflow référence `secrets.*`).
- **SSL** : add-on Let's Encrypt Jelastic sur le LB (auto-renouvellement). Le temps de la bascule, le certificat doit être émis APRÈS le pointage DNS (ou utiliser le SSL Infomaniak intégré).
- **DNS boom.contact** : actuellement vers Railway. Abaisser le TTL à 300 s la VEILLE de J0. Adapter chez le registrar (Infomaniak — domaine déjà chez eux : `DKIM_resend`/`MX_resend` configurés là).
- **AASA/assetlinks** : servis par le code (index.ts:641-648), inchangés — règle absolue respectée.
- **Stripe webhook** : nouveau secret côté Jelastic (endpoint différent) — seul changement, prévu §2.5/2.7 ; le code webhook lui-même n'est PAS touché.
