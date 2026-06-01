import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  findMemberFirst: vi.fn(),
  findWalletFirst: vi.fn(),
  findTxnsMany: vi.fn().mockResolvedValue([]),
}));
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      organizationMembers: { findFirst: h.findMemberFirst },
      creditWallets:       { findFirst: h.findWalletFirst },
      walletTransactions:  { findMany: h.findTxnsMany },
    },
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ creditWallets: {}, walletTransactions: {}, sessions: {}, organizationMembers: {}, users: {}, organizations: {} }));
vi.mock('../services/stripe.service.js', () => ({ useCredit: vi.fn(), getUserCredits: vi.fn() }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  h.findMemberFirst.mockReset();
  h.findWalletFirst.mockReset();
  h.findTxnsMany.mockReset().mockResolvedValue([]);
});

describe('Permissions finance', () => {
  it('owner/fleet_admin peuvent voir wallet + transactions + export', async () => {
    const { canViewOrganizationWallet, canViewOrganizationTransactions, canExportOrganizationWallet } = await import('../services/wallet.service.js');
    for (const role of ['owner', 'fleet_admin']) {
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canViewOrganizationWallet('u', 'o')).toBe(true);
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canViewOrganizationTransactions('u', 'o')).toBe(true);
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canExportOrganizationWallet('u', 'o')).toBe(true);
    }
  });
  it('driver NE voit PAS la finance ; viewers NON ; non-membre NON', async () => {
    const { canViewOrganizationWallet, canViewOrganizationTransactions } = await import('../services/wallet.service.js');
    for (const role of ['driver', 'broker_viewer', 'insurer_viewer']) {
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canViewOrganizationWallet('u', 'o')).toBe(false);
      h.findMemberFirst.mockResolvedValueOnce({ role });
      expect(await canViewOrganizationTransactions('u', 'o')).toBe(false);
    }
    h.findMemberFirst.mockResolvedValueOnce(undefined);
    expect(await canViewOrganizationWallet('intrus', 'o')).toBe(false);
  });
});

describe('getOrganizationWalletView', () => {
  it('refuse un driver', async () => {
    const { getOrganizationWalletView } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    await expect(getOrganizationWalletView('u', 'o')).rejects.toThrow(/FORBIDDEN/);
  });
  it('renvoie le solde pour un owner (wallet absent → 0)', async () => {
    const { getOrganizationWalletView } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findWalletFirst.mockResolvedValueOnce(undefined);
    const v = await getOrganizationWalletView('u', 'o');
    expect(v.credits).toBe(0); expect(v.canManageBilling).toBe(true); expect(v.canExport).toBe(true);
  });
});

describe('listOrganizationTransactions — DTO anti-PII + pagination', () => {
  it('refuse un non-membre', async () => {
    const { listOrganizationTransactions } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce(undefined);
    await expect(listOrganizationTransactions('intrus', 'o')).rejects.toThrow(/FORBIDDEN/);
  });

  it('tronque session/payment IDs et N\'EXPOSE PAS createdByUserId ni PII', async () => {
    const { listOrganizationTransactions } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' }); // canView
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1' });
    h.findTxnsMany.mockResolvedValueOnce([{
      id: 't1', type: 'purchase', amount: 10, balanceAfter: 10, reason: 'org_checkout',
      createdAt: new Date('2026-05-01T10:00:00Z'),
      relatedSessionId: 'cs_test_abcdef1234567890', relatedPaymentId: 'cs_pay_zzzzzzzz9999',
      createdByUserId: 'usr_secret_owner', walletId: 'w1',
    }]);
    const { items } = await listOrganizationTransactions('u', 'o', { limit: 10 });
    expect(items).toHaveLength(1);
    const t = items[0] as any;
    // champs exposés
    expect(t).toMatchObject({ id: 't1', type: 'purchase', amount: 10, balanceAfter: 10, reason: 'org_checkout' });
    // IDs tronqués (pas en clair complet)
    expect(t.relatedSessionShort).toContain('…');
    expect(t.relatedSessionShort).not.toBe('cs_test_abcdef1234567890');
    expect(t.relatedPaymentShort).toContain('…');
    // AUCUNE PII / pas de createdByUserId / pas de session complète
    expect(t.createdByUserId).toBeUndefined();
    expect(t.relatedSessionId).toBeUndefined();
    expect(t.relatedPaymentId).toBeUndefined();
    expect(JSON.stringify(t)).not.toContain('usr_secret_owner');
  });

  it('pagination : limit+1 → nextCursor renvoyé', async () => {
    const { listOrganizationTransactions } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'fleet_admin' });
    h.findWalletFirst.mockResolvedValueOnce({ id: 'w1' });
    const mk = (i: number) => ({ id: 't' + i, type: 'consumption', amount: -1, balanceAfter: 9 - i, reason: 'constat', createdAt: new Date(Date.now() - i * 1000), walletId: 'w1' });
    h.findTxnsMany.mockResolvedValueOnce([mk(0), mk(1), mk(2)]); // limit 2 → 3 rows
    const res = await listOrganizationTransactions('u', 'o', { limit: 2 });
    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).not.toBeNull();
  });

  it('wallet absent → liste vide, pas de curseur', async () => {
    const { listOrganizationTransactions } = await import('../services/wallet.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findWalletFirst.mockResolvedValueOnce(undefined);
    const res = await listOrganizationTransactions('u', 'o');
    expect(res.items).toHaveLength(0); expect(res.nextCursor).toBeNull();
  });
});
