# boom.contact — CONTEXT.md
> Mémoire persistante entre sessions · Mise à jour : Mars 2026

---

## 🎯 MISSION

**boom.contact** est la première application mondiale de constat amiable d'accident numérique.

> *"Après le boom, le contact."*

Deux conducteurs. Un QR code. 5 minutes. Un PDF légal conforme CEA envoyé à chaque assureur.

**Porteur :** Olivier Neukomm — PEP's Swiss SA / Groupe NEO
**URL future :** https://boom.contact
**URL Railway :** https://boom-contact-production.up.railway.app

---

## 🏛️ CONTEXTE GROUPE NEO

| Entité | Rôle |
|--------|------|
| **Groupe NEO** (holding CH) | Holding chapeau — Bellevue 7, 2950 Courgenay, Jura |
| **WW Finance Group SARL** | Courtage assurances FINMA F01042365 |
| **PEP's Swiss SA** | Studio digital — porteur technique de boom.contact |

**boom.contact s'inscrit dans l'écosystème NEO :**
- Canal d'acquisition pour WW Finance Group (courtage assurance post-sinistre)
- Données sinistres = intelligence pour WIN WIN v2 (gestion mandats)
- Future intégration dans neo-api-gateway pour consolidation CEO

---

## 💥 PROBLÈME RÉSOLU

Chaque année, des millions d'accidents de voiture donnent lieu à un constat papier :
- Rempli à la main sous le choc (fautes, oublis, illisible)
- Barrière linguistique entre conducteurs étrangers
- Perdu, mouillé, déchiré
- Aucun équivalent numérique officiel universel n'existe

**Chiffres :** ~1.8M constats/an en Europe · ~350M véhicules en Chine · ~300M en Inde (+8%/an)

---

## 🏗️ STACK TECHNIQUE

| Layer | Technologie | Pourquoi |
|-------|-------------|----------|
| Frontend | React 18 + Vite + Tailwind v3 | Même stack que winwin-v2 |
| Backend | Node.js + TypeScript + tRPC + Express | Type-safe, robuste |
| Realtime | Socket.io | Sync session A↔B temps réel |
| OCR | Claude Vision API (Anthropic) | Comprend 50+ pays nativement |
| PDF | pdf-lib | Node.js pur, pas de dépendance binaire |
| Database | PostgreSQL (Railway) + Drizzle ORM | Persistant, scalable |
| Deploy | Railway (Dockerfile) | Même infra que tous les projets NEO |
| Auth | JWT sessions éphémères par accident | Sans compte utilisateur |

---

## 🌍 COUVERTURE

- **50 langues** · **9 régions** · **5 milliards de locuteurs**
- Support RTL : arabe, hébreu, farsi, ourdou
- Chine : mandarin simplifié + traditionnel + cantonais
- Inde : 8 langues (Hindi, Telugu, Punjabi, Marathi, Gujarati, Tamil, Kannada, Bengali)
- Afrique : Swahili, Hausa, Yoruba, Amharique

---

## 📄 DOCUMENTS PAR PAYS (OCR)

| Pays | Doc véhicule | Doc assurance |
|------|-------------|---------------|
| 🇨🇭 CH | Permis de circulation | Carte verte internationale |
| 🇫🇷 FR | Carte grise (CG / SIV) | Attestation d'assurance |
| 🇩🇪 DE | Zulassungsbescheinigung I | Grüne Versicherungskarte |
| 🇮🇹 IT | Libretto di circolazione | Carta verde |
| 🇪🇸 ES | Permiso de circulación | Carta verde |
| 🇬🇧 UK | V5C logbook | Certificate of insurance |
| 🇮🇳 IN | RC Book (Registration Certificate) | Insurance Certificate |
| 🇨🇳 CN | 行驶证 (Xíngshǐ zhèng) | 保险单 (Insurance policy) |
| 🌍 50+ | Document immatriculation | Green Card (CEA standard) |

---

## 🔄 FLOW UTILISATEUR

```
Conducteur A                    Conducteur B
     │                               │
 Ouvre boom.contact            Scanne le QR
     │                               │
 📸 Scanne docs                📸 Scanne docs
 (OCR → auto-fill)             (OCR → auto-fill)
     │                               │
     └──── Session partagée ─────────┘
                  │
        📋 Formulaire CEA
        🚗 Car Diagram (zones de choc)
        📍 Géolocalisation GPS
        ✏️ Croquis libre
                  │
        ✍️ Signature A  +  ✍️ Signature B
                  │
        📄 PDF conforme CEA généré
                  │
     ┌────────────┴────────────┐
📧 Assureur A              📧 Assureur B
```

