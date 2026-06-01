# Stripe B2B — Quick Execution Checklist (copier-coller)

> Procédure courte pour valider le test réel Stripe B2B. ~15 min.
> Détails complets : `docs/stripe-cli-e2e-b2b-runbook.md`.
> ⚠️ **TEST MODE UNIQUEMENT** — carte `4242…`, clés `sk_test`/`whsec`. Jamais de `sk_live`, jamais committer.

---

## 1. Clés test
- `STRIPE_SECRET_KEY=sk_test_...` (Dashboard **test** → Developers → API keys)
- `STRIPE_WEBHOOK_SECRET=whsec_...` (fourni par `stripe listen`, étape 2)
- ❌ jamais `sk_live` · ❌ jamais committer dans Git (exports shell uniquement)

## 2. Stripe CLI (terminal 1)
```bash
stripe login
stripe listen --forward-to localhost:3000/webhook/stripe
# → COPIER le "whsec_..." affiché
```

## 3. Lancer boom.contact en local (terminal 2)
```bash
# base de test (cluster jetable) :
initdb -D /tmp/pgdata -A trust
pg_ctl -D /tmp/pgdata -o "-p 5432" -l /tmp/pg.log start
psql -p 5432 -U postgres -c "CREATE ROLE test LOGIN PASSWORD 'test' SUPERUSER; CREATE DATABASE test OWNER test;"
export DATABASE_URL="postgresql://test:test@localhost:5432/test"

export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...        # celui de l'étape 2
export CLIENT_URL=http://localhost:5173
npm run dev
# API: http://localhost:3000  |  UI: http://localhost:5173
```

## 4. User owner/fleet_admin + org test
```bash
# créer owner + org + membership (terminal 3) :
psql "$DATABASE_URL" -c "
  INSERT INTO users(id,email,credits) VALUES('u_test_owner','owner_test@local.test',0) ON CONFLICT DO NOTHING;
  INSERT INTO organizations(id,name,slug,plan,country,created_by_user_id)
    VALUES('org_test','Flotte Test','flotte-test','fleet','CH','u_test_owner') ON CONFLICT DO NOTHING;
  INSERT INTO organization_members(id,organization_id,user_id,role,status,joined_at)
    VALUES('m_test','org_test','u_test_owner','owner','active',NOW()) ON CONFLICT DO NOTHING;"
# vérifier l'org + solde initial (doit être 0 / wallet absent) :
psql "$DATABASE_URL" -c "SELECT id,name FROM organizations WHERE id='org_test';"
node scripts/verify-org-wallet.mjs org_test     # attendu : 'Aucun wallet' ou solde=0
```
> Se connecter dans l'UI avec `owner_test@local.test`.

## 5. Achat test
- `http://localhost:5173/account` → section « 🏢 Véhicules d'entreprise »
- cliquer **« 10 crédits »** (ou 1 / 3) → redirection **Stripe Checkout**
- carte : `4242 4242 4242 4242` · date future · CVC quelconque · code postal quelconque
- → noter l'**id de session** `cs_...` (URL Checkout / Dashboard Events)

## 6. Vérifs après paiement
- [ ] retour sur `/account?org_credits=success`
- [ ] toast « ✅ Crédits entreprise ajoutés ! »
- [ ] solde wallet **augmenté** (UI)
- [ ] `payment status = paid` + `wallet_transaction purchase` créée (voir étape 7)

## 7. Scripts de vérification (lecture seule)
```bash
node scripts/verify-org-wallet.mjs org_test
node scripts/stripe-b2b-e2e-checklist.mjs org_test <cs_session_id> 10
# attendu : ✅ wallet=10, ✅ 1 txn purchase, ✅ payment paid, ✅ idempotence OK, "TOUS LES CONTRÔLES PASSENT"
```

## 8. Rejeu webhook (idempotence)
```bash
stripe events resend evt_...        # evt_ depuis la sortie `stripe listen` ou Dashboard → Events → Resend
node scripts/stripe-b2b-e2e-checklist.mjs org_test <cs_session_id> 10
# attendu : solde INCHANGÉ (10), TOUJOURS 1 seule txn, ✅ idempotence OK
# log serveur attendu : "Webhook org already processed, skipping"
```

## 9. Non-régression achat personnel
```bash
# acheter des crédits PERSONNELS via le parcours habituel (carte 4242), puis :
psql "$DATABASE_URL" -c "SELECT email,credits FROM users WHERE email='<ton_email>';"   # credits ↑
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM wallet_transactions;"                      # INCHANGÉ (wallet org non touché)
```

## 10. Checklist finale 12/12
| # | Étape | PASS |
|---|---|---|
| 1 | Checkout org créé (redirection Stripe) | ☐ |
| 2 | Paiement `4242` réussi | ☐ |
| 3 | Webhook livré 200 (`stripe listen`) | ☐ |
| 4 | Wallet crédité | ☐ |
| 5 | Transaction `purchase` créée | ☐ |
| 6 | `payment status = paid` | ☐ |
| 7 | Retour UI `?org_credits=success` + toast | ☐ |
| 8 | Rejeu event OK (resend 200) | ☐ |
| 9 | Pas de double crédit (solde inchangé, 1 txn) | ☐ |
| 10 | Driver interdit d'acheter (FORBIDDEN) | ☐ |
| 11 | Achat personnel OK (`users.credits` ↑) | ☐ |
| 12 | Analytics `fleet_wallet_credit_added` + logs propres | ☐ |

## 11. Résultat attendu
**12/12 PASS ⇒ B2B Billing Confidence = 95/100.** Boucle B2B validée bout-en-bout en mode test.

---
**Dépannage rapide** : signature invalide → mauvais `whsec` ; `metadata manquantes` → ne pas utiliser `stripe trigger` (passer par le bouton UI) ; pas de retour success → `CLIENT_URL` non défini ; 403 → user pas owner/fleet_admin.
