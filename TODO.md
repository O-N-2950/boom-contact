# boom.contact — TODO.md
> Mise à jour : Mars 2026 · Priorités par ordre d'urgence

---

## 🔴 URGENCE — BUILD RAILWAY CASSÉ

### Problème actuel
Railway utilise un cache Docker qui contient l'ancienne version de `node_modules` avec `@tailwindcss/vite` (ESM-only, incompatible CJS).

### Solution à appliquer
- [x] **Option A (appliquée)** : Modifier le Dockerfile pour forcer `--no-cache` ou changer le hash du layer :
  ```dockerfile
  # Ajouter une ligne qui change à chaque fois pour invalider le cache
  RUN echo "cache-bust-$(date +%Y%m%d)" > /dev/null
  RUN npm ci --prefer-offline
  ```
- [ ] **Option B** : Supprimer le service Railway et en recréer un propre (sans cache)
- [ ] **Option C** : Ajouter `package-lock.json` au repo (Railway voit le changement → invalide cache)

### Vérification post-fix
- [ ] Build SUCCESS sur Railway
- [ ] `GET /health` retourne `{ ok: true }`
- [ ] `GET /` sert l'app React
- [ ] Test: créer une session → QR affiché

---

## 🟠 PRIORITÉ 1 — Core App Fonctionnelle

### OCR Engine
- [ ] Tester sur vrai permis de circulation CH
- [ ] Tester carte grise française
- [ ] Tester Green Card internationale
- [ ] Tester Zulassungsbescheinigung allemande
- [ ] Tester 行驶证 chinois (caractères)
- [ ] Tester RC Book indien
- [ ] Fallback UI si confidence < 0.5 (saisie manuelle forcée)

### Session QR
- [ ] Tester flow complet A→QR→B join→sync WebSocket
- [ ] Vérifier expiration 2h en PostgreSQL
- [ ] Tester déconnexion/reconnexion WebSocket
- [ ] QR code: intégrer lib `qrcode` côté client

### Formulaire CEA
- [ ] Valider champs obligatoires avant passage étape suivante
- [ ] Sauvegarde automatique en DB à chaque modification
- [ ] Traduction des circonstances CEA dans les 50 langues

### PDF Generator
- [ ] Tester génération PDF bout-en-bout
- [ ] Vérifier lisibilité signatures embedded
- [ ] Tester avec données incomplètes (champs manquants)
- [ ] PDF en plusieurs langues selon conducteur A

### JoinSession (Driver B flow)
- [ ] Implémenter JoinSession.tsx complet
- [ ] Détecter langue du navigateur → sélectionner automatiquement
- [ ] Même flow OCR + Formulaire + Diagram + Signature pour B

---

## 🟡 PRIORITÉ 2 — Qualité & Robustesse

### Gestion d'erreurs
- [ ] Wrapper global error boundary React
- [ ] Logger chaque erreur serveur (ne pas avaler les catch)
- [ ] Retry automatique sur appels OCR en cas de timeout
- [ ] Message d'erreur user-friendly si OCR échoue

### Tests
- [ ] Tests E2E Playwright : flow complet A+B
- [ ] Tests unitaires: session.service, pdf.service, ocr.service
- [ ] Test de charge: 100 sessions simultanées

### Sécurité (OWASP)
- [ ] Rate limiting: max 10 req/min par IP sur /trpc/ocr
- [ ] Validation taille image: max 5MB
- [ ] Sanitiser les inputs du formulaire CEA
- [ ] CORS strict en production
- [ ] Headers de sécurité (Helmet.js)

### Performance
- [ ] Compression Brotli/Gzip sur les assets
- [ ] Lazy loading des composants lourds (CarDiagram, SignaturePad)
- [ ] Cache CDN sur assets statiques
- [ ] Optimisation images base64 avant envoi OCR

---

## 🟢 PRIORITÉ 3 — Features Avancées

