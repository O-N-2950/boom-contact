# Stripe CLI — Runbook E2E B2B (Hosted Checkout + Real Stripe Delivery)

> But : valider les **20 % restants** de la boucle de facturation entreprise — le **Checkout hébergé
> par Stripe**, le paiement carte test `4242`, et la **livraison réelle du webhook** par Stripe vers
> `/webhook/stripe`, puis le **rejeu réel** de l'event (idempotence).
>
> La moitié serveur (réception webhook → crédit wallet → idempotence → isolation du flux perso) est
> **déjà prouvée** par `server/src/__tests__/stripeWebhookOrg.integration.test.ts` (PG réel + signature réelle).

> ⚠️ **TEST MODE UNIQUEMENT.** Carte test `4242…`, clés `sk_test_…`/`whsec_…`. **Jamais** de clé live,
> jamais de vraie carte, jamais committer de clé. Ne pas pointer `sk_test` vers la **DB prod**.

---

## 0. Faits techniques (référence)
- Serveur Express : port **3000** ; route webhook : **`POST /webhook/stripe`** (body brut `express.raw`).
- UI dev (Vite) : port **5173**, proxy `/trpc` → `localhost:3000`.
- Achat org : route tRPC `payment.createOrgCheckout` (réservée **owner / fleet_admin**), pose
  `metadata.kind='org_credits'`, `organizationId`, `actorUserId`, `credits`.
- Packages : `single`=1 crédit (€4.90), `pack3`=3 (€12.90), `pack10`=10 (€34.90).
- Retour succès : `${CLIENT_URL}/account?org_credits=success` (⇒ définir `CLIENT_URL` en local, cf. Mode A).
- Crédit idempotent par `wallet_transactions.related_payment_id = <id session Stripe>` (+ garde `payments.status='paid'`).

> ❗ **Important** : `stripe trigger checkout.session.completed` génère un event **sans** notre
> `metadata.kind=org_credits` → il NE teste PAS la branche org (il suivrait le chemin perso / metadata
> manquantes). Le test org **doit** passer par un **vrai** `createOrgCheckout` (bouton UI) pour produire
> une session portant les bonnes metadata, puis rejouer **cet** event.

---

## 1. Prérequis
- [ ] **Stripe CLI** installé (`stripe version`). Sinon : https://docs.stripe.com/stripe-cli
- [ ] Compte Stripe en **mode test** accessible.
- [ ] Clé **`sk_test_…`** (Dashboard test → Developers → API keys).
- [ ] App lançable en local (`npm install` déjà fait).
- [ ] Une **base de test** (PostgreSQL) — local ou staging — **jamais la prod**.
- [ ] Un utilisateur **owner** ou **fleet_admin** d'une **organisation test** (table `organization_members`, `status='active'`).
- [ ] Solde wallet org initial connu (souvent 0 ; créé au premier crédit).
- [ ] Accès aux **logs serveur** (terminal `npm run dev`).
- [ ] (Optionnel) Accès **PostHog** pour vérifier `fleet_wallet_credit_added` (nécessite consentement cookies « all »).

---

## 2. MODE A — Local (recommandé)

### 2.1 Base de test locale (PostgreSQL)
```bash
# Cluster jetable (PG installé) :
initdb -D /tmp/pgdata -A trust
pg_ctl -D /tmp/pgdata -o "-p 5432" -l /tmp/pg.log start
# La config vitest/app attend un rôle+base "test" :
psql -p 5432 -U postgres -c "CREATE ROLE test LOGIN PASSWORD 'test' SUPERUSER; CREATE DATABASE test OWNER test;"
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
```
> Le schéma est créé automatiquement par `runMigrations()` au démarrage du serveur.

### 2.2 Stripe CLI : login + listen
```bash
stripe login                 # ouvre le navigateur, autorise le compte TEST
stripe listen --forward-to localhost:3000/webhook/stripe
# → affiche : "Ready! Your webhook signing secret is whsec_xxxx" — COPIER ce whsec_
```

