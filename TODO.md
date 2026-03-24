# boom.contact — TODO.md
> Mise à jour : 24 Mars 2026 — Fin Session 13

---

## ✅ FAIT — Sessions 1-12 (voir SUIVI.md pour détails)

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
- [x] Chrome headless Puppeteer sur Railway Alpine
- [x] Carte OSM server-side (Cairo + node-canvas + Nominatim)
- [x] 16 types de véhicules
- [x] MapVehiclePlacer OBLIGATOIRE avant signature
- [x] PDF avec vraie carte OSM + véhicules Chrome

---

## ✅ FAIT — Session 13 (24 Mars 2026)

### Fix & Auth
- [x] Fix WinWin directUrl `/constat/:id` — détection path + prop initialSessionId
- [x] Auth Magic Links (email 15min) + mot de passe (scrypt)
- [x] JWT 30j — auth.me, login, register
- [x] Compte admin contact@boom.contact / Cristal4you11++ (role=admin, credits=∞)
- [x] grantCredits → lien WhatsApp one-click
- [x] claimGift — réclamer crédits offerts
- [x] ?magic=TOKEN et ?gift=TOKEN dans App.tsx

### Garage véhicules
- [x] Table `vehicles` en DB
- [x] CRUD garage (list/save/delete) avec ownership check
- [x] Scan OCR permis + carte verte → sauvegardé dans garage
- [x] ConstatFlow — "Utiliser mon véhicule" → skip OCR
- [x] AccountPage — Garage + Historique + Profil (3 onglets)
- [x] session.history par email

### Admin Dashboard
- [x] Route admin.stats — sessions, revenus, users, coûts IA
- [x] Route admin.users — liste paginée
- [x] AdminDashboard.tsx — KPIs + sessions live + revenus + coûts IA
- [x] Accès via /?admin=true (connecté admin)
- [x] Auto-refresh 30s

### Numéros d'urgence
- [x] EmergencyNumbers.tsx — 25 pays DB locale
- [x] Bouton 🆘 flottant dans le flow constat
- [x] Section compacte dans step done (police/ambulance/pompiers)
- [x] Page complète /?urgences=true — filtrable, searchable, tap-to-call
- [x] emmental versicherung dépannage : 031 790 24 24 ✅ (vérifié source officielle)
- [x] SIMPEGO : +41 58 521 11 11 ✅
- [x] ACS nouveau numéro : 044 283 33 77 ✅
- [x] Russie, Inde NHAI 1033, Australie corrigé (RACQ 13 1905, RACV 13 11 11, RAC 13 17 03)

### Insurance lookup intelligent
- [x] insurance-assistance.service.ts — DB 100+ assureurs mondiaux
- [x] Fallback IA Claude web_search si assureur inconnu
- [x] emergency.insuranceLookup — pour conducteurs A et B simultanément
- [x] emergency.singleLookup — recherche manuelle
- [x] InsuranceAssistance.tsx — affiché dans step done
- [x] InsuranceSearchWidget dans page urgences

### Emergency country lookup
- [x] emergency-numbers.service.ts — DB 60+ pays
- [x] Fallback IA Claude web_search pour pays inconnus
- [x] emergency.countryLookup route tRPC
- [x] UnknownCountryLookup component
- [x] CountryEmergencySearch — recherche n'importe quel pays

### PostConstatCTA (conversion)
- [x] PostConstatCTA.tsx — 3 modes (anonyme / connecté sans crédits / avec crédits)
- [x] Scénarios marketing : enfant, employé, ami étranger
- [x] WhatsApp gift one-click
- [x] CTA garage + recharge crédits

### Stripe international
- [x] Multi-devises CHF/EUR/GBP/AUD/USD/CAD/SGD/JPY
- [x] Détection auto devise par IP
- [x] Grille tarifaire internationale
- [x] Factures PDF automatiques (Stripe invoice_creation)
- [x] Badge crédits sur PricingPage si connecté
- [x] Rafraîchissement crédits après retour paiement
- [x] Stripe Tax conditionnel (STRIPE_TAX_ENABLED=true)

### RGPD / CGU / Privacy
- [x] CookieBanner.tsx — RGPD/nLPD compliant, 2 choix
- [x] PrivacyPage.tsx — mentions légales + tableau RGPD art.13 + sous-traitants + cookies
- [x] /?privacy=true route
- [x] Footer LandingPage avec 6 liens légaux
- [x] CGU existantes 4 langues (depuis session précédente)

### Réseaux sociaux (manuel)
- [x] Facebook Page boom.contact — créée, bannière Gemini, post lancement
- [x] TikTok @boomcontact — créé, post publié
- [x] Instagram @boom.contact — créé, bio, lien www.boom.contact
- [x] LinkedIn — post publié depuis PEP's Swiss SA (page séparée à créer depuis ordi)

---

## 🔴 SESSION 14 — PRIORITÉ HAUTE

### PoliceFlow (pilote Canton Jura)
- [ ] police.boom.contact subdomain Railway
- [ ] PoliceFlow.tsx — 4 sections (résumé, conducteurs, médias, annotations)
- [ ] PDF rapport d'intervention CH modulaire
- [ ] Auth police login + JWT 8h
- [ ] Audit trail RGPD consultations agents
- [ ] Hébergement Infomaniak (si contrat cantonal signé)

### Réseaux sociaux automatiques
- [ ] Posts automatiques journaliers (scheduler cron)
- [ ] Contenu auto-généré Claude — conseils sécurité, tips constat, stats pays
- [ ] LinkedIn Page boom.contact séparée (depuis ordi)
- [ ] Meta Business Suite — publier FB + IG simultanément

### Qualité produit
- [ ] Champs CEA manquants (dates validité assurance, permis, date naissance, adresse preneur)
- [ ] 50 silhouettes véhicules niveau 2 (hatchback, SUV small/large, pick-up...)
- [ ] Tests iOS + Android réels (2 téléphones)
- [ ] Dark mode (prefers-color-scheme)
- [ ] Cron nettoyage sessions > 7 jours
- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Mode Témoin officiel (3ème QR dans ConstatFlow)

### B2B Assureurs (M12+)
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
| Base de données | PostgreSQL (Drizzle ORM) — 8 tables |
| OCR | Claude Vision (Sonnet) — 50 langues |
| PDF | pdf-lib server-side + Puppeteer Chrome headless |
| Carte | OSM tiles server-side (Cairo + node-canvas) + GPS conducteur |
| Email | Resend — contact@boom.contact, DKIM actif |
| Paiement | Stripe live CHF/EUR/GBP/AUD/USD/CAD/SGD/JPY |
| Auth | JWT 30j + Magic Links + bcrypt/scrypt |
| Garage | Véhicules + assurance par utilisateur |
| Urgences | DB 60+ pays + AI fallback mondial |
| Insurance | DB 100+ assureurs + AI fallback mondial |
| RGPD | Cookie banner + Privacy page + CGU 4 langues |
| Hébergement | Railway Europe West |
| Domaine | www.boom.contact — DNS + SSL actifs |
| Réseaux sociaux | Facebook ✅ TikTok ✅ Instagram ✅ LinkedIn (partiel) |
