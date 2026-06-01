import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Exerce le VRAI handleStripeWebhook + createOrgCheckout de stripe.service.
 * Stripe SDK, db, wallet.service et analytics sont mockés → on prouve le routage,
 * l'isolation du chemin perso, et l'idempotence sans toucher au réseau Stripe.
 */
const h = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  checkoutCreate: vi.fn(),
  paymentsLookup: [] as any[],     // résultat de db.select(payments)
  txUserLookup: [{ email: 'u@x.com', credits: 2 }] as any[],
  creditOrgFromPurchase: vi.fn().mockResolvedValue({ ok: true, balanceAfter: 10 }),
  trackPaiement: vi.fn().mockResolvedValue(undefined),
  useCredit: vi.fn().mockResolvedValue(true),
  dbTransaction: vi.fn(),
  dbInsertValues: vi.fn().mockResolvedValue(undefined),
  dbUpdate: vi.fn(),
}));

// ── Stripe SDK mock (classe constructible) ──
vi.mock('stripe', () => {
  return {
    default: class FakeStripe {
      webhooks = { constructEvent: h.constructEvent };
      checkout = { sessions: { create: h.checkoutCreate } };
    },
  };
});

// ── db mock ──
const txObj = {
  update: vi.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
  select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(h.txUserLookup) }) }) })),
  insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
};
h.dbTransaction.mockImplementation((cb: any) => cb(txObj));
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(h.paymentsLookup) }) }) })),
    update: vi.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
    insert: vi.fn(() => ({ values: h.dbInsertValues })),
    transaction: h.dbTransaction,
  },
  schema: { payments: { stripeSessionId: 'stripeSessionId' }, users: {}, creditTxns: {} },
}));
vi.mock('../services/wallet.service.js', () => ({
  creditOrganizationFromPurchase: h.creditOrgFromPurchase,
  canManageOrganizationBilling: vi.fn().mockResolvedValue(true),
}));
vi.mock('../analytics.js', () => ({ trackPaiementEffectue: h.trackPaiement }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), payment: vi.fn() } }));
vi.mock('../constants.js', () => ({ makeId: () => 'gen_id_123' }));

const SECRET = 'whsec_test';
beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  h.constructEvent.mockReset();
  h.creditOrgFromPurchase.mockReset().mockResolvedValue({ ok: true, balanceAfter: 10 });
  h.trackPaiement.mockReset().mockResolvedValue(undefined);
  h.dbTransaction.mockClear();
  h.checkoutCreate.mockReset();
  h.paymentsLookup = [];
  h.txUserLookup = [{ email: 'u@x.com', credits: 2 }];
});

function orgEvent(overrides: Record<string, any> = {}) {
  return {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_org_1', amount_total: 3490, currency: 'eur', metadata: {
      kind: 'org_credits', organizationId: 'org_1', credits: '10', actorUserId: 'owner_1', actorEmail: 'owner@x.com', packageId: 'pack10',
      ...overrides,
    } } },
  };
}
function personalEvent() {
  return {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_perso_1', amount_total: 490, currency: 'eur', metadata: {
      packageId: 'single', userEmail: 'u@x.com', credits: '1',
    } } },
  };
}

describe('handleStripeWebhook — routage org/perso', () => {
  it('signature invalide → throw', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    await expect(handleStripeWebhook(Buffer.from('x'), 'sig')).rejects.toThrow(/signature invalide/i);
  });

  it('event ORG → crédite le wallet org, NE passe PAS par le flux perso', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockReturnValue(orgEvent() as any);
    h.paymentsLookup = []; // pas encore payé
    await handleStripeWebhook(Buffer.from('x'), 'sig');
    expect(h.creditOrgFromPurchase).toHaveBeenCalledWith('org_1', 10, 'cs_org_1', 'owner_1');
    expect(h.dbTransaction).not.toHaveBeenCalled(); // le flux perso utilise db.transaction → jamais atteint
  });

  it('event ORG déjà payé → idempotent, NE recrédite PAS', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockReturnValue(orgEvent() as any);
    h.paymentsLookup = [{ status: 'paid' }]; // déjà traité
    await handleStripeWebhook(Buffer.from('x'), 'sig');
    expect(h.creditOrgFromPurchase).not.toHaveBeenCalled();
  });

  it('event ORG sans organizationId → log erreur, pas de crédit, pas de flux perso', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockReturnValue(orgEvent({ organizationId: undefined }) as any);
    await handleStripeWebhook(Buffer.from('x'), 'sig');
    expect(h.creditOrgFromPurchase).not.toHaveBeenCalled();
    expect(h.dbTransaction).not.toHaveBeenCalled();
  });

  it('event ORG avec credits=0 → refus propre, pas de crédit', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockReturnValue(orgEvent({ credits: '0' }) as any);
    await handleStripeWebhook(Buffer.from('x'), 'sig');
    expect(h.creditOrgFromPurchase).not.toHaveBeenCalled();
  });

  it('event PERSONNEL → flux perso intact (db.transaction), wallet org NON appelé', async () => {
    const { handleStripeWebhook } = await import('../services/stripe.service.js');
    h.constructEvent.mockReturnValue(personalEvent() as any);
    h.paymentsLookup = []; // pas encore payé
    await handleStripeWebhook(Buffer.from('x'), 'sig');
    expect(h.dbTransaction).toHaveBeenCalled();      // chemin perso exécuté
    expect(h.creditOrgFromPurchase).not.toHaveBeenCalled(); // org jamais touché
  });
});

describe('createOrgCheckout — metadata + success_url', () => {
  it('construit un Checkout org avec metadata correcte et success_url org_credits=success', async () => {
    const { createOrgCheckout } = await import('../services/stripe.service.js');
    h.checkoutCreate.mockResolvedValue({ id: 'cs_new', url: 'https://stripe.test/cs_new' });
    const res = await createOrgCheckout('org_42', 'pack3', 'admin@x.com', 'admin_1', 'EUR', 'fr');
    expect(res.url).toContain('stripe.test');
    expect(h.checkoutCreate).toHaveBeenCalledTimes(1);
    const arg = h.checkoutCreate.mock.calls[0][0];
    expect(arg.metadata.kind).toBe('org_credits');
    expect(arg.metadata.organizationId).toBe('org_42');
    expect(arg.metadata.actorUserId).toBe('admin_1');
    expect(arg.metadata.credits).toBe('3');
    expect(arg.success_url).toContain('org_credits=success');
    expect(arg.cancel_url).toContain('org_credits=cancelled');
    expect(arg.mode).toBe('payment');
  });
});
