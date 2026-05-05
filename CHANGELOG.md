# Changelog

## v1.0.0 — 2026-05-05

### Lancement initial

**boom.contact** — Le constat amiable digital. Deux conducteurs, un QR code, un PDF légal en 5 minutes.

#### Fonctionnalités principales
- Constat amiable complet (flow A+B, 10 étapes)
- OCR intelligent (Claude Vision) — scan carte verte, permis en 50+ langues
- Session temps réel via QR code (Socket.io)
- Double signature numérique
- PDF multilingue conforme CEA (support RTL arabe/hébreu)
- Horodatage blockchain (OpenTimestamps + SHA-256)
- Transcription vocale (Whisper, 99 langues)
- Analyse IA de l'accident (Claude Sonnet)
- Carte OSM interactive + placement véhicules
- Garage véhicules personnel (CRUD + OCR)
- Mode piéton, solo, objet
- PWA offline-first (Service Worker, IndexedDB, Background Sync)
- Internationalisation 50 langues
- Paiement sécurisé Stripe (8 devises)
- Numéros d'urgence intelligents (60+ pays)
- Module police multilingue (FR/DE/IT/EN)

#### Technique
- React 18 + Vite + TypeScript strict
- Node.js + Express + tRPC backend
- Capacitor 8 (Android + iOS)
- PostgreSQL (Railway)
- 44/44 tests passés
- RGPD compliant, sessions auto-détruites 30j
