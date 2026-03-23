# boom.contact — TODO.md
> Mise à jour : 23 Mars 2026 — Fin Session 12

---

## ✅ FAIT — Sessions 1-11 (voir SUIVI.md pour détails)

- [x] Infrastructure Railway + PostgreSQL + tRPC v11
- [x] Flow constat complet A+B (10 étapes)
- [x] OCR Claude Vision 50 langues
- [x] Stripe live CHF+EUR — 3 packages (1/3/10 crédits)
- [x] PDF multilingue 12 langues
- [x] i18n FR/DE/IT/EN
- [x] MapVehiclePlacer — carte OSM + satellite ESRI
- [x] Mode piéton/solo/objet
- [x] Transcription vocale Whisper-1
- [x] WinWin intégration partenaire CH
- [x] LandingPage section WinWin

---

## ✅ FAIT — Session 12 (Chrome Puppeteer + OSM + Véhicules)

- [x] Chrome headless Puppeteer sur Railway Alpine (chromium)
- [x] Carte OSM server-side (Cairo + node-canvas + Nominatim)
- [x] 16 types de véhicules — 5 nouvelles silhouettes (train, tracteur, quad, chantier, bateau)
- [x] MapVehiclePlacer OBLIGATOIRE avant signature — diagram→sketch→sign
- [x] PDF avec vraie carte OSM + véhicules Chrome
- [x] drawRoadScene supprimé — carte pure
- [x] Coordonnées exactes Bellevue 7 Courgenay : 47.4088, 7.1124
- [x] 10/10 tests E2E 10 pays — 0 erreur logs

---

## 🔴 SESSION 13 — PRIORITÉ HAUTE

### 1. Fix WinWin — lien partenaire
- [ ] Identifier pourquoi le lien WinWin ne fonctionne pas en prod
- [ ] Tester `POST /trpc/winwin.createSession` depuis le portail WinWin
- [ ] Vérifier le directUrl généré et le QR code affiché
- [ ] Documenter le flow WinWin end-to-end

### 2. Authentification — Magic Links + Mot de passe
- [ ] Table `users` : email, password_hash, role (admin/customer), credits, created_at
- [ ] Magic link : email → token 15min → session JWT 30j
- [ ] Mot de passe : bcrypt hash, reset par email
- [ ] Page `/login` et `/register` (React)
- [ ] Middleware auth tRPC — protéger les routes achat/profil
- [ ] Compte admin : contact@boom.contact / Cristal4you11++ — crédits illimités
- [ ] Envoi gratuit de crédits par WhatsApp (lien unique)

### 3. Grille tarifaire internationale
- [ ] Prix par devise et par pays (CHF/EUR/GBP/AUD/USD/INR...)
- [ ] Page `/pricing` avec grille interactive par pays
- [ ] Détection automatique de la devise selon le pays de l'utilisateur
- [ ] Packs : 1 constat / 3 constats ⭐ / 10 constats — déclinaisons par devise

| Pack | CHF | EUR | GBP | AUD | USD |
|---|---|---|---|---|---|
| 1 constat | 4.90 | 4.90 | 3.90 | 7.90 | 4.90 |
| 3 constats | 12.90 | 12.90 | 9.90 | 19.90 | 12.90 |
| 10 constats | 34.90 | 34.90 | 27.90 | 54.90 | 34.90 |

### 4. Stripe international
- [ ] Stripe Checkout multi-devises (CHF/EUR/GBP/AUD/USD)
- [ ] Stripe Tax (TVA automatique par pays)
- [ ] Facture PDF automatique par email après achat
- [ ] Webhook Stripe → créditer le compte utilisateur
- [ ] Historique achats dans le dashboard utilisateur

### 5. Accès admin + crédits illimités
- [ ] Compte admin : contact@boom.contact / Cristal4you11++
- [ ] Pack illimité (credits = 999999)
- [ ] Interface d'envoi de crédits gratuits : générer lien unique → WhatsApp
- [ ] Admin peut voir et gérer tous les comptes