### Email (Resend)
- [ ] Ajouter `RESEND_API_KEY` sur Railway
- [ ] Envoyer PDF par email au conducteur A après signature complète
- [ ] Envoyer PDF par email au conducteur B après signature complète
- [ ] Template email multilingue selon langue du conducteur

### Offline / PWA
- [ ] Service Worker: cache assets + formulaire en offline
- [ ] Sync données quand connexion rétablie
- [ ] Stocker session en localStorage si offline

### Géolocalisation enrichie
- [ ] Reverse geocoding: coordonnées GPS → adresse complète
- [ ] Carte Leaflet/OSM pour confirmer le lieu
- [ ] Timestamp légal certifié (pas modifiable)

### Croquis
- [ ] Implémenter SketchCanvas.tsx complet
  - Outil crayon, ligne, flèche, rectangle
  - Symboles: véhicule, maison, feu tricolore, stop
  - Effacer, annuler (undo)
  - Export PNG pour intégration PDF

### Langues
- [ ] Traduire toutes les labels UI dans les 50 langues (actuellement FR uniquement)
- [ ] Bibliothèque i18n: i18next + react-i18next
- [ ] Détection automatique langue navigateur
- [ ] Bascule RTL/LTR dynamique en CSS

---

## 🔵 PRIORITÉ 4 — Business & Go-Live

### Domaine
- [ ] Acheter boom.contact (domaine .contact)
- [ ] Pointer boom.contact → Railway domain
- [ ] SSL automatique Railway ✅

### Intégration Groupe NEO
- [ ] Exposer API `/api/accidents/stats` pour neo-api-gateway
- [ ] Dashboard CEO: nb constats/jour, pays, langues
- [ ] Relier sinistres → opportunités WIN WIN (courtage assurance)

### Partenariats assureurs
- [ ] Contacter Zurich Suisse (pilot programme)
- [ ] Contacter AXA France
- [ ] Contacter Allianz Germany
- [ ] API directe assureur: envoi automatique PDF

### Monétisation
- [ ] Freemium: 3 constats/mois gratuits
- [ ] Pro: illimité CHF 4.90/mois
- [ ] B2B: licence assureur (white-label)
- [ ] Intégration Stripe (même pattern que winwin-v2)

### Legal & Conformité
- [ ] Mentions légales boom.contact
- [ ] Politique de confidentialité RGPD
- [ ] Conformité CEA vérifiée par juriste
- [ ] CGU acceptation au démarrage

---

## 📋 CHECKLIST AVANT MISE EN PRODUCTION

- [ ] Build Railway SUCCESS ← **bloquant actuellement**
- [ ] Tests E2E passent
- [ ] Health check `/health` répond
- [ ] ANTHROPIC_API_KEY valide en prod
- [ ] DATABASE_URL connecté au bon PostgreSQL
- [ ] Migrations DB appliquées au démarrage
- [ ] Rate limiting actif
- [ ] Logs d'erreurs centralisés
- [ ] Backup DB configuré
- [ ] Domaine boom.contact pointé
- [ ] HTTPS/SSL actif
- [ ] Test avec vrais documents (3 pays minimum)
- [ ] Test flow complet mobile iOS + Android

---

## 🗂️ AGENTS DISPONIBLES (`.claude/agents/`)

| Agent | Utiliser quand |
|-------|---------------|
| `debugger` | Build cassé, erreur Railway, bug logique |
| `deployment-validator` | Avant chaque deploy Railway |
| `backend-architect` | Nouvelle route tRPC, nouveau service |
| `database-architect` | Schéma DB, migrations, requêtes |
| `frontend-developer` | Nouveaux composants React |
| `security-auditor` | Avant mise en production |
| `performance-engineer` | Optimisation OCR, PDF, WebSocket |
| `code-reviewer` | Avant merge sur main |
| `test-automator` | Écriture tests E2E Playwright |
