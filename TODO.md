# boom.contact — TODO

## 🔴 PRIORITÉ 1 — Core Engine

### OCR Service
- [ ] Endpoint POST /api/ocr/scan
- [ ] Claude Vision API integration
- [ ] Parser permis de circulation CH/FR/DE/IT/ES
- [ ] Parser carte verte internationale (Green Card)
- [ ] Extraction : plaque, marque, modèle, nom, assureur, n° police
- [ ] Validation Zod des données extraites
- [ ] Fallback saisie manuelle si OCR incertain

### Session QR
- [ ] POST /api/session/create → sessionId + QR code
- [ ] WebSocket room par sessionId
- [ ] GET /api/session/:id → état de la session
- [ ] Sync temps réel des données entre conducteurs A et B
- [ ] Expiration session après 2h d'inactivité

## 🟠 PRIORITÉ 2 — Formulaire & UI

### Formulaire CEA
- [ ] 17 champs standard CEA
- [ ] Validation progressive par étape
- [ ] i18n : 42 langues
- [ ] Mode offline (PWA)

### Car Diagram
- [ ] SVG véhicule cliquable (vue de dessus)
- [ ] Zones : avant, arrière, côté G/D, coins ×4
- [ ] Multi-sélection zones endommagées
- [ ] Export zones en JSON

### Sketch Canvas
- [ ] Canvas HTML5 libre
- [ ] Outils : crayon, ligne, flèche, effacer
- [ ] Export PNG pour intégration PDF

### Double Signature
- [ ] Canvas signature tactile (conducteur A)
- [ ] Canvas signature tactile (conducteur B)
- [ ] Validation "vu et approuvé" par les deux

## 🟡 PRIORITÉ 3 — PDF & Export

### PDF Generator (pdf-lib)
- [ ] Template conforme CEA
- [ ] Intégration photo docs scannés
- [ ] Intégration car diagram + sketch
- [ ] Intégration signatures
- [ ] Métadonnées légales (GPS, timestamp, sessionId)
- [ ] Envoi email à chaque assureur

## 🟢 PRIORITÉ 4 — Production

### Auth & Sécurité
- [ ] JWT sessions éphémères
- [ ] Chiffrement AES-256 données sensibles
- [ ] Rate limiting API
- [ ] CORS configuration

### Deploy
- [ ] Railway PostgreSQL
- [ ] Variables d'environnement (.env)
- [ ] CI/CD GitHub Actions
- [ ] Domaine boom.contact
