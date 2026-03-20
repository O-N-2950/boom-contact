# 💥 boom.contact

> **Le constat amiable numérique mondial**
> Deux véhicules. Un QR code. 5 minutes. PDF légal.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

---

## ✨ Concept

Après un accident, plus besoin de chercher un formulaire papier dans la boîte à gants.
Ouvrez **boom.contact** sur votre téléphone :

1. **📄 Scannez vos documents** — OCR intelligent remplit tout automatiquement
2. **📱 Partagez un QR code** — L'autre conducteur rejoint la session en temps réel
3. **🗺️ Décrivez l'accident** — Croquis, schéma de choc, géolocalisation GPS
4. **✍️ Signez à deux** — Signature tactile contradictoire
5. **📨 PDF envoyé** — Document CEA conforme, prêt pour votre assureur

---

## 🌍 Couverture

- **42 langues** — Europe, Asie, Moyen-Orient, Afrique, Amériques
- **50+ pays** — Standard CEA (Comité Européen des Assurances)
- **RTL support** — Arabe, Hébreu, Farsi, Ourdou
- **PWA** — Aucune installation, fonctionne sur tous les appareils

---

## 🏗️ Stack

| Layer      | Tech |
|------------|------|
| Frontend   | React 18 + Vite + TailwindCSS v4 |
| Backend    | Node.js + TypeScript + tRPC + Express |
| Realtime   | Socket.io (sessions QR partagées) |
| OCR        | Claude Vision API (Anthropic) |
| PDF        | pdf-lib |
| Database   | PostgreSQL (Railway) |
| Deploy     | Railway |
| Type-check | Zod |

---

## 🚀 Démarrage rapide

```bash
# Clone
git clone https://github.com/O-N-2950/boom-contact
cd boom-contact

# Installer
npm install

# Variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés

# Dev
npm run dev
# → Frontend : http://localhost:5173
# → Backend  : http://localhost:3000
```

---

## 📁 Structure

```
boom-contact/
├── client/          # React PWA
│   └── src/
│       ├── pages/   # LandingPage, ConstatFlow, JoinSession
│       ├── components/constat/  # OCR, QR, CarDiagram, Sketch, Signature
│       └── i18n/    # 42 langues
├── server/          # Express + tRPC + Socket.io
│   └── src/
│       ├── routes/  # tRPC router
│       └── services/ # OCR, PDF, Session
└── shared/          # Types TypeScript partagés
```

---

## 📄 Licence

© 2026 PEP's Swiss SA — Groupe NEO
Tous droits réservés.
