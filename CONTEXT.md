# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude (Token_Railway_boom.contact, Key_Anthropic_, etc.)

> Dernière mise à jour : 22 Mars 2026 — Session 10

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
| **Google Maps Key** | AIzaSy****_voir_projet_Claude (⚠️ EXPIRÉE) |
| **Gemini API Key** | AIzaSy****_voir_projet_Claude |

---

## Règles absolues (non négociables)

1. **Toujours vérifier les logs Railway AVANT et APRÈS tout push** — `deployments(first:1)` + `buildLogs`
2. **Vérifier le bundle prod** après chaque déploiement SUCCESS (strings clés dans le JS minifié)
3. **Railway API** : User-Agent `railway-cli/3.0.0` requis pour contourner Cloudflare
4. **NE PAS écrire "Groupe NEO"** — toujours `Groupe NEUKOMM` / `PEP's Swiss SA`
5. **tRPC format** : input direct sans wrapper `{"json":...}` → `?input={"sessionId":"xxx"}`
6. **Police jamais notifiée automatiquement**
7. **Valider la syntaxe TSX avant push** — pas d'itération en prod sur des erreurs de syntaxe

---

## Stack technique

| Composant | Détail |
|---|---|
| Frontend | React 18 + Vite + TypeScript + i18n FR/DE/IT/EN |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL (Drizzle ORM) — sessions, participants, signatures |
| OCR | Claude Vision (Anthropic Sonnet) — 50+ langues |
| Analyse accident | Claude Sonnet — transcript vocal → scénario structuré |
| Transcription vocale | OpenAI Whisper-1 — 99 langues, $0.006/min |
| PDF | pdf-lib server-side — 12 langues, JPEG+PNG auto-detect |
| Email | Resend — contact@boom.contact, DKIM actif, domaine vérifié |
| Paiement | Stripe live — CHF + EUR, webhook vérifié, 3 packages |
| Hébergement | Railway Europe West — déploiement auto depuis GitHub |
| Domaine | www.boom.contact — DNS + SSL actifs |
| PWA | Service Worker actif, IndexedDB, Background Sync, offline-first |
| Carte | OpenStreetMap (plan) + ESRI World Imagery (satellite) — sans clé |
| Géocodage | Nominatim OSM — fallback si lat/lng absent |

---

## Architecture tRPC — Routes disponibles

```
session.create         POST  → { sessionId, qrUrl, status }
session.get            GET   → session complète (participantA, participantB, accident...)
session.updateAccident POST  → { ok: true }
session.updateParticipant POST → { ok: true }
session.join           POST  → session active
session.sign           POST  → { ok, bothSigned }  ← status → 'completed' si les 2 signent
pdf.generate           POST  → { pdfBase64 }  ← nécessite status === 'completed'
ocr.scan               POST  → résultat OCR  ← input: { imageBase64, mediaType, documentType }
voice.transcribe       POST  → { transcript }
payment.packages       GET   → 3 packages: single / pack3 / pack10
payment.createCheckout POST  → { url }
```

**Format input correct** :
- GET : `?input={"sessionId":"xxx"}` (sans wrapper json)
- POST : body `{"sessionId":"xxx", "data":{...}}` (sans wrapper json)

---

## Etat des fonctionnalités (22 Mars 2026)

### ✅ En production et fonctionnel

| Fonctionnalité | Notes |
|---|---|
| Scan OCR multi-documents | Permis CH/FR/DE/GB + carte verte + 50 langues |
| Géolocalisation IP → langue | 180+ pays, cascade localStorage→IP→navigator |
| Flow constat complet A+B | SCAN→LIEU→PHOTOS→VOCAL→QR→CROQUIS→INFOS→CHOC→SIGN |
| Session temps réel | Socket.io, QR code, join B depuis lien |
| Transcription vocale | Whisper-1, 99 langues, max 3 min |
| Analyse IA accident | Claude Sonnet → scénario + responsabilité + circonstances |
| Signature numérique | Canvas HTML5, base64 PNG |
| Génération PDF | pdf-lib, 12 langues, JPEG+PNG auto-detect, carte intégrée |
| Stripe paiement | 3 packages (1/3/10 constats), CHF + EUR, webhook |
| i18n | FR / DE / IT / EN complet |
| PWA offline-first | Service Worker, IndexedDB, Background Sync |
| Mode piéton/solo | Bypass QR si pas de 2e conducteur (piéton, objet, seul) |
| Carte OSM + satellite | MapVehiclePlacer — conducteur positionne son véhicule |
| Géocodage adresse | Nominatim fallback si lat/lng absent |
| bothSigned → completed | Fix session 10 — status mis à jour correctement |

### ❌ Pas encore fait

| Fonctionnalité | Priorité |
|---|---|
| PoliceFlow (police.boom.contact) | 🔴 CRITIQUE — pilote Jura |
| PDF rapport police CH | 🔴 CRITIQUE |
| Score cohérence IA (A vs B) | 🟠 |
| 50 silhouettes véhicules niveau 2 | 🟡 |
| Dark mode | 🟡 |
| Cron nettoyage sessions > 7j | 🟡 |
| Tests Stripe CHF réels | 🟠 |
| Champs CEA manquants | 🟠 |

---

## Structure fichiers clés

```
client/src/
  pages/
    ConstatFlow.tsx         — Flow principal conducteur A (étapes SCAN→SIGN)
    JoinSession.tsx         — Flow conducteur B
  components/constat/
    MapVehiclePlacer.tsx    — Carte OSM/satellite + placement véhicule
    QRSession.tsx           — QR code + mode piéton/solo/objet
    OCRScanner.tsx          — Scanner multi-documents
    VoiceRecorder.tsx       — Enregistreur vocal Whisper
    VoiceSketchFlow.tsx     — Flow vocal → IA → croquis
    AccidentSketch.tsx      — Croquis manuel fallback
  i18n/
    geo-lang.ts             — Géolocalisation IP → langue

server/src/
  routes/router.ts          — Toutes les routes tRPC
  services/
    session.service.ts      — CRUD sessions + bothSigned fix
    pdf.service.ts          — Génération PDF multilingue (JPEG+PNG)
    ocr.service.ts          — Claude Vision OCR
    voice.service.ts        — Whisper transcription
    accident-analyzer.service.ts — Claude Sonnet analyse
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
| GOOGLE_MAPS_API_KEY | ⚠️ SET mais EXPIRÉE |
| GEMINI_API_KEY | ⚠️ SET mais Maps non activé |

---

## Monétisation

| Package | Prix | Crédits | Frais Stripe |
|---|---|---|---|
| 1 constat | CHF/€ 4.90 | 1 | €0.25 par package |
| 3 constats ⭐ | CHF/€ 12.90 | 3 | €0.25 par package |
| 10 constats | CHF/€ 34.90 | 10 | €0.25 par package |

RGPD : checkbox optionnelle partage données avec PEP's Swiss SA.

---

## Roadmap pilote Jura

1. **M1-M3** : PoliceFlow + police.boom.contact + PDF rapport CH → démo Canton Jura
2. **M3-M6** : Polices municipales FR + zone wallonne BE → premiers revenus B2G
3. **M6** : Police Grand-Ducale LU
4. **M6-M12** : TISPOL (31 polices européennes)
5. **M12+** : Multi-tenant, assureurs CH (AXA, Baloise, Helvetia)
