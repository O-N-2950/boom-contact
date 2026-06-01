import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * INTÉGRATION RÉELLE (pas de mock) : exécute le VRAI handleStripeWebhook contre une
 * VRAIE base PostgreSQL, avec une VRAIE signature Stripe (generateTestHeaderString),
 * puis REJOUE le même event pour prouver l'idempotence (aucun double crédit).
 *
 * Gardé par RUN_DB_IT=1 : ne s'exécute QUE si une base de test est fournie.
 * En CI/quality:prestore (sans RUN_DB_IT), le bloc est sauté → n'impose pas de DB.
 *
 * Lancement manuel :
 *   RUN_DB_IT=1 DATABASE_URL=postgres://postgres@localhost:5433/boomtest \
 *   STRIPE_WEBHOOK_SECRET=whsec_local_test STRIPE_SECRET_KEY=sk_test_dummy \
 *   npx vitest run server/src/__tests__/stripeWebhookOrg.integration.test.ts
 */
const RUN = process.env.RUN_DB_IT === '1';
const d = RUN ? describe : describe.skip;

const WHSEC = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_local_test';
const ORG = 'org_it_1';
const OWNER = 'usr_it_owner';
const CREDITS = 10;

let db: any, schema: any, handleStripeWebhook: any, StripeLib: any, stripeForSig: any;
let eq: any;

async function signedEvent(payloadObj: any) {
  const payload = JSON.stringify(payloadObj);
  const header = stripeForSig.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
  return { payload: Buffer.from(payload), header };
}

d('INTÉGRATION RÉELLE webhook org → Postgres → wallet → replay', () => {
  beforeAll(async () => {
    ({ db, schema } = await import('../db/index.js'));
    ({ eq } = await import('drizzle-orm'));
    const { runMigrations } = await import('../db/migrate.js');
    await runMigrations();
    ({ handleStripeWebhook } = await import('../services/stripe.service.js'));
    StripeLib = (await import('stripe')).default;
    stripeForSig = new StripeLib(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

    // Seed : user owner + organisation (FK cible du wallet)
    await db.insert(schema.users).values({ id: OWNER, email: 'it_owner@test.local', credits: 0 }).onConflictDoNothing();
    await db.insert(schema.organizations).values({
      id: ORG, name: 'IT Test Fleet', slug: 'it-test-fleet-' + Date.now(), plan: 'fleet', country: 'CH', createdByUserId: OWNER,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    try {
      await db.delete(schema.walletTransactions);
      await db.delete(schema.creditWallets).where(eq(schema.creditWallets.organizationId, ORG));
      await db.delete(schema.payments);
      await db.delete(schema.creditTxns);
      await db.delete(schema.organizations).where(eq(schema.organizations.id, ORG));
      await db.delete(schema.users).where(eq(schema.users.id, OWNER));
      const { closeDbPool } = await import('../db/index.js');
      await closeDbPool();
    } catch { /* best effort */ }
  });

  it('1) achat ORG : webhook crédite le wallet org + payments paid + 1 transaction purchase', async () => {
    const sessionId = 'cs_it_org_' + Date.now();
    // pré-enregistrer le paiement pending (comme createOrgCheckout)
    await db.insert(schema.payments).values({
      id: 'pay_it_1', userEmail: 'it_owner@test.local', stripeSessionId: sessionId,
      packageId: 'pack10', packageLabel: '10 constats (entreprise)', creditsGranted: CREDITS,
      amountCents: 3490, currency: 'EUR', status: 'pending',
    });
    const evt = { id: 'evt_it_1', type: 'checkout.session.completed', data: { object: {
      id: sessionId, object: 'checkout.session', amount_total: 3490, currency: 'eur',
      metadata: { kind: 'org_credits', organizationId: ORG, credits: String(CREDITS), actorUserId: OWNER, actorEmail: 'it_owner@test.local', packageId: 'pack10' },
    } } };
    const { payload, header } = await signedEvent(evt);
    await handleStripeWebhook(payload, header);

    const wallet = await db.query.creditWallets.findFirst({ where: eq(schema.creditWallets.organizationId, ORG) });
    expect(wallet?.credits).toBe(CREDITS);
    const pay = await db.query.payments.findFirst({ where: eq(schema.payments.stripeSessionId, sessionId) });
    expect(pay?.status).toBe('paid');
    const txns = await db.select().from(schema.walletTransactions).where(eq(schema.walletTransactions.relatedPaymentId, sessionId));
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('purchase');
    expect(txns[0].balanceAfter).toBe(CREDITS);
    expect(txns[0].relatedOrganizationId).toBe(ORG);

    // ── REPLAY : rejouer EXACTEMENT le même event ──
    await handleStripeWebhook(payload, header);
    const walletAfter = await db.query.creditWallets.findFirst({ where: eq(schema.creditWallets.organizationId, ORG) });
    expect(walletAfter?.credits).toBe(CREDITS); // PAS de double crédit
    const txnsAfter = await db.select().from(schema.walletTransactions).where(eq(schema.walletTransactions.relatedPaymentId, sessionId));
    expect(txnsAfter).toHaveLength(1); // toujours UNE seule transaction
  });

  it('2) achat PERSONNEL : webhook crédite users.credits, AUCUNE transaction wallet', async () => {
    await db.insert(schema.users).values({ id: 'usr_it_perso', email: 'it_perso@test.local', credits: 0 }).onConflictDoNothing();
    const sessionId = 'cs_it_perso_' + Date.now();
    await db.insert(schema.payments).values({
      id: 'pay_it_2', userEmail: 'it_perso@test.local', stripeSessionId: sessionId,
      packageId: 'single', packageLabel: '1 constat', creditsGranted: 1, amountCents: 490, currency: 'EUR', status: 'pending',
    });
    const evt = { id: 'evt_it_2', type: 'checkout.session.completed', data: { object: {
      id: sessionId, object: 'checkout.session', amount_total: 490, currency: 'eur',
      metadata: { packageId: 'single', userEmail: 'it_perso@test.local', credits: '1' },
    } } };
    const { payload, header } = await signedEvent(evt);
    const before = await db.select().from(schema.walletTransactions);
    await handleStripeWebhook(payload, header);

    const user = await db.query.users.findFirst({ where: eq(schema.users.email, 'it_perso@test.local') });
    expect(user?.credits).toBe(1); // flux perso fonctionne
    const after = await db.select().from(schema.walletTransactions);
    expect(after.length).toBe(before.length); // aucune nouvelle transaction wallet
    // cleanup user perso
    await db.delete(schema.users).where(eq(schema.users.id, 'usr_it_perso'));
  });

  it('3) signature invalide → rejet', async () => {
    const evt = { id: 'evt_bad', type: 'checkout.session.completed', data: { object: { id: 'x', metadata: {} } } };
    await expect(handleStripeWebhook(Buffer.from(JSON.stringify(evt)), 't=1,v1=deadbeef')).rejects.toThrow(/signature invalide/i);
  });
});
