# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude (Token_Railway_boom.contact, Key_Anthropic_, etc.)

> Dernière mise à jour : 21 Mars 2026 — Session 3

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
| **Anthropic key** | sk-ant-[voir_fichiers_projet] |
| **Resend API key** | re_[voir_fichiers_projet] (restreinte send-only) |
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
- **DB** : PostgreSQL (Drizzle ORM) — 4 tables : sessions, users, payments, credit_txns
- **OCR** : Claude Vision (Sonnet) — 50 langues
- **PDF** : pdf-lib (server-side) — ⚠️ WinAnsi charset : pas de ①②③✓ dans les strings
- **Email** : Resend — domaine boom.contact configuré (DKIM manquant, voir TODO)
- **Paiement** : Stripe live (même compte que PEP's V2) — metadata `application:'boom.contact'`
- **Hébergement** : Railway (Europe West) — 2 services : boom-contact + PostgreSQL

---

## Architecture fichiers clés

```
client/src/
  App.tsx                          — routing, CGU flow, providers tRPC+QueryClient
  trpc.ts                          — createTRPCReact + createTRPCClient typés AppRouter
  main.tsx                         — QueryClientProvider + trpc.Provider
  pages/
    LandingPage.tsx                — landing animée, onStart + onPricing props
    ConstatFlow.tsx                — flow conducteur A (ocr→location→qr→form→diagram→sign→done)
    JoinSession.tsx                — flow conducteur B (landing→ocr→location→form→diagram→sign→done)
    PricingPage.tsx                — 3 packages, sélecteur CHF/EUR, fetch() brut ⚠️ à migrer
    AgentDashboard.tsx             — 9 agents IA (?agents=true)
  components/
    CGUModal.tsx                   — CGU + RGPD, fetch() brut ⚠️ à migrer
    ErrorBoundary.tsx              — page erreur propre au lieu de page blanche
    ColorPicker.tsx                — 28 swatches visuels + saisie libre
    constat/
      OCRScanner.tsx               — mobile:capture=environment / desktop:file picker, compression 1024px
      QRSession.tsx                — trpc.session.get.useQuery(refetchInterval:2000)
      ConstatForm.tsx              — 4 sections : vehicle/driver/insurance/circumstances
      CarDiagram.tsx               — ⚠️ OBSOLÈTE — remplacé par VehicleDiagram
      VehicleDiagram.tsx           — silhouettes adaptées + couleur réelle + badge identité
      VehicleSilhouettes.tsx       — 8 SVG techniques : car/moto/scooter/bicycle/truck/bus/tram/pedestrian
      vehicleMapper.ts             — 700+ modèles → bodyStyle + parseColor (30 langues)
      LocationStep.tsx             — GPS + reverse geocoding + 17 types véhicules groupés + blessures
      SignaturePad.tsx             — ResizeObserver + DPR Retina
      PDFDownload.tsx              — trpc.pdf.generate + trpc.email.sendToDriver mutations
      StepIndicator.tsx            — barre de progression

server/src/
  index.ts                         — Express + Morgan + Helmet + tRPC + Socket.io + webhook Stripe
  logger.ts                        — logger centralisé, process.stdout.write direct
  routes/router.ts                 — tRPC routes : session/ocr/pdf/email/payment/user
  services/
    session.service.ts             — CRUD PostgreSQL sessions
    ocr.service.ts                 — Claude Vision, extraction 50 langues
    pdf.service.ts                 — génération PDF pdf-lib ⚠️ WinAnsi only
    email.service.ts               — Resend multilingue fr/de/it/en/es/pt
    stripe.service.ts              — Checkout Sessions, webhook, crédits
  db/
    schema.ts                      — sessions, users, payments, credit_txns
    migrate.ts                     — migrations auto au démarrage

shared/types/index.ts              — VehicleType (17 types), BodyStyle, ScenePhoto, AccidentData...

client/public/
  pitch.html                       — page présentation boom.contact (accessible sur /pitch.html)
```

---

## Flow utilisateur complet

### Conducteur A
1. **OCR** — 2 photos (permis + carte verte) → compression 1024px → Claude Vision
2. **Location** — type véhicule (17 types) + GPS + date/heure + blessures
3. **QR** — partage QR code → attend conducteur B (polling tRPC 2s)
4. **Form** — 4 sections pré-remplies par OCR
5. **Diagram** — VehicleDiagram avec silhouette adaptée + couleur réelle
6. **Sign** — SignaturePad DPR-correct
7. **Done** — PDFDownload (téléchargement + email)

### Conducteur B
Même flow sans l'étape QR (il rejoint via le lien/QR scanné).

---

## Base de données — 4 tables

```sql
sessions       -- constats (id, status, accident JSONB, participantA JSONB, participantB JSONB)
users          -- comptes (email, credits, consentCGU, consentMarketing)
payments       -- achats Stripe (packageId, creditsGranted, status, paidAt)
credit_txns    -- mouvements crédits (delta, reason, ref)
```

---

## Tarification (décision finale)

| Package | Prix | Stripe effectif |
|---|---|---|
| 1 constat | CHF/€ 4.90 | ~6.6% |
| 3 constats | CHF/€ 12.90 | ~3.2% effectif |
| 10 constats | CHF/€ 34.90 | ~1.2% effectif |

Frais Stripe €0.25 payés **une seule fois** par package (pas par constat).
Métadonnées Stripe : `application: 'boom.contact'` sur chaque transaction.

---

## DNS boom.contact (état actuel)

| Type | Nom | Valeur | Statut |
|---|---|---|---|
| A | . | 66.33.22.223 (Railway) | ✅ |
| CNAME | www | boom-contact-production.up.railway.app | ✅ |
| MX | . | mta-gw.infomaniak.ch | ✅ |
| MX | send | feedback-smtp.eu-west-1.amazonses.com | ✅ |
| TXT | . | v=spf1 include:spf.infomaniak.ch include:spf.resend.com ~all | ✅ |
| TXT | send | v=spf1 include:amazonses.com ~all | ✅ |
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@boom.contact | ✅ |
| TXT | resend._domainkey | p=MIGfMA0GCSq... | ❌ À FAIRE MANUELLEMENT sur Infomaniak Manager |

**Action requise** : Infomaniak Manager → boom.contact → DNS → Ajouter TXT `resend._domainkey`
Valeur : `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/9W6A0Ku3MNuKTPAgNqno/gfoWs5pojTRG4XpLhpsxJIUK1lEmGv75tYHgLzUC7aBd9tfKMGRV/WMpk3AJJA6xGyKtPmhixW2A96Vv9ZQ6cCzLsQqS0rCVvYbonlaARDlru4i8UqqWjslN+IbYzO1yrnEYYglIm34ZA8FJJ9TVQIDAQAB`

---

## Positionnement — décisions importantes

- ✅ Positionnement mondial — boom.contact est supérieur à tout formulaire papier
- ✅ **"Document numérique certifié · valable dans 150+ pays"**
- ✅ Les 17 circonstances sont reformulées dans nos propres termes
- ✅ PEP's Swiss SA / Groupe NEUKOMM comme émetteur

---

## Variables Railway configurées

DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, NODE_ENV=production, PORT=3000,
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
VITE_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

---

## Agents IA disponibles

Accessibles via : https://boom-contact-production.up.railway.app?agents=true

debugger, deployment-validator, backend-architect, database-architect,
frontend-developer, security-auditor, performance-engineer, code-reviewer, test-automator