### 6. Dashboard admin
- [ ] `/admin` — protégé par rôle admin
- [ ] Constats en live : nombre par pays, carte monde temps réel
- [ ] Revenus Stripe en temps réel et par pays
- [ ] KPI coûts IA (Claude Vision OCR) — coût par session, coût total/jour
- [ ] Statistiques packs achetés (1/3/10) — conversion, panier moyen
- [ ] Utilisateurs actifs, inscrits, rétention
- [ ] Sessions actives live (WebSocket)
- [ ] Alertes : erreur PDF, erreur OCR, Stripe webhook fail

### 7. Réseaux sociaux
- [ ] Connexion Facebook Page boom.contact
- [ ] Connexion TikTok Business boom.contact
- [ ] Connexion LinkedIn Page boom.contact
- [ ] Connexion Instagram boom.contact
- [ ] Publication automatique journalière (voir code PEP's V2 Facebook)
- [ ] Contenu auto-généré : conseils sécurité routière, tips constat, stats pays
- [ ] Scheduler : 1 post/jour par plateforme, heures optimales

### 8. Numéros d'urgence par pays
- [ ] Table `emergency_numbers` : pays, service, numéro, description
- [ ] Suisse : TCS (0800 140 140), ACS (044 628 88 99), Helvetia, AXA, Zurich, Mobilière...
- [ ] France, Allemagne, Belgique, Luxembourg, Italie, Espagne...
- [ ] Affichage dans l'app après accident (step dédié ou dans PDF)
- [ ] Exemple CH : TCS dépannage 24h/7j = 0800 140 140

### 9. Tests finaux + Mise en production
- [ ] Tests manuels complets : iOS Safari + Android Chrome
- [ ] Test Stripe paiement réel CHF/EUR
- [ ] Test magic link email
- [ ] Test admin dashboard live
- [ ] Test réseaux sociaux post automatique
- [ ] Vérification RGPD / nLPD (cookie consent, politique vie privée)
- [ ] Mise en production officielle — annonce presse

---

## 🟠 SESSION 14+ — MOYEN TERME

### PoliceFlow (pilote Canton Jura)
- [ ] police.boom.contact subdomain Railway
- [ ] PoliceFlow.tsx — 4 sections (résumé, conducteurs, médias, annotations)
- [ ] PDF rapport d'intervention CH modulaire
- [ ] Auth police login + JWT 8h
- [ ] Audit trail RGPD consultations agents
- [ ] Hébergement Infomaniak (si contrat cantonal signé)

### Qualité produit
- [ ] Champs CEA manquants (dates validité assurance, permis, date naissance, adresse preneur)
- [ ] 50 silhouettes véhicules niveau 2 (hatchback, SUV small/large, pick-up...)
- [ ] Tests iOS + Android réels (2 téléphones)
- [ ] Dark mode (prefers-color-scheme)
- [ ] Cron nettoyage sessions > 7 jours
- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Mode Témoin officiel (3ème QR dans ConstatFlow)

### B2B Assureurs
- [ ] API webhook assureurs (AXA, Baloise, Helvetia, Mobilière)
- [ ] Export structuré sinistre
- [ ] White-label assureur
- [ ] Licence données agrégées anonymisées

---

## 📊 ÉTAT TECHNIQUE ACTUEL

| Composant | État |
|---|---|
| Frontend | React 18 + Vite + TypeScript + i18n FR/DE/IT/EN |
| Backend | Express + tRPC v11 + Socket.io |
| Base de données | PostgreSQL (Drizzle ORM) — 6 tables + 2 tables police |
| OCR | Claude Vision (Sonnet) — 50 langues |
| PDF | pdf-lib server-side + Puppeteer Chrome headless |
| Carte | OSM tiles server-side (Cairo + node-canvas) + GPS conducteur |
| Email | Resend — contact@boom.contact, DKIM actif |
| Paiement | Stripe live CHF + EUR (sans auth utilisateur pour l'instant) |
| Hébergement | Railway Europe West |
| Domaine | www.boom.contact — DNS + SSL actifs |
| PWA | Service Worker, IndexedDB, Background Sync, offline-first |
| Véhicules | 16 types avec silhouettes (dont train, tracteur, quad, chantier, bateau) |

