# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude (Token_Railway_boom.contact, Key_Anthropic_, etc.)

> Dernière mise à jour : 24 Mars 2026 — Session 13

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
| **Password** | Cristal4you11++ |
| **Role** | admin |
| **Credits** | 999999 (∞) |
| **Accès dashboard** | https://www.boom.contact/?admin=true |

---

## Règles absolues (non négociables)

1. **Toujours vérifier les logs Railway AVANT et APRÈS tout push** — `deployments(first:1)` + `buildLogs`
2. **Vérifier le bundle prod** après chaque déploiement SUCCESS (strings clés dans le JS minifié)
3. **Railway API** : User-Agent `railway-cli/3.0.0` requis pour contourner Cloudflare
4. **NE PAS écrire "Groupe NEO"** — toujours `Groupe NEUKOMM` / `PEP's Swiss SA`
5. **tRPC format** : input direct sans wrapper `{"json":...}` → `?input={"sessionId":"xxx"}`
6. **Police jamais notifiée automatiquement**
7. **Valider la syntaxe TSX avant push** — pas d'itération en prod sur des erreurs de syntaxe
8. **Tutoiement partout** sur les réseaux sociaux et dans les textes marketing

---

## Stack technique

| Composant | Détail |
|---|---|
| Frontend | React 18 + Vite + TypeScript + i18n FR/DE/IT/EN |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL (Drizzle ORM) — sessions, participants, signatures, users, payments, credit_txns, vehicles, magic_tokens, police_stations, police_users, police_annotations |
| OCR | Claude Vision (Anthropic Sonnet) — 50+ langues |
| Analyse accident | Claude Sonnet — transcript vocal → scénario structuré |
| Transcription vocale | OpenAI Whisper-1 — 99 langues, $0.006/min |
| PDF | pdf-lib server-side — 12 langues, JPEG+PNG auto-detect |
| Email | Resend — contact@boom.contact, DKIM actif, domaine vérifié |
| Paiement | Stripe live — CHF/EUR/GBP/AUD/USD/CAD/SGD/JPY, webhook, factures PDF auto |
| Auth | JWT 30j + Magic Links 15min + scrypt passwords |
| Hébergement | Railway Europe West — déploiement auto depuis GitHub |
| Domaine | www.boom.contact — DNS + SSL actifs |
| PWA | Service Worker actif, IndexedDB, Background Sync, offline-first |
| Carte | OpenStreetMap (plan) + ESRI World Imagery (satellite) — sans clé |
| Géocodage | Nominatim OSM — fallback si lat/lng absent |

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
pdf.generate           POST  → { pdfBase64 }
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
police.*               ...   → module police (auth séparée)
winwin.createSession   POST  → { sessionId, directUrl }
```

---

## Etat des fonctionnalités (24 Mars 2026)

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
| Génération PDF | pdf-lib, 12 langues, carte OSM intégrée |
| Stripe international | 8 devises, factures PDF auto, webhook |
| i18n | FR / DE / IT / EN complet |
| PWA offline-first | Service Worker, IndexedDB, Background Sync |
| Mode piéton/solo | Bypass QR si pas de 2e conducteur |
| Carte OSM + satellite | MapVehiclePlacer — conducteur positionne son véhicule |
| Auth complet | Magic links + password + JWT 30j |
| Garage véhicules | CRUD + OCR scan + assurance par véhicule |
| Admin dashboard | Stats temps réel, revenus, coûts IA |
| Numéros d'urgence | 60+ pays DB + AI fallback mondial |
| Insurance lookup | 100+ assureurs DB + AI fallback mondial |
| PostConstatCTA | Conversion post-constat — 3 modes |
| Cookie banner | RGPD/nLPD compliant |
| Privacy page | Mentions légales + sous-traitants + droits |
| WinWin | directUrl /constat/:id opérationnel |
| Réseaux sociaux | Facebook ✅ TikTok ✅ Instagram ✅ |

### ❌ Pas encore fait

| Fonctionnalité | Priorité |
|---|---|
| PoliceFlow (police.boom.contact) | 🔴 CRITIQUE — pilote Jura |
| PDF rapport police CH | 🔴 CRITIQUE |
| Posts automatiques réseaux sociaux | 🟠 |
| LinkedIn Page boom.contact séparée | 🟠 |
| Score cohérence IA (A vs B) | 🟠 |
| 50 silhouettes véhicules niveau 2 | 🟡 |
| Dark mode | 🟡 |
| Cron nettoyage sessions > 7j | 🟡 |
| Champs CEA manquants | 🟠 |

---

## Structure fichiers clés

```
client/src/
  pages/
    ConstatFlow.tsx         — Flow principal conducteur A
    JoinSession.tsx         — Flow conducteur B
    PricingPage.tsx         — Tarifs multi-devises
    AccountPage.tsx         — Garage + Historique + Profil
    AdminDashboard.tsx      — Dashboard admin
    PrivacyPage.tsx         — Mentions légales RGPD
    PoliceFlow.tsx          — Module police (en cours)
  components/
    AuthModal.tsx           — Login/register/magic link
    CookieBanner.tsx        — RGPD cookie consent
    EmergencyNumbers.tsx    — Urgences mondiales + insurance search
    constat/
      InsuranceAssistance.tsx — Lookup assureur A+B post-constat
      PostConstatCTA.tsx      — CTA conversion après constat
      MapVehiclePlacer.tsx
      OCRScanner.tsx
      VoiceRecorder.tsx

server/src/
  routes/router.ts          — Toutes les routes tRPC
  services/
    auth.service.ts         — JWT, magic links, scrypt
    vehicle.service.ts      — CRUD garage
    insurance-assistance.service.ts — DB assureurs + AI fallback
    emergency-numbers.service.ts   — DB urgences + AI fallback
    stripe.service.ts       — Multi-devises, factures, webhook
    session.service.ts
    pdf.service.ts
    ocr.service.ts
    voice.service.ts
    police.service.ts
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
| STRIPE_TAX_ENABLED | ⬜ optionnel (activer après config Stripe Tax dashboard) |
| WINWIN_PARTNER_KEY | ✅ |

---

## Monétisation

| Package | CHF | EUR | GBP | AUD | USD | CAD | SGD | JPY |
|---|---|---|---|---|---|---|---|---|
| 1 constat | 4.90 | 4.90 | 3.90 | 7.90 | 4.90 | 6.90 | 6.90 | ¥750 |
| 3 constats ⭐ | 12.90 | 12.90 | 9.90 | 19.90 | 12.90 | 17.90 | 17.90 | ¥1900 |
| 10 constats | 34.90 | 34.90 | 27.90 | 54.90 | 34.90 | 47.90 | 47.90 | ¥5200 |

Stripe fixe €0.25 par package (pas par constat). Crédits sans expiration. Partageables par WhatsApp.

---

## Réseaux sociaux

| Plateforme | Compte | Status |
|---|---|---|
| Facebook | Page Boom.contact | ✅ Actif |
| TikTok | @boomcontact | ✅ Actif |
| Instagram | @boom.contact | ✅ Actif |
| LinkedIn | Via PEP's Swiss SA | ⚠️ Page séparée à créer depuis ordi |

---

## Roadmap pilote Jura

1. **M1-M3** : PoliceFlow + police.boom.contact + PDF rapport CH → démo Canton Jura
2. **M3-M6** : Polices municipales FR + zone wallonne BE → premiers revenus B2G
3. **M6** : Police Grand-Ducale LU
4. **M6-M12** : TISPOL (31 polices européennes)
5. **M12+** : Multi-tenant, assureurs CH (AXA, Baloise, Helvetia)
