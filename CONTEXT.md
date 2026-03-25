# boom.contact — CONTEXT.md
> ⚠️ Les clés réelles sont dans les fichiers du projet Claude

> Dernière mise à jour : 26 Mars 2026 — Session 16

---

## Identifiants critiques

| Ressource | Valeur |
|---|---|
| **GitHub repo** | O-N-2950/boom-contact |
| **Railway PROJECT_ID** | e0085774-c08f-48d0-8183-b6fe11c816cd |
| **Railway SERVICE_ID** | 4c024cbf-fb0a-4652-85bc-8c7cdedf62e2 |
| **Railway ENV_ID** | e0247449-5574-4959-974e-c4b636da7419 |
| **URL prod** | https://www.boom.contact |
| **Entité légale** | PEP's Swiss SA · CHE-476.484.632 |
| **Adresse** | Bellevue 7, 2950 Courgenay, Jura, Suisse |
| **WinWin API** | https://www.winwin.swiss |
| **WinWin SECRET** | voir Railway env WINWIN_SECRET |

---

## Comptes admin

| Email | Password | Role | Crédits |
|---|---|---|---|
| contact@boom.contact | Cristal4you11++ | admin | 999999 |
| info@winwin.swiss | Cristal4you11++ | admin | 999999 |

Accès dashboard : https://www.boom.contact/?admin=true

---

## Règles absolues

1. Vérifier logs Railway AVANT et APRÈS tout push
2. Railway API : User-Agent `railway-cli/3.0.0` requis
3. Jamais "Groupe NEUKOMM" — uniquement `PEP's Swiss SA · CHE-476.484.632`
4. tRPC format : input direct sans wrapper `{"json":...}`
5. Police jamais notifiée automatiquement
6. Valider syntaxe TSX avant push
7. Apostrophes typographiques dans strings TS → utiliser doubles guillemets
8. Checkbox marketing PEP's → CH/LI uniquement (isSwiss flag)
9. Délais légaux → jamais codés en dur, toujours formulation générique
10. Clients WinWin → payants comme tout le monde (credits=0 à la création)

---

## Stack technique

| Composant | Détail |
|---|---|
| Frontend | React 18 + Vite + TypeScript + i18n 43 langues |
| Backend | Express + tRPC v11 + Socket.io |
| DB | PostgreSQL (Drizzle ORM) — 10 tables dont winwin_id |
| OCR | Claude Vision (Sonnet) — 50+ langues |
| Vocal | OpenAI Whisper-1 — 99 langues |
| PDF | pdf-lib server-side — format date par pays |
| Email | Resend — template HTML complet 43 langues |
| Paiement | Stripe live — 8 devises, one-shot sans compte |
| Auth | JWT 30j + Magic Links + scrypt + WinWin SSO |
| Hébergement | Railway Europe West |

---

## 43 Langues

App (complet) : fr de it en es pt nl pl cs sk hu ro sv da nb fi tr ru uk ar(RTL) he(RTL) fa(RTL) zh ja ko hi th vi id ms el hr bg sr sl bs mk sq et lv lt ka az

Emails (templates complets) : fr de it en es pt nl pl ru ar zh ja tr

Fallback : fr pour toutes les autres

---

## Format date PDF par pays

- Europe continentale (défaut) : DD.MM.YYYY
- UK/Irlande/Australie/Inde : DD/MM/YYYY
- USA : MM/DD/YYYY
- Japon : YYYY/MM/DD
- Chine/Corée/Hongrie : YYYY.MM.DD

---

## Intégration WinWin SSO

Endpoints WinWin :
- POST /api/boom/auth/verify → email+password
- POST /api/boom/auth/magic-link → token 72h
- POST /api/boom/auth/garage → { winwinId } → véhicules

Flux : login WinWin → upsert user (credits=0) → import véhicules+assureur → JWT boom → pré-remplissage complet du constat (nom/prénom/email/tél/adresse/véhicule/assureur/n°police)

Compte test : info@winwin.swiss / Cristal4you11++ → winwinId: WW-9
Véhicules test : JU 50810 (Nissan Juke), JU 59269 (Skoda Octavia x2)

---

## Email template post-signature

1. Header + badge "Constat signé"
2. PDF en pièce jointe
3. Assureur OCR si disponible
4. 3 étapes (vérifier, contacter assureur, transmettre sous délai contractuel)
5. Feedback 😊/😕
6. Avis Google → URL À REMPLACER par vraie fiche Google Business
7. Partage WhatsApp/Telegram/Facebook/SMS
8. CTA inscription/garage

---

## Monétisation

| Package | CHF | EUR | GBP | USD | Marge nette |
|---|---|---|---|---|---|
| 1 constat | 4.90 | 4.90 | 3.90 | 4.90 | ~93% |
| 3 constats | 12.90 | 12.90 | 9.90 | 12.90 | ~96% |
| 10 constats | 34.90 | 34.90 | 27.90 | 34.90 | ~97% |

Stripe : 1.5% + €0.25 fixe par package. Crédits sans expiration.
Devise auto-détectée par IP. Pas de PPP (protection anti-VPN naturelle).

---

## Variables Railway

| Variable | Status |
|---|---|
| DATABASE_URL | ✅ |
| ANTHROPIC_API_KEY | ✅ |
| OPENAI_API_KEY | ✅ |
| STRIPE_SECRET_KEY | ✅ |
| STRIPE_PUBLISHABLE_KEY | ✅ |
| STRIPE_WEBHOOK_SECRET | ✅ |
| VITE_STRIPE_PUBLISHABLE_KEY | ✅ |
| RESEND_API_KEY | ✅ re_Tt9pArj4_... |
| JWT_SECRET | ✅ |
| WINWIN_SECRET | ✅ ww_boom_8945ff3e... |

---

## Fichiers clés modifiés (Session 16)

- server/src/services/winwin.service.ts — NOUVEAU
- server/src/services/auth.service.ts — retourne profil complet (firstName/lastName/phone/address)
- server/src/services/pdf.service.ts — formatDateForCountry()
- server/src/services/email.service.ts — 43 langues, no NEUKOMM, CHE-476, délais génériques
- server/src/db/schema.ts — users.winwin_id
- server/src/db/migrate.ts — Block 9 winwin_id
- server/src/routes/router.ts — auth.winwinLogin, auth.winwinVehicles, email.bugReport
- client/src/components/AuthModal.tsx — bouton WinWin SSO
- client/src/components/CGUModal.tsx — checkbox marketing CH uniquement
- client/src/components/BugReport.tsx — NOUVEAU 🐛
- client/src/pages/ConstatFlow.tsx — pré-remplissage profil authUser
- client/src/pages/JoinSession.tsx — email B saisi au landing
- client/src/i18n/index.ts — 43 langues
- client/src/i18n/locales/*.json — 21 nouveaux fichiers

---

## Roadmap

| Phase | Période | Objectif |
|---|---|---|
| Pilote | M1–M3 | PoliceFlow + PDF rapport CH → Canton Jura |
| Validation | M3–M6 | Polices FR + Belgique → premiers revenus B2G |
| Europe | M6–M12 | Luxembourg + TISPOL 31 polices |
| Scale | M12+ | Assureurs CH, migration Infomaniak |
