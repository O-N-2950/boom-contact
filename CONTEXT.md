# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude (Token_Railway_boom.contact, Key_Anthropic_, etc.)

> Dernière mise à jour : 21 Mars 2026 — Session 6

---

## Identifiants critiques

| Ressource | Valeur |
|---|---|
| **GitHub repo** | O-N-2950/boom-contact |
| **GitHub token** | ghp_[voir_fichiers_projet] |
| **Railway TOKEN** | [voir_fichiers_projet] |
| **PROJECT_ID** | e0085774-c08f-48d0-8183-b6fe11c816cd |
| **SERVICE_ID** | 4c024cbf-fb0a-4652-85bc-8c7cdedf62e2 |
| **DB_SERVICE_ID** | 369454e6-e548-46a2-b453-f53d01356851 |
| **ENV_ID** | e0247449-5574-4959-974e-c4b636da7419 |
| **URL prod** | https://boom-contact-production.up.railway.app |
| **Domaine** | https://www.boom.contact (DNS configuré) |
| **Dernier commit** | 1f8c597 — Session 6 Police + PWA offline |
| **Anthropic key** | sk-ant-[voir_fichiers_projet] |
| **Resend API key** | re_[voir_fichiers_projet] (send-only) |
| **Email expéditeur** | contact@boom.contact ✅ DKIM actif |
| **Stripe SK** | sk_live_[voir_fichiers_projet] |
| **Stripe PK** | pk_live_[voir_fichiers_projet] |
| **Stripe Webhook ID** | we_1TDJLbGpzOqyzNB7UBSnffLM |
| **Stripe Webhook Secret** | whsec_[voir_fichiers_projet] |
| **Infomaniak token** | [voir_fichiers_projet] |

---

## Entité légale

- **PEP's Swiss SA** — société éditrice, Bellevue 7, 2950 Courgenay, Jura, Suisse
- **Groupe NEUKOMM** — holding chapeau (NE PAS écrire "Groupe NEO" — dénomination incorrecte)
- **WW Finance Group SARL** — courtage assurances, FINMA F01042365
- Contact : olivier.neukomm@bluewin.ch

---

## Stack technique

