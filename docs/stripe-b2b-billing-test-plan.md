# Stripe B2B Billing — Test Plan (Checkout → Webhook → Organization Wallet)

> Objectif : valider en **mode test Stripe** la boucle achat de crédits entreprise.
> Aucune vraie carte. Aucune clé live. Aucun secret commité.

## 0. Pré-requis & variables Stripe

Variables nécessaires (service Railway / env local) :
- `STRIPE_SECRET_KEY` — clé **test** (`sk_test_…`) pour ce test (la prod utilise une clé live).
- `STRIPE_WEBHOOK_SECRET` — secret du webhook **test** (`whsec_…`), obtenu via Stripe CLI ou Dashboard test.
- `CLIENT_URL` (ou `RAILWAY_PUBLIC_DOMAIN`) — base des `success_url`/`cancel_url`.
- (optionnel) `STRIPE_TAX_ENABLED`.

> ⚠️ Ne JAMAIS exécuter ce test contre l'environnement de production (clés live). Utiliser un
> environnement/branche de test avec des clés `sk_test_…` + `whsec_…`, ou Stripe CLI en local.

Comment savoir test vs live : une clé `sk_test_…`/`pk_test_…` = test ; `sk_live_…` = live.

## 1. Préconditions
- Un utilisateur **owner** ou **fleet_admin** d'une organisation existante (table `organization_members`, `status='active'`).
- Wallet d'org : créé à la volée (`getOrCreateOrganizationWallet`) au premier crédit.
- Webhook test configuré pour pointer vers `/webhook/stripe` avec le secret test.
- Noter le **solde org initial** (voir script §6).

## 2. Test principal (happy path)
1. Se connecter comme owner/fleet_admin.
2. Aller dans Compte → section « 🏢 Véhicules d'entreprise ».
3. Cliquer un bouton d'achat (1 / 3 / 10 crédits) pour l'organisation.
4. Vérifier la redirection vers **Stripe Checkout** (URL `checkout.stripe.com`).
5. Payer avec une **carte test** : `4242 4242 4242 4242`, date future, CVC quelconque, code postal quelconque.
6. Vérifier le retour sur `…/account?org_credits=success`.
7. Vérifier le **toast** « ✅ Crédits entreprise ajoutés ! ».
8. Vérifier que le **solde wallet** affiché a augmenté du bon nombre de crédits.
9. Vérifier `wallet_transactions` : une ligne `type='purchase'`, `reason='org_checkout'`, `related_payment_id = <id session Stripe>`, `balance_after` cohérent.
10. Vérifier `payments` : la ligne (`stripe_session_id = <session>`) est `status='paid'`, `paid_at` renseigné.
11. Vérifier l'event analytics `fleet_wallet_credit_added` (PostHog, si consentement actif).
12. Vérifier les logs serveur : `org-checkout-created` puis `org-credits-granted`.

**Carte test Stripe utiles**
- Succès : `4242 4242 4242 4242`
- 3DS requis : `4000 0027 6000 3184`
- Refusée : `4000 0000 0000 0002`

## 3. Test d'idempotence (le point critique)
1. Récupérer l'event `checkout.session.completed` dans le Dashboard test (Developers → Events) ou via Stripe CLI.
2. **Rejouer** l'event :
   - Dashboard : bouton « Resend » sur l'event.
   - ou Stripe CLI : `stripe events resend <evt_id>`.
3. Vérifier que le solde du wallet **n'augmente PAS** une seconde fois.
4. Vérifier qu'il existe **une seule** ligne `wallet_transactions` pour ce `related_payment_id`.
5. Vérifier le log : `Webhook org already processed, skipping` (garde `payments.status='paid'`)
   et/ou la garde idempotente de `creditOrganizationFromPurchase` (`already: true`).

> Double garde : (a) `payments.status='paid'` ; (b) unicité `wallet_transactions.related_payment_id` (type purchase).

## 4. Test flux personnel (non-régression)
1. Faire un **achat personnel** de crédits (parcours existant, sans organisation).
2. Vérifier `users.credits` augmenté.
3. Vérifier que le webhook (metadata **sans** `kind=org_credits`) suit l'ancien chemin : `credits-granted`, `creditTxns reason='purchase'`.
4. Générer un PDF (constat perso) → 1 crédit personnel consommé (`useCredit`, idempotent par session).
5. Confirmer qu'aucune ligne `wallet_transactions` n'a été créée pour cet achat perso.

## 5. Tests d'erreur
| Cas | Attendu |
|---|---|
| Non-membre tente `payment.createOrgCheckout` | `FORBIDDEN` |
| `driver` tente l'achat org | `FORBIDDEN` (achat réservé owner/fleet_admin) |
| Organisation inexistante | erreur propre (FORBIDDEN/role absent) |
| Event org rejoué (déjà payé) | pas de double crédit |
| Webhook sans `kind=org_credits` | flux personnel inchangé |
| Webhook org sans `organizationId` ou `credits<=0` | log `Webhook org_credits: metadata manquantes`, aucun crédit |

## 6. Vérification base de données (script sans secret)
Script : `scripts/verify-org-wallet.mjs` — lit `DATABASE_URL` depuis l'environnement (aucun secret en dur).

```bash
# Sur Railway shell (ou local avec DATABASE_URL test exporté) :
node scripts/verify-org-wallet.mjs <organizationId>
# Affiche : solde du wallet org + dernières wallet_transactions + payments liés.
```

## 7. Couverture automatisée (déjà en place)
- `server/src/__tests__/stripeWebhookOrg.test.ts` : exerce le **vrai** `handleStripeWebhook`
  (Stripe SDK + db mockés) — routage org, isolation du chemin perso, idempotence, signature invalide,
  `createOrgCheckout` metadata + `success_url`.
- `server/src/__tests__/walletBilling.test.ts` : `creditOrganizationFromPurchase` (idempotent par session),
  `canManageOrganizationBilling`, résolution billing source, consommation.

## 8. Rollback
- Le sprint d'achat org est **additif** (aucune migration). Pour neutraliser sans rollback DB :
  masquer les boutons d'achat (AccountPage) ou retirer la route `payment.createOrgCheckout`.
- La branche webhook org est isolée et terminée par `return` : la retirer ne touche pas le chemin perso.
- Les tables `credit_wallets`/`wallet_transactions` peuvent rester (inertes) sans impact B2C.

## 9. Logs à surveiller
- `org-checkout-created` (création Checkout)
- `org-credits-granted` (crédit appliqué)
- `Webhook org already processed, skipping` (idempotence)
- `Webhook org_credits: metadata manquantes` (anomalie metadata)
- `credits-granted` / `credit-auto-used` (flux personnel — doit rester inchangé)
