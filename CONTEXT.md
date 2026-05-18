# boom.contact — CONTEXT.md

> Dernière mise à jour : 18 mai 2026 — **Session 16b (Voie B retenue)**

---

## 🎯 SESSION 16b — DÉCISION : VOIE B (multi-véhicules complet A→E)

Révision de la décision Session 16 : on NE bride PAS l'UI à 2 véhicules.
**Voie B implémentée intégralement** — vrai support 1 à 5 véhicules.

### Modèle de tokens (zéro migration DB — choix de robustesse)
- A/B : tokens aléatoires stockés (inchangé, aucune régression).
- **C/D/E : tokens dérivés HMAC-SHA256(`JWT_SECRET`, "sessionId:role")**
  → individuels (plus de partage du tokenB), non devinables, recalculables
  serveur pour vérification, AUCUNE colonne DB ajoutée.
- Route `session.participantTokens` (gardée tokenA) fournit les tokens
  B/C/D/E au créateur pour générer les QR individualisés.

### Persistance
- `updateParticipant(role A-E)` écrit dans `participant{role}` (B4 résolu
  à la racine : C/D/E n'écrasent plus participantB).
- `joinSession` role-aware ; `signSession` déjà multi-participants.

### PDF
- A/B : rendu **strictement inchangé** (byte-identique).
- C/D/E : **page annexe additive** single-column (véhicule, conducteur,
  assurance, circonstances, signature). `forRole` A-E.

### Variables d'environnement (optionnelles)
- `GOOGLE_REVIEW_URL` (M4) — bloc avis masqué si absente.
- `VITE_RELEASE` / `VITE_APP_VERSION` (M10) — release Sentry mobile.

### État build (vérifié fin de session)
TS **0 erreur** · build client **OK** · build serveur **OK** ·
tests **45/45 OK** (+1 régression Voie B `deriveParticipantToken`).

### Limites assumées (honnêteté — TODO.md)
- B1 : code OK + build vert, mais test **runtime natif** (device + signature)
  non fait ici (hors sandbox).
- Croquis visuel reste A/B (données C/D/E présentes en page annexe PDF).
- M2 (claims légaux) : décision **juridique**, non tranchée seul.

---

# boom.contact — CONTEXT.md

> Dernière mise à jour : 18 mai 2026 — **Session 16 (Audit PREMIUM pré-stores + corrections)**

---

## 🎯 SESSION 16 — Audit consolidé + corrections bloquants stores

**Objectif :** audit expert pré-publication App Store / Google Play, puis
corriger les bloquants. Deux audits (Claude + ChatGPT) confrontés et
**vérifiés dans le code réel** (clone intégral, tsc, build, tests, prod live).

**Décision produit : VOIE A** — V1 maîtrisée à **2 véhicules** (cas piéton /
vélo / solo / fuite / refus / blessé conservés). Le refactor multi-véhicules
A–E (Voie B) est reporté en v1.1/2.0.

### État build (vérifié en fin de session)
- TypeScript : **0 erreur** (le repo livrait 1 erreur TS avant — résolue)
- Build client (`vite build`) : **OK**
- Build serveur (`build:server`) : **OK**
- Tests (`vitest run`) : **44/44 OK**

### Décisions d'architecture verrouillées
- **B1** (bloqueur store n°1) : base URL API absolue
  (`https://www.boom.contact`) UNIQUEMENT en natif Capacitor via
  `client/src/apiBase.ts`. Sur web → `''` (relatif, same-origin) →
  comportement strictement inchangé, zéro régression web possible.
  Origines natives ajoutées au CORS serveur (`capacitor://localhost`,
  `https://localhost`).
- **B4 / Voie A** : `MAX_VEHICLES = 2` (`QRSession.tsx`). Chemins C/D/E
  conservés dans le code mais injoignables via l'UI (le serveur
  `updateParticipant` n'écrit fiablement que A/B). Réactivation = Voie B.
- **H2** : nouvelle procédure serveur `session.fillAbsentPedestrian`
  (auth tokenA + garde anti-écrasement d'un vrai B) — constat unilatéral
  piéton sans téléphone.
- **H4** : suppression de compte = DELETE constats/PII (sessions, véhicules,
  tokens) + ANONYMISATION (non suppression) des écritures financières
  (paiements, crédits) pour rétention fiscale (~10 ans).
  Email → `deleted-<sha256(16)>@anonymized.invalid`.
- **M4** : URL avis Google via `process.env.GOOGLE_REVIEW_URL` (bloc masqué
  si absente — plus de lien 404 en prod).
- **M12** : `vitest.config.ts` rendu portable (plus de chemin `/root` en
  dur) → CI robuste.

### Nouvelle variable d'environnement (optionnelle)
- `GOOGLE_REVIEW_URL` — si absente : bloc avis Google non rendu (aucun
  impact fonctionnel). À renseigner quand la fiche Google Business est prête.

### Limites assumées (honnêteté — voir TODO.md)
- B1 : code corrigé et build vert, mais **validation runtime native**
  (IPA/AAB signés + test appareil iOS/Android réel) NON faite ici
  (nécessite Xcode/Android Studio + certificats). À faire avant soumission.
- M2 (claims « légalement valable / 46 pays ») : **décision juridique** —
  non modifié unilatéralement, à valider avec un juriste.

---

# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude (Token_Railway_boom.contact, Key_Anthropic_, etc.)

> Dernière mise à jour : 11 Avril 2026 — Session 15

---

## Identifiants critiques

| Ressource | Valeur |
|---|---|
| **GitHub repo** | O-N-2950/boom-contact |
| **Railway PROJECT_ID** | e0085774-c08f-48d0-8183-b6fe11c816cd |
| **Railway SERVICE_ID** | 4c024cbf-fb0a-4652-85bc-8c7cdedf62e2 |
| **Railway ENV_ID** | e0247449-5574-4959-974e-c4b636da7419 |
| **URL prod** | https://www.boom.contact |
| **Entité légale** | PEP's Swiss SA / Groupe NEUKOMM |
| **Railway TOKEN** | voir projet Claude `Token_Railway_boom.contact` |
| **GitHub TOKEN** | ghp_****_voir_projet_Claude_github_skill |
| **Anthropic API KEY** | voir projet Claude `Key_Anthropic_` |
| **OpenAI API KEY** | voir projet Claude `Open_ai_key_pour_reconnaissance_vocales` (Whisper-1) |

---

## Compte admin boom.contact

| | |
|---|---|
| **Email** | contact@boom.contact |
| **Password** | (set via ADMIN_PASSWORD env var — never hardcode) |
| **Role** | admin |
| **Credits** | 999999 (∞) |
| **Accès dashboard** | https://www.boom.contact/?admin=true |

---

## Règles absolues (non négociables)

1. **Toujours vérifier les logs Railway AVANT et APRÈS tout push** — `deployments(first:1)` + `buildLogs`
2. **Vérifier le bundle prod** après chaque déploiement SUCCESS (health + routes SEO)
3. **Railway API** : User-Agent `railway-cli/3.0.0` requis pour contourner Cloudflare
4. **NE PAS écrire "Groupe NEO"** — toujours `Groupe NEUKOMM` / `PEP's Swiss SA`
5. **tRPC format** : input direct sans wrapper `{"json":...}` → `?input={"sessionId":"xxx"}`
6. **Police jamais notifiée automatiquement**
7. **Valider la syntaxe TSX avant push** — pas d'itération en prod sur des erreurs de syntaxe
8. **Tutoiement partout** sur les réseaux sociaux et dans les textes marketing
9. **SEO SPA** : robots.txt + sitemap.xml = routes Express AVANT express.static (jamais fichiers dans /public)
10. **Schema imports** : toujours importer les tables directement `{ sessions }` depuis `'../db/schema.js'` — pas `{ schema }` qui n'existe pas comme named export
11. **Zod 3.25** : nécessite `"customConditions": ["@zod/source"]` dans tsconfig.json et alias dans vitest.config.ts
12. **0 erreurs TypeScript, 44/44 tests** : vérifier avant chaque commit

---

## Stack technique

| Composant | Détail |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS v4 + i18n 50 langues |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL (Drizzle ORM) — sessions, participants, signatures, users, payments, credit_txns, vehicles, magic_tokens, police_stations, police_users, police_annotations, police_corrections, social_posts |
| OCR | Claude Vision (Anthropic Sonnet) — 50+ langues |
| Analyse accident | Claude Sonnet — transcript vocal → scénario structuré |
| Transcription vocale | OpenAI Whisper-1 — 99 langues, $0.006/min |
| PDF | pdf-lib server-side — bilingue, polices Noto Sans embarquées (arabe/hébreu RTL) |
| Email | Resend — contact@boom.contact, DKIM actif, domaine vérifié |
| Paiement | Stripe live — CHF/EUR/GBP/AUD/USD/CAD/SGD/JPY, webhook, factures PDF auto |
| Auth | JWT 30j + Magic Links 15min + scrypt passwords |
| Hébergement | Railway Europe West — déploiement auto depuis GitHub |
| Domaine | www.boom.contact — DNS + SSL actifs |
| PWA | Service Worker v5, IndexedDB, Background Sync, offline-first complet |
| Carte | OpenStreetMap (plan) + ESRI World Imagery (satellite) — zoom +/- + pinch |
| Géocodage | Nominatim OSM — fallback si lat/lng absent |
| Horodatage | OpenTimestamps — SHA-256 ancré sur Bitcoin, preuve infalsifiable |
| Marketing | Générateur Claude automatique — cron 7h daily, 4 posts/jour, table social_posts |

---

## Architecture tRPC — Routes disponibles

```
session.create         POST  → { sessionId, qrUrl, status }
session.get            GET   → session complète
session.updateAccident POST  → { ok: true }
session.updateParticipant POST → { ok: true }
session.join           POST  → session active
session.sign           POST  → { ok, bothSigned }
session.history        GET   → sessions par ownerEmail (auth requise)
session.verifyProof    POST  → { valid, sha256, proof } (vérifie PDF vs hash blockchain)
pdf.generate           POST  → { pdfBase64, timestamp }
ocr.scan               POST  → résultat OCR
voice.transcribe       POST  → { transcript }
payment.packages       GET   → 3 packages
payment.createCheckout POST  → { url }
payment.currencies     GET   → grille tarifaire internationale
auth.register          POST  → { id, token }
auth.login             POST  → { token, user }
auth.magicLinkRequest  POST  → { ok }
auth.magicLinkVerify   POST  → { token, user }
auth.me                GET   → user courant (JWT)
auth.grantCredits      POST  → { giftUrl, waUrl } (admin)
auth.claimGift         POST  → { credits }
auth.adminBootstrap    POST  → { ok } (protégé ADMIN_BOOTSTRAP_SECRET)
vehicle.list           GET   → véhicules du compte
vehicle.save           POST  → { id }
vehicle.delete         POST  → { ok }
admin.stats            GET   → dashboard complet (admin)
admin.users            GET   → liste utilisateurs (admin)
emergency.countryLookup GET  → police/ambulance/dépannage par pays (DB + AI)
emergency.insuranceLookup POST → assistance A+B depuis OCR (DB + AI)
emergency.singleLookup POST  → recherche assureur manuel (DB + AI)
police.login           POST  → auth police
police.generateReport  POST  → { pdfBase64 } (multilingue FR/DE/IT/EN)
police.sendReport      POST  → { ok, messageId } (envoi email)
police.correctDriverData POST → { ok, id, correctedFields } (audit trail)
police.getCorrections  GET   → historique corrections
police.*               ...   → module police complet
winwin.createSession   POST  → { sessionId, directUrl }
marketing.posts        GET   → liste posts sociaux (admin)
marketing.generate     POST  → déclenche génération manuelle (admin)
marketing.approve      POST  → approuve un post (admin)
marketing.markPosted   POST  → marque comme publié (admin)
marketing.archive      POST  → archive un post (admin)
```

---

## État des fonctionnalités (11 Avril 2026)

### ✅ En production et fonctionnel

| Fonctionnalité | Notes |
|---|---|
| Scan OCR multi-documents | Permis CH/FR/DE/GB + carte verte + 50 langues |
| Géolocalisation IP → langue | 180+ pays |
| Flow constat complet A+B | SCAN→LIEU→PHOTOS→VOCAL→QR→CROQUIS→INFOS→CHOC→SIGN |
| Session temps réel | Socket.io, QR code |
| Transcription vocale | Whisper-1, 99 langues |
| Analyse IA accident | Claude Sonnet → scénario + responsabilité |
| Signature numérique | Canvas HTML5 |
| Génération PDF | pdf-lib, bilingue, RTL arabe/hébreu, polices Noto Sans |
| Horodatage blockchain | SHA-256 + OpenTimestamps ancré sur Bitcoin |
| Stripe international | 8 devises, factures PDF auto, webhook |
| i18n complète | 50 langues, lazy-loaded, tous composants traduits |
| PWA offline-first | SW v5, IndexedDB mutation queue, Background Sync, replay auto |
| Mode piéton/solo | Bypass QR si pas de 2e conducteur |
| Carte OSM + satellite | MapVehiclePlacer — zoom +/-, pinch, véhicules proportionnels |
| Auth complet | Magic links + password + JWT 30j |
| Garage véhicules | CRUD + OCR scan + assurance par véhicule |
| Admin dashboard | Stats temps réel, revenus, coûts IA |
| Numéros d'urgence | 60+ pays DB + AI fallback mondial |
| Insurance lookup | 100+ assureurs DB + AI fallback mondial |
| PostConstatCTA | Conversion post-constat — 3 modes |
| Cookie banner | RGPD/nLPD compliant (z-index corrigé) |
| Privacy page | Mentions légales + sous-traitants + droits |
| WinWin | directUrl /constat/:id opérationnel |
| Réseaux sociaux | Facebook ✅ TikTok ✅ Instagram ✅ |
| SEO | robots.txt ✅ sitemap.xml ✅ og:image ✅ |
| Générateur marketing | social-generator.service.ts + cron 7h + table social_posts |
| 60 posts réseaux sociaux | Kit Session 14 — 15×TikTok 15×IG 15×FB 15×LI — 4 piliers |
| Police multilingue | Rapport PDF FR/DE/IT/EN + envoi email + audit trail corrections |
| Erreurs utilisateur visibles | Bandeaux rouges sur toutes les mutations critiques |
| Date/heure auto | Pré-rempli avec date/heure actuelle, modifiable |
| Expiration session | Avertissement countdown à 1h45 |
| Accessibilité | aria-invalid, aria-describedby sur champs requis |

### ❌ Pas encore fait

| Fonctionnalité | Priorité |
|---|---|
| API B2B pour assureurs | 🔴 — SDK + API keys + dashboard + doc |
| IA estimation responsabilité (barème IDA/IRSA) | 🔴 — Claude + barème = % responsabilité |
| Intégration dashcam (Tesla, Nexar) | 🟠 — extraction vidéo moment impact |
| Marketplace réparation (garages partenaires) | 🟠 — commission mise en relation |
| police.boom.contact subdomain Railway | 🔴 — pilote Jura |
| Seed des 60 posts Session 14 en DB | 🟠 — script à lancer 1 fois |
| Dashboard marketing admin (UI) | 🟠 — routes tRPC OK, UI manquante |
| LinkedIn Page boom.contact séparée | 🟠 |
| Score cohérence IA (A vs B) | 🟠 |
| 50 silhouettes véhicules niveau 2 | 🟡 |
| Dark mode | 🟡 |
| Champs CEA manquants | 🟠 |

---

## Structure fichiers clés

```
client/src/
  pages/
    ConstatFlow.tsx         — Flow principal conducteur A
    JoinSession.tsx         — Flow conducteur B
    PricingPage.tsx         — Tarifs multi-devises (i18n complet)
    AccountPage.tsx         — Garage + Historique + Profil
    AdminDashboard.tsx      — Dashboard admin
    PrivacyPage.tsx         — Mentions légales RGPD
    PoliceFlow.tsx          — Module police
  components/
    AuthModal.tsx           — Login/register/magic link (i18n)
    CookieBanner.tsx        — RGPD cookie consent (z-index: 50)
    OfflineBanner.tsx       — Indicateur offline + compteur sync
    EmergencyNumbers.tsx    — Urgences mondiales + insurance search
    constat/
      InsuranceAssistance.tsx — Lookup assureur A+B post-constat
      PostConstatCTA.tsx      — CTA conversion (i18n)
      MapVehiclePlacer.tsx    — Carte + zoom + véhicules proportionnels
      OCRScanner.tsx          — Scan documents (i18n)
      VoiceSketchFlow.tsx     — Description vocale (i18n)
      SignaturePad.tsx        — Signature tactile (i18n)
    police/                   — 7 composants police (tous i18n FR+EN)

server/src/
  routes/
    router.ts               — Toutes les routes tRPC (incl. marketing.*, session.verifyProof)
    police.router.ts        — Routes police (multilingue, email, corrections)
  services/
    auth.service.ts
    vehicle.service.ts
    insurance-assistance.service.ts
    emergency-numbers.service.ts
    stripe.service.ts       — Webhook + retry + dedup + timestamping
    session.service.ts
    pdf.service.ts          — PDF bilingue + RTL + badge blockchain
    pdf.police.ts           — Rapport police multilingue FR/DE/IT/EN
    pdf.labels.ts           — Labels bilingues + police labels 4 langues
    timestamp.service.ts    — OpenTimestamps SHA-256 Bitcoin
    ocr.service.ts
    voice.service.ts
    police.service.ts       — Corrections audit trail
    social-generator.service.ts
  services/fonts/           — Noto Sans Regular/Bold + Arabic + Hebrew (TTF)
  db/schema.ts              — 13 tables (+ police_corrections, timestampProof)
```

---

## Variables Railway (prod)

| Variable | Status |
|---|---|
| DATABASE_URL | ✅ |
| ANTHROPIC_API_KEY | ✅ |
| OPENAI_API_KEY | ✅ (Whisper) |
| STRIPE_SECRET_KEY | ✅ |
| STRIPE_PUBLISHABLE_KEY | ✅ |
| STRIPE_WEBHOOK_SECRET | ✅ |
| VITE_STRIPE_PUBLISHABLE_KEY | ✅ |
| RESEND_API_KEY | ✅ |
| JWT_SECRET | ✅ |
| WINWIN_PARTNER_KEY | ✅ |

---

## Monétisation

| Package | CHF | EUR | GBP | AUD | USD | CAD | SGD | JPY |
|---|---|---|---|---|---|---|---|---|
| 1 constat | 4.90 | 4.90 | 3.90 | 7.90 | 4.90 | 6.90 | 6.90 | ¥750 |
| 3 constats ⭐ | 12.90 | 12.90 | 9.90 | 19.90 | 12.90 | 17.90 | 17.90 | ¥1900 |
| 10 constats | 34.90 | 34.90 | 27.90 | 54.90 | 34.90 | 47.90 | 47.90 | ¥5200 |

---

## Réseaux sociaux

| Plateforme | Compte | Status |
|---|---|---|
| Facebook | Page Boom.contact | ✅ Actif |
| TikTok | @boomcontact | ✅ Actif |
| Instagram | @boom.contact | ✅ Actif |
| LinkedIn | Via PEP's Swiss SA | ⚠️ Page séparée à créer depuis ordi |

## Stratégie contenu réseaux sociaux (Session 14)

**4 piliers :**
- A = Douleur/stress (scénarios accidents réels)
- B = Démo produit (comment ça marche)
- C = Éducation (droits, erreurs communes)
- D = Preuve sociale (stats, témoignages)

**Fréquence cible :** 1 post/jour minimum — cron 7h génère 4 posts quotidiens en DB
**Workflow :** pending → approved (admin valide) → posted (admin coche après publication)
**Kit Session 14 :** 60 posts prêts — fichier HTML interactif livré (filtres + copie 1 clic)

---

## Roadmap

### Court terme (Session 16)
1. **API B2B pour assureurs** — SDK intégrable, API keys, dashboard partenaires
2. **IA estimation responsabilité** — barème IDA/IRSA + Claude = % responsabilité auto
3. **police.boom.contact** — subdomain Railway pour pilote Canton Jura

### Moyen terme (M3-M6)
4. **Intégration dashcam** — Tesla, Nexar, Viofo
5. **Marketplace réparation** — garages partenaires géolocalisés
6. **Score cohérence IA** — contradictions A vs B avant signature

### Stratégie
**Ne pas chercher 1M d'utilisateurs B2C. Closer 5 gros assureurs européens qui intègrent boom.contact dans leur app. Le B2C sert de preuve de concept pour le B2B.**