### 2.3 Lancer l'app en local (clés test)
Dans un **second terminal** (mêmes exports DATABASE_URL) :
```bash
export STRIPE_SECRET_KEY="sk_test_xxx"        # clé test, JAMAIS committée
export STRIPE_WEBHOOK_SECRET="whsec_xxx"      # le whsec de `stripe listen`
export CLIENT_URL="http://localhost:5173"     # pour que le retour success pointe vers l'UI
export STRIPE_TAX_ENABLED="false"
npm run dev
# serveur API: http://localhost:3000  |  UI: http://localhost:5173
```

### 2.4 Données test (owner + organisation)
Si besoin de créer un owner+org de test (en base test) :
```bash
psql "$DATABASE_URL" -c "
  INSERT INTO users(id,email,credits) VALUES('u_test_owner','owner_test@local.test',0) ON CONFLICT DO NOTHING;
  INSERT INTO organizations(id,name,slug,plan,country,created_by_user_id)
    VALUES('org_test','Flotte Test','flotte-test','fleet','CH','u_test_owner') ON CONFLICT DO NOTHING;
  INSERT INTO organization_members(id,organization_id,user_id,role,status,joined_at)
    VALUES('m_test','org_test','u_test_owner','owner','active',NOW()) ON CONFLICT DO NOTHING;
"
```
> Connecte-toi ensuite dans l'UI avec `owner_test@local.test` (magic link / login selon le flux d'auth).

### 2.5 Lancer l'achat (Checkout hébergé)
1. Ouvrir `http://localhost:5173/account`, se connecter **owner/fleet_admin**.
2. Section « 🏢 Véhicules d'entreprise » → cliquer un bouton **« N crédits »** (1 / 3 / 10) pour l'org.
3. → redirection vers **`checkout.stripe.com`** (Checkout hébergé Stripe).
4. Payer avec la **carte test** : `4242 4242 4242 4242`, date future, CVC quelconque, code postal quelconque.
5. Stripe redirige vers `http://localhost:5173/account?org_credits=success`.
6. La fenêtre `stripe listen` affiche `checkout.session.completed` **forwardé → 200**.

---

## 3. MODE B — Staging Railway (alternatif)
- Créer un **environnement Railway séparé** (staging) avec sa **propre DB** (jamais la DB prod).
- Variables staging : `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (du endpoint test), `CLIENT_URL=https://<staging-url>`.
- Dashboard Stripe **test** → Developers → Webhooks → add endpoint : `https://<staging-url>/webhook/stripe`, event `checkout.session.completed`. Copier le `whsec` → variable staging.
- Déployer la branche sur staging, puis suivre §2.5 (UI staging) et §4–§8.
- ⚠️ Ne jamais associer un `sk_test` à la DB **prod**. Vérifier le périmètre DB de l'environnement.

---

## 4. Vérifications DB (script lecture seule)
```bash
# Bilan complet org (solde + transactions + doublons + paiements) :
DATABASE_URL="$DATABASE_URL" node scripts/verify-org-wallet.mjs org_test

# Checklist E2E ciblée pour la session payée (PASS/FAIL) :
DATABASE_URL="$DATABASE_URL" node scripts/stripe-b2b-e2e-checklist.mjs org_test <cs_session_id> <credits_attendus>
```
**Attendu** :
- `solde = (initial + crédits du package)` ;
- **1** ligne `wallet_transactions` `type='purchase'`, `related_payment_id = <cs_…>`, `balance_after` cohérent ;
- `payments` : ligne `stripe_session_id=<cs_…>` `status='paid'` ;
- **aucun** `related_payment_id` dupliqué (« ✅ Idempotence OK »).

---

## 5. Vérifications Stripe Dashboard (mode test)
Developers → **Events** → ouvrir l'event `checkout.session.completed` :
- [ ] Session **paid** ;
- [ ] `metadata.kind = org_credits` ;
- [ ] `metadata.organizationId` présent ;
- [ ] `metadata.actorUserId` présent ;
- [ ] `metadata.credits` présent et numérique ;
- [ ] Webhook **delivered 200** (onglet Webhook attempts) ;
- [ ] Après resend (§7) : nouvelle tentative **delivered 200**.

---

