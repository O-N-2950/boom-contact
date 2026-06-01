import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  findMemberFirst: vi.fn(),
  findWalletFirst: vi.fn(),
  findSessionFirst: vi.fn(),
  txExisting: [] as any[],
  txUpdateReturning: [{ credits: 4 }] as any[],
  useCredit: vi.fn().mockResolvedValue(true),
}));

const tx = {
  select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(h.txExisting) }) }) })),
  update: vi.fn(() => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve(h.txUpdateReturning) }) }) })),
  insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
};

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      organizationMembers: { findFirst: h.findMemberFirst },
      creditWallets:       { findFirst: h.findWalletFirst },
      sessions:            { findFirst: h.findSessionFirst },
    },
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve(h.txUpdateReturning) }) }) })),
    transaction: vi.fn((cb: any) => cb(tx)),
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ creditWallets: {}, walletTransactions: {}, sessions: {}, organizationMembers: {}, users: {}, organizations: {} }));
vi.mock('../services/stripe.service.js', () => ({ useCredit: h.useCredit, getUserCredits: vi.fn().mockResolvedValue(0) }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  h.findMemberFirst.mockReset();
  h.findWalletFirst.mockReset();
  h.findSessionFirst.mockReset();
  h.useCredit.mockReset().mockResolvedValue(true);
  h.txExisting = [];
  h.txUpdateReturning = [{ credits: 4 }];
});

describe('canUseOrganizationWallet', () => {
  it('owner/fleet_admin/driver peuvent consommer ; viewer non ; non-membre non', async () => {
    const { canUseOrganizationWallet } = await import('../services/wallet.service.js');
    for (const role of ['owner', 'fleet_admin', 'driver']) {
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canUseOrganizationWallet('u', 'org_1')).toBe(true);
    }
    h.findMemberFirst.mockResolvedValueOnce({ role: 'broker_viewer' });
    expect(await canUseOrganizationWallet('u', 'org_1')).toBe(false);
    h.findMemberFirst.mockResolvedValueOnce(undefined);
    expect(await canUseOrganizationWallet('u', 'org_1')).toBe(false);
  });
});

describe('addOrganizationCredits', () => {
  it('refuse un montant non positif', async () => {
    const { addOrganizationCredits } = await import('../services/wallet.service.js');
    await expect(addOrganizationCredits('org_1', 0, 'grant')).rejects.toThrow(/CONFLICT/);
    await expect(addOrganizationCredits('org_1', -5, 'grant')).rejects.toThrow(/CONFLICT/);
  });
  it('crédite le wallet et renvoie le solde', async () => {
    const { addOrganizationCredits } = await import('../services/wallet.service.js');
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 0 }); // wallet existe
    h.txUpdateReturning = [{ credits: 10 }];
    const r = await addOrganizationCredits('org_1', 10, 'grant', 'owner_user');
    expect(r.ok).toBe(true);
    expect(r.balanceAfter).toBe(10);
  });
});

describe('consumeOrganizationCredit', () => {
  it('refuse un non-membre (not_member)', async () => {
    const { consumeOrganizationCredit } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce(undefined);
    const r = await consumeOrganizationCredit('org_1', 's1', 'intrus');
    expect(r.ok).toBe(false); expect(r.reason).toBe('not_member');
  });
  it('débite 1 crédit si solde suffisant', async () => {
    const { consumeOrganizationCredit } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 5 });
    h.txExisting = []; h.txUpdateReturning = [{ credits: 4 }];
    const r = await consumeOrganizationCredit('org_1', 's1', 'driver_user');
    expect(r.ok).toBe(true); expect(r.balanceAfter).toBe(4);
  });
  it('idempotent : déjà consommé pour cette session (already)', async () => {
    const { consumeOrganizationCredit } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 5 });
    h.txExisting = [{ id: 'txn_old' }];
    const r = await consumeOrganizationCredit('org_1', 's1', 'driver_user');
    expect(r.ok).toBe(true); expect(r.reason).toBe('already');
  });
  it('solde insuffisant → ok:false reason insufficient (jamais négatif)', async () => {
    const { consumeOrganizationCredit } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 0 });
    h.txExisting = []; h.txUpdateReturning = []; // update where credits>0 → aucune ligne
    const r = await consumeOrganizationCredit('org_1', 's1', 'driver_user');
    expect(r.ok).toBe(false); expect(r.reason).toBe('insufficient');
  });
});

describe('resolveBillingSourceForConstat', () => {
  it('aucune org de facturation → personnel', async () => {
    const { resolveBillingSourceForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: null });
    expect(await resolveBillingSourceForConstat('u', 's1')).toEqual({ source: 'personal', organizationId: null });
  });
  it('org + membre + solde>0 → organisation', async () => {
    const { resolveBillingSourceForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });   // canUse
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 3 }); // balance>0
    expect(await resolveBillingSourceForConstat('u', 's1')).toEqual({ source: 'organization', organizationId: 'org_1' });
  });
  it('org mais solde 0 → fallback personnel (non bloquant)', async () => {
    const { resolveBillingSourceForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 0 });
    expect(await resolveBillingSourceForConstat('u', 's1')).toEqual({ source: 'personal', organizationId: null });
  });
  it('org mais plus membre → fallback personnel', async () => {
    const { resolveBillingSourceForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce(undefined); // plus membre
    expect(await resolveBillingSourceForConstat('u', 's1')).toEqual({ source: 'personal', organizationId: null });
  });
});

describe('consumeCreditForConstat (routage)', () => {
  it('véhicule personnel → crédit personnel (useCredit)', async () => {
    const { consumeCreditForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: null });
    h.useCredit.mockResolvedValueOnce(true);
    const r = await consumeCreditForConstat('u@x.com', 'u', 's1');
    expect(r).toEqual({ ok: true, billingSource: 'personal' });
    expect(h.useCredit).toHaveBeenCalledWith('u@x.com', 's1');
  });
  it('véhicule org (solde>0) → wallet organisation', async () => {
    const { consumeCreditForConstat } = await import('../services/wallet.service.js');
    h.findSessionFirst.mockResolvedValueOnce({ id: 's1', billingOrganizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });    // resolve canUse
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 3 }); // resolve balance>0
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });    // consume canUse
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1', credits: 3 }); // getOrCreate
    h.txExisting = []; h.txUpdateReturning = [{ credits: 2 }];
    const r = await consumeCreditForConstat('u@x.com', 'u', 's1');
    expect(r.ok).toBe(true); expect(r.billingSource).toBe('organization');
    expect(h.useCredit).not.toHaveBeenCalled();
  });
});