---

## 🏗️ ARCHITECTURE FICHIERS

```
boom-contact/
├── .claude/
│   ├── agents/          # 9 agents spécialisés (depuis winwin-v2)
│   └── skills/          # Skills Railway, PostgreSQL, OWASP
├── client/              # React PWA
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── favicon.svg        # Logo 💥
│   └── src/
│       ├── App.tsx            # Router: landing / constat / join
│       ├── i18n/              # 50 langues, RTL support
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── ConstatFlow.tsx    # Flow A: OCR→QR→Form→Diagram→Sign→PDF
│       │   └── JoinSession.tsx    # Flow B: scan QR → rejoindre
│       └── components/constat/
│           ├── OCRScanner.tsx     # Camera → Claude Vision → auto-fill
│           ├── QRSession.tsx      # Génère QR, attend partenaire
│           ├── ConstatForm.tsx    # 17 champs CEA + 17 circonstances
│           ├── CarDiagram.tsx     # SVG 18 zones cliquables
│           ├── SketchCanvas.tsx   # Canvas libre croquis
│           ├── SignaturePad.tsx   # Signature tactile dual
│           ├── PDFDownload.tsx    # Téléchargement + email
│           └── StepIndicator.tsx  # Progress bar 5 étapes
├── server/src/
│   ├── index.ts               # Express + Socket.io + migrations auto
│   ├── db/
│   │   ├── schema.ts          # Table sessions (JSONB)
│   │   ├── index.ts           # Pool PostgreSQL max:10
│   │   └── migrate.ts         # Migrations auto au démarrage
│   ├── routes/router.ts       # tRPC: session + ocr + pdf
│   ├── middleware/context.ts  # JWT context
│   └── services/
│       ├── ocr.service.ts     # Claude Vision → JSON structuré
│       ├── session.service.ts # CRUD sessions PostgreSQL
│       └── pdf.service.ts     # Génération PDF conforme CEA
└── shared/types/index.ts      # Types TypeScript partagés
```

---

## 🚀 DEPLOY RAILWAY

| Variable | Valeur |
|----------|--------|
| `PROJECT_ID` | `e0085774-c08f-48d0-8183-b6fe11c816cd` |
| `ENV_ID` | `e0247449-5574-4959-974e-c4b636da7419` |
| `SERVICE_ID` | `4c024cbf-fb0a-4652-85bc-8c7cdedf62e2` (boom-contact) |
| `DB_SERVICE_ID` | `369454e6-e548-46a2-b453-f53d01356851` (PostgreSQL) |
| `RAILWAY_TOKEN` | `40b74970-6fd5-440c-a538-89234616ab26` |
| `DATABASE_URL` | postgresql://boom:boom_secret_2026@postgres.railway.internal:5432/boom_contact |
| `ANTHROPIC_API_KEY` | Configurée ✅ |
| `JWT_SECRET` | Configuré ✅ |
| `NODE_ENV` | production |
| `PORT` | 3000 |

---

## 🔴 RÈGLES ABSOLUES (inspirées de winwin-v2)

1. **Ne jamais avaler les erreurs** — chaque catch doit logger et relancer
2. **Un seul client IA** — `ocr.service.ts` est le point unique d'appel Claude
3. **Sessions en PostgreSQL** — jamais en mémoire (données perdues au redémarrage)
4. **Build doit passer avant tout commit** — vérifier localement d'abord
5. **Tester le build Docker localement** si doute sur les dépendances
6. **RGPD** — sessions auto-expirées après 2h, suppression après 30 jours
7. **Ne jamais committer de clés API** — utiliser `.env` + Railway variables

---

## 📊 ÉTAT DU BUILD (Mars 2026)

| Composant | Statut | Notes |
|-----------|--------|-------|
| OCR Engine | ✅ Codé | Attend build Railway |
| Session QR | ✅ Codé | PostgreSQL + WebSocket |
| Formulaire CEA | ✅ Codé | 17 champs + 17 circonstances |
| Car Diagram SVG | ✅ Codé | 18 zones cliquables |
| Signature Pad | ✅ Codé | Canvas tactile dual |
| PDF Generator | ✅ Codé | pdf-lib, 8 sections CEA |
| Railway Build | ✅ SUCCESS | Nouveau service propre, build 90s |
| Landing page | ✅ Extraordinaire | Animée, phone mockup, counters, features grid |
| i18n 50 langues | ✅ Codé | RTL support |