- **Frontend** : React 18 + Vite + TypeScript
- **Backend** : Express + tRPC v11 + Socket.io
- **DB** : PostgreSQL (Drizzle ORM) — 6 tables : sessions, users, payments, credit_txns, police_stations, police_users
- **OCR** : Claude Vision (Sonnet) — 50 langues, compression 1024px/q85
- **PDF** : pdf-lib (server-side) — ⚠️ WinAnsi charset : pas de ①②③✓ dans les strings
- **Email** : Resend — domaine boom.contact ✅ DKIM propagé — from: contact@boom.contact
- **Paiement** : Stripe live (même compte que PEP's V2) — metadata application:'boom.contact'
- **Hébergement** : Railway (Europe West) — 2 services : boom-contact + PostgreSQL

---

## Architecture fichiers clés

```
client/src/
  App.tsx                          — routing, CGU flow, providers tRPC+QueryClient
  trpc.ts                          — createTRPCReact + createTRPCClient typés AppRouter
  main.tsx                         — QueryClientProvider + trpc.Provider
  pages/
    LandingPage.tsx                — landing animée, 9 features, logo réel
    ConstatFlow.tsx                — flow A : ocr→location→photos→qr→form→sketch→diagram→sign→done
    JoinSession.tsx                — flow B-E : lit ?role=URL, même flow sans QR
    PricingPage.tsx                — 3 packages CHF/EUR, mutation tRPC ✅
    AgentDashboard.tsx             — 9 agents IA (?agents=true)
    PoliceLogin.tsx                — auth institutionnelle email+password JWT
    PoliceDashboard.tsx            — dashboard sessions 24h, stats, search
  components/
    CGUModal.tsx                   — CGU + RGPD, mutation tRPC ✅, validation email regex
    ErrorBoundary.tsx              — page erreur propre
    ColorPicker.tsx                — 28 swatches + saisie libre
    constat/
      OCRScanner.tsx               — capture=environment mobile / file picker desktop
      QRSession.tsx                — multi-véhicules 2→5, QR coloré par rôle (B orange/C vert/D violet/E ambre)
      PhotoCapture.tsx             — 5 catégories, compression 1024px, légendes, max 5 photos
      AccidentSketch.tsx           — canvas dessin libre section 13 CEA
      ConstatForm.tsx              — 5 sections : véhicule/conducteur/assurance/circonstances/complément
      VehicleDiagram.tsx           — silhouettes + couleur réelle OCR
      VehicleSilhouettes.tsx       — 8 SVG techniques
      vehicleMapper.ts             — 700+ modèles → bodyStyle + parseColor (30 langues)
      LocationStep.tsx             — GPS + reverse geocoding + urgences géolocalisées 35 pays
      SignaturePad.tsx             — ResizeObserver + DPR Retina
      PDFDownload.tsx              — generate + email + QR persistant 24h pour police

client/src/hooks/
    useOffline.ts                  — détection offline, IndexedDB saveOffline()

client/src/components/
    OfflineBanner.tsx              — banner orange quand hors ligne
      StepIndicator.tsx            — barre de progression

server/src/
  index.ts                         — Express + Morgan + Helmet + tRPC + Socket.io + Stripe webhook
                                     Rate limiting: OCR(10/min) create(5/min) join(10/min) payment(3/min)
  routes/router.ts                 — tRPC routes — rôles A-E partout
  services/
    session.service.ts             — CRUD sessions, TTL 24h, signSession N-véhicules
    ocr.service.ts                 — Claude Vision, 50 langues
    pdf.service.ts                 — PDF 14 sections CEA + page croquis PNG + page photos grille
    email.service.ts               — Resend multilingue fr/de/it/en/es/pt
    stripe.service.ts              — Checkout, webhook, crédits
    police.service.ts              — login JWT, dashboard sessions, verifyToken
  db/
    schema.ts                      — sessions(A-E JSONB, vehicleCount, expiresAt 24h), users, payments, credit_txns

shared/types/index.ts              — VehicleType(17), ParticipantRole(A|B|C|D|E), ScenePhoto, AccidentData...

client/public/
  logo.png                         — logo officiel (voitures bleue+orange + explosion BOOM)
  icon-192.png / icon-512.png      — icônes PWA depuis logo réel
  pitch.html                       — présentation complète (flow, features, Police B2B, multi-véhicules, pricing)
  manifest.json                    — PWA installable
```

---

## Flow utilisateur complet (état Session 5)

### Conducteur A — 8 étapes
1. **OCR** — permis + carte verte → Claude Vision → pré-remplissage
2. **Location** — type véhicule + GPS + blessures + boutons urgences géolocalisés
3. **Photos** — 5 catégories, max 5 photos, compression 1024px
4. **QR** — sélecteur 2→5 véhicules, un QR coloré par rôle B/C/D/E
5. **Form** — 5 sections + complément CEA (témoins, dégâts tiers, observations, date éditable)
6. **Sketch** — croquis canvas libre section 13
7. **Diagram** — zones de choc sur silhouette adaptée
8. **Sign + Done** — signature + PDF + email + QR persistant 24h

### Conducteur B/C/D/E
Même flow sans étape QR. Rôle lu depuis `?role=B/C/D/E` dans l'URL.

---

## Base de données — 4 tables

```sql
sessions        -- id, status, expiresAt(24h), accident JSONB, participantA-E JSONB, vehicleCount
users           -- email, credits, consentCGU/Marketing horodatés
payments        -- Stripe (packageId, creditsGranted, amountCents, currency, status, paidAt)
credit_txns     -- mouvements crédits (delta, reason, ref, createdAt)
police_stations -- id, name, canton, country, city, email, phone, active
police_users    -- id, stationId, email, firstName, lastName, badgeNumber, passwordHash, role, active
```

---

## Tarification

| Package | Prix CHF/EUR | Économie |
|---|---|---|
| 1 constat | 4.90 | — |
| 3 constats | 12.90 | 12% |
| 10 constats | 34.90 | 29% |

Frais Stripe €0.25 par package (pas par constat). Metadata: `application: 'boom.contact'`.

---

## DNS boom.contact — TOUT ✅

| Type | Nom | Statut |
|---|---|---|
| A | . → Railway | ✅ |
| CNAME | www | ✅ |
| MX | Infomaniak | ✅ |
| TXT | SPF Resend | ✅ |
| TXT | DMARC | ✅ |
| TXT | resend._domainkey | ✅ ACTIF ET PROPAGÉ |

---

## Positionnement — décisions importantes

- ✅ Positionnement mondial — supérieur au formulaire papier (toutes références "CEA" supprimées du front)
- ✅ "Document numérique certifié · valable dans 150+ pays"
- ✅ Double marché : B2C conducteurs + B2B institutions Police
- ✅ Module Police : rejoindre session via QR, jamais notification automatique
- ✅ Module Police accès : boom.contact/?police=true — auth JWT 8h
- ✅ PWA Service Worker offline — cache assets, IndexedDB sessions hors ligne
- ✅ Multi-véhicules jusqu'à 5 (game changer — papier limité à 2)
- ✅ QR persistant 24h pour intervention police tardive
- ✅ PEP's Swiss SA / Groupe NEUKOMM comme émetteur

---

## Rate limiting actif

| Route | Limite |
|---|---|
| /trpc/ocr | 10 req/min/IP |
| /trpc/session.create | 5 req/min/IP |
| /trpc/session.join | 10 req/min/IP |
| /trpc/payment.createCheckout | 3 req/min/IP |

---

## Numéros urgences géolocalisés

35 pays — détection auto GPS + reverse geocoding.
CH: 117/144 · FR: 17/15 · DE: 110/112 · IT: 113/118 · ES: 091/112 · UK: 999 · US/CA: 911
Fallback: 112 universel EU.

---

## Variables Railway configurées

DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, NODE_ENV=production, PORT=3000,
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
VITE_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

---

## Agents IA

https://boom-contact-production.up.railway.app?agents=true
debugger · deployment-validator · backend-architect · database-architect
frontend-developer · security-auditor · performance-engineer · code-reviewer · test-automator
