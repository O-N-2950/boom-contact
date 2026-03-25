# boom.contact — TODO.md
> Mise à jour : 26 Mars 2026 — Session 16

---

## ✅ FAIT — Sessions 1–15 (voir SUIVI.md pour détails)

- [x] Infrastructure Railway + PostgreSQL + tRPC v11
- [x] Flow constat complet A+B (OCR→Lieu→Photos→QR→Vocal→Form→Croquis→Choc→Résumé→Sign)
- [x] OCR Claude Vision 50+ langues
- [x] Stripe live 8 devises — 3 packages (1/3/10 crédits)
- [x] PDF multilingue, carte OSM intégrée
- [x] PWA offline-first
- [x] Mode piéton/solo/objet
- [x] Transcription vocale Whisper-1
- [x] Auth : JWT + Magic Links + scrypt + WinWin SSO
- [x] Garage véhicules (CRUD + OCR)
- [x] Admin dashboard (KPIs, revenus, coûts IA)
- [x] Numéros urgence 60+ pays + AI fallback
- [x] Insurance lookup 100+ assureurs + AI fallback
- [x] RGPD : CGU + Privacy page + Cookie banner
- [x] Réseaux sociaux : Facebook / TikTok / Instagram

---

## ✅ FAIT — Session 16 (26 Mars 2026)

### Langues
- [x] 43 langues dans l'app (+ 18 nouvelles : hi/id/ms/th/vi/he/fa/bg/sr/sl/et/lv/lt/sq/mk/bs/ka/az)
- [x] Traductions complètes (landing+location+pricing+ocr) pour EN/DE/IT/ES/PT/AR/ZH/HI via API Claude
- [x] Templates email complets pour 13 langues

### Email
- [x] Template HTML complet : feedback / Google review / partage / inscription
- [x] Clé Resend corrigée dans Railway
- [x] Fix logger dans setImmediate (envoi auto après double signature)
- [x] Email B saisi au landing JoinSession (avant de rejoindre)
- [x] Délais légaux → formulation générique (plus de "5j FR / 8j CH")
- [x] CHE-476.484.632 dans tous les footers
- [x] Suppression "Groupe NEUKOMM" dans 49 fichiers

### Paiement
- [x] One-shot sans compte : email + Stripe direct, retour auto au constat après paiement
- [x] constatSessionId dans success_url → auto-consume crédit webhook

### PDF
- [x] formatDateForCountry() — DD.MM.YYYY EU / DD/MM/YYYY UK / MM/DD/YYYY US / etc.

### WinWin SSO
- [x] winwin.service.ts — verify / garage / magic-link
- [x] auth.winwinLogin tRPC — upsert user + import véhicules + JWT
- [x] Bouton "Connexion WinWin" dans AuthModal (mis en avant)
- [x] Pré-remplissage profil complet : nom/prénom/email/tél/adresse
- [x] Pré-remplissage véhicule + assureur + n° police
- [x] WINWIN_SECRET dans Railway
- [x] Clients WinWin payants comme les autres (credits=0)
- [x] info@winwin.swiss → admin 999999 crédits (compte interne)
- [x] Test réel : 3 véhicules importés, login OK

### UX / Qualité
- [x] 🐛 BugReport flottant sur toutes les pages → email.bugReport → contact@boom.contact
- [x] Checkbox marketing → visible uniquement si pays CH/LI ou langue FR/DE/IT
- [x] auth.service retourne firstName/lastName/phone/address dans tous les logins
- [x] ConstatFlow pré-remplit depuis authUser au démarrage

---

## 🔴 PRIORITÉ IMMÉDIATE

- [ ] **URL Google Business** → remplacer `https://g.page/r/boom-contact/review` dans email.service.ts par la vraie URL Google My Business
- [ ] **Test terrain réel** → 2 téléphones iOS+Android, constat complet A→Z, vérifier PDF et emails reçus

---

## 🟠 AVANT LANCEMENT PUBLIC

### PoliceFlow (pilote Canton Jura)
- [ ] police.boom.contact subdomain Railway
- [ ] PoliceFlow.tsx — 4 sections (résumé incident, conducteurs, médias, annotations)
- [ ] Auth police : JWT 8h, droits par poste/juridiction
- [ ] PDF rapport d'intervention CH modulaire par pays (CH/FR/BE/LU)
- [ ] Audit trail RGPD consultations agents (5 ans)
- [ ] Script onboarding pilote Jura
- [ ] Hébergement Infomaniak si contrat cantonal signé

### Qualité produit
- [ ] Vérifier signatures dans PDF (vraies signatures manuscrites)
- [ ] Champs CEA manquants (date validité assurance, date naissance, adresse preneur)
- [ ] Tests iOS + Android réels (2 téléphones)
- [ ] Cron nettoyage sessions > 7 jours
- [ ] Score cohérence IA (contradictions A vs B avant signature)
- [ ] Dark mode (prefers-color-scheme)

### CGU multilingues
- [ ] CGU en anglais (EN) — vérification juridique requise avant publication
- [ ] CGU en allemand (DE) — idem

---

## 🟢 MOYEN TERME (M3–M12)

### B2G — Police internationale
- [ ] Templates PDF FR (LRPPN-compatible), BE (zones locales), LU (trilingue)
- [ ] i18n PoliceFlow DE/FR/IT/EN
- [ ] Polices municipales France (2-3 villes pilote)
- [ ] Zone police wallonne Belgique
- [ ] Police Grand-Ducale Luxembourg
- [ ] TISPOL — présentation conférence annuelle (31 polices européennes)

### B2B — Assureurs CH
- [ ] API webhook sinistre (AXA, Baloise, Helvetia, Mobilière)
- [ ] Export structuré sinistre
- [ ] White-label assureur
- [ ] Licence données agrégées anonymisées

### Infrastructure
- [ ] Migration Railway → Infomaniak CH (déclenché par 1er contrat cantonal)
- [ ] Multi-tenant par canton/pays (si 5+ cantons)
- [ ] Mode Témoin officiel (3ème QR dans ConstatFlow)

---

## 📊 ÉTAT TECHNIQUE ACTUEL

| Composant | État |
|---|---|
| Frontend | React 18 + Vite + TypeScript + **43 langues** |
| Backend | Express + tRPC v11 + Socket.io |
| DB | PostgreSQL — 10 tables (users + winwin_id, vehicles, sessions...) |
| OCR | Claude Vision (Sonnet) — 50+ langues |
| PDF | pdf-lib — format date par pays, carte OSM |
| Email | Resend — template HTML 43 langues, PDF auto après signature |
| Paiement | Stripe live 8 devises — one-shot + avec compte |
| Auth | JWT + Magic Links + WinWin SSO |
| WinWin | ✅ Login + profil + véhicules + assureur pré-remplis |
| Langues | ✅ 43 langues, RTL AR/HE/FA |
| Bugs | ✅ 🐛 Bouton flottant sur toutes les pages |
| Marketing | Checkbox CH uniquement ✅ |
| Légal | CHE-476.484.632 ✅, pas de NEUKOMM ✅, délais génériques ✅ |