## 6. Vérifications UI
- [ ] Retour sur `/account?org_credits=success` ;
- [ ] **Toast** « ✅ Crédits entreprise ajoutés ! » ;
- [ ] Solde « Crédits entreprise · <org> » **mis à jour** (rafraîchi) ;
- [ ] Boutons d'achat visibles **uniquement** owner/fleet_admin ;
- [ ] Un **driver** ne voit PAS les boutons et l'appel `createOrgCheckout` renvoie **FORBIDDEN**.

---

## 7. Test d'idempotence RÉEL (rejeu Stripe)
Récupérer l'`evt_…` de l'event (Dashboard Events ou sortie `stripe listen`), puis :
```bash
# Option CLI :
stripe events resend evt_XXXX
# (ou Dashboard → Events → l'event → "Resend")
```
**Attendu** :
- [ ] Solde wallet **inchangé** (pas de second crédit) ;
- [ ] Toujours **une seule** `wallet_transactions` pour ce `related_payment_id` ;
- [ ] Log serveur : `Webhook org already processed, skipping` ;
- [ ] Re-lancer `verify-org-wallet.mjs` → « ✅ Idempotence OK ».

---

## 8. Non-régression flux PERSONNEL
1. Faire un **achat personnel** (parcours crédits perso existant, carte `4242`).
2. Vérifier `users.credits` **augmenté** :
   ```bash
   psql "$DATABASE_URL" -c "SELECT email, credits FROM users WHERE email='<ton_email>';"
   ```
3. L'event perso a `metadata` **sans** `kind=org_credits` → suit l'ancien chemin (`credits-granted`, `creditTxns reason='purchase'`).
4. **Aucune** nouvelle ligne `wallet_transactions` créée par cet achat perso.
5. Générer un PDF de constat perso → 1 crédit perso consommé (`useCredit`, idempotent par session).

---

## 9. Checklist PASS / FAIL
| # | Étape | PASS/FAIL |
|---|---|---|
| 1 | Checkout org créé (redirection `checkout.stripe.com`) | ☐ |
| 2 | Paiement `4242` réussi | ☐ |
| 3 | Webhook reçu (`stripe listen` → 200) | ☐ |
| 4 | Wallet org crédité (solde +N) | ☐ |
| 5 | `wallet_transactions` purchase créée (`related_payment_id`) | ☐ |
| 6 | `payments.status = paid` | ☐ |
| 7 | Event rejoué (`resend`) → 200 | ☐ |
| 8 | Pas de double crédit (solde inchangé, 1 txn) | ☐ |
| 9 | Achat **perso** OK (`users.credits` +) | ☐ |
| 10 | **Driver** interdit d'acheter (FORBIDDEN) | ☐ |
| 11 | Analytics `fleet_wallet_credit_added` (PostHog) | ☐ |
| 12 | Logs propres (`org-credits-granted`, `already processed`) | ☐ |

→ **12/12 PASS** ⇒ boucle B2B validée bout-en-bout (test mode). Billing Confidence cible **95/100**.

---

## 10. Dépannage
- **Webhook signature invalide** : le `STRIPE_WEBHOOK_SECRET` ne correspond pas au `whsec` de `stripe listen` (Mode A) ou du endpoint (Mode B). Recopier le bon `whsec`.
- **`metadata manquantes` côté org** : l'event ne vient pas de `createOrgCheckout` (ex. `stripe trigger`). Repasser par le bouton UI.
- **Retour pas sur `/account?org_credits=success`** : `CLIENT_URL` non défini en local → l'export §2.3.
- **403 sur l'achat** : l'utilisateur n'est pas owner/fleet_admin de l'org (rôle dans `organization_members`).
- **Solde non rafraîchi** : recharger `/account` (la query wallet se refetch au retour success).

## 11. Sécurité / rollback
- Aucun secret dans Git. Clés test exportées en shell uniquement.
- Rollback (cf. `docs/release-monitoring-and-rollback.md`) : masquer les boutons d'achat / retirer `payment.createOrgCheckout` ; la branche webhook org est isolée (`return`) et n'affecte pas le flux perso.
