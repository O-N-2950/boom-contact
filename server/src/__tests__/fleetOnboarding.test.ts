import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  txInsert: vi.fn(),
  findMemberFirst: vi.fn(),
  findUserFirst: vi.fn(),
  findInviteFirst: vi.fn(),
  findInvitesMany: vi.fn().mockResolvedValue([]),
  transaction: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

function makeTx(opts: { insertThrowsOnNth?: number } = {}) {
  let insertCalls = 0;
  return {
    insert: vi.fn(() => ({ values: vi.fn(async () => { insertCalls++; if (opts.insertThrowsOnNth && insertCalls === opts.insertThrowsOnNth) throw new Error('insert failed'); }) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })),
    query: { organizationMembers: { findFirst: vi.fn().mockResolvedValue(undefined) } },
  };
}

vi.mock('../db/index.js', () => ({
  db: {
    transaction: h.transaction,
    insert: h.insert,
    update: h.update,
    query: {
      organizationMembers: { findFirst: h.findMemberFirst },
      users:               { findFirst: h.findUserFirst },
      organizationInvites: { findFirst: h.findInviteFirst, findMany: h.findInvitesMany },
    },
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ organizations: {}, organizationMembers: {}, users: {}, organizationInvites: {} }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  Object.values(h).forEach((fn: any) => fn.mockReset?.());
  h.findInvitesMany.mockResolvedValue([]);
});

describe('createOrganization — atomique', () => {
  it('crée org + owner dans UNE transaction', async () => {
    const { createOrganization } = await import('../services/organization.service.js');
    const tx = makeTx();
    h.transaction.mockImplementationOnce(async (cb: any) => cb(tx));
    const res = await createOrganization('u1', { name: 'Flotte SA' });
    expect(res.ok).toBe(true);
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledTimes(2); // org + membership
  });

  it('rollback : si insertion owner échoue, la transaction propage (pas d\'org orpheline)', async () => {
    const { createOrganization } = await import('../services/organization.service.js');
    const tx = makeTx({ insertThrowsOnNth: 2 }); // 2e insert (membership) échoue
    h.transaction.mockImplementationOnce(async (cb: any) => cb(tx)); // vraie tx rollback en prod
    await expect(createOrganization('u1', { name: 'Flotte SA' })).rejects.toThrow(/insert failed/);
  });
});

describe('inviteMember — permissions + token', () => {
  it('owner peut inviter un driver ; token brut renvoyé mais JAMAIS le hash', async () => {
    const { inviteMember } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' }); // getUserOrganizationRole
    h.findUserFirst.mockResolvedValueOnce(undefined); // pas encore de compte → OK
    const tx = { update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })), insert: vi.fn(() => ({ values: vi.fn(async () => {}) })) };
    h.transaction.mockImplementationOnce(async (cb: any) => cb(tx));
    const res: any = await inviteMember('owner1', 'org1', 'New.Driver@Co.CH', 'driver');
    expect(res.ok).toBe(true);
    expect(res.email).toBe('new.driver@co.ch'); // normalisé
    expect(typeof res.rawToken).toBe('string');
    expect(res.rawToken.length).toBeGreaterThan(20);
    expect(res).not.toHaveProperty('tokenHash'); // hash jamais renvoyé
    expect(JSON.stringify(res)).not.toMatch(/[0-9a-f]{64}/); // pas de sha256 exposé
  });

  it('email invalide refusé', async () => {
    const { inviteMember } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    await expect(inviteMember('owner1', 'org1', 'pas-un-email', 'driver')).rejects.toThrow(/invalid email/);
  });

  it('refuse d\'inviter en tant qu\'owner (rôle non invitable)', async () => {
    const { inviteMember } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    await expect(inviteMember('owner1', 'org1', 'x@y.ch', 'owner' as any)).rejects.toThrow(/not invitable/);
  });

  it('membre déjà actif → CONFLICT', async () => {
    const { inviteMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })           // role acteur
      .mockResolvedValueOnce({ status: 'active' });        // déjà membre
    h.findUserFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(inviteMember('owner1', 'org1', 'x@y.ch', 'driver')).rejects.toThrow(/already a member/);
  });
});

describe('acceptInvite — sécurité email / expiration', () => {
  it('mauvais email → FORBIDDEN', async () => {
    const { acceptInvite } = await import('../services/organization.service.js');
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', email: 'invited@co.ch', role: 'driver', status: 'pending', expiresAt: new Date(Date.now() + 86400_000) });
    await expect(acceptInvite('u9', 'someone.else@co.ch', 'rawtok')).rejects.toThrow(/email mismatch/);
  });

  it('expirée → marque expired + throw', async () => {
    const { acceptInvite } = await import('../services/organization.service.js');
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', email: 'invited@co.ch', role: 'driver', status: 'pending', expiresAt: new Date(Date.now() - 1000) });
    h.update.mockReturnValueOnce({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) });
    await expect(acceptInvite('u9', 'invited@co.ch', 'rawtok')).rejects.toThrow(/expired/);
  });

  it('déjà acceptée → no-op clair (alreadyAccepted)', async () => {
    const { acceptInvite } = await import('../services/organization.service.js');
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', email: 'invited@co.ch', role: 'driver', status: 'accepted', expiresAt: new Date(Date.now() + 86400_000) });
    const res: any = await acceptInvite('u9', 'invited@co.ch', 'rawtok');
    expect(res.alreadyAccepted).toBe(true);
  });

  it('token inconnu → NOT_FOUND', async () => {
    const { acceptInvite } = await import('../services/organization.service.js');
    h.findInviteFirst.mockResolvedValueOnce(undefined);
    await expect(acceptInvite('u9', 'x@y.ch', 'bad')).rejects.toThrow(/NOT_FOUND/);
  });

  it('bon email + pending → crée membership + marque accepted', async () => {
    const { acceptInvite } = await import('../services/organization.service.js');
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', email: 'invited@co.ch', role: 'driver', status: 'pending', expiresAt: new Date(Date.now() + 86400_000) });
    const tx = { query: { organizationMembers: { findFirst: vi.fn().mockResolvedValue(undefined) } }, insert: vi.fn(() => ({ values: vi.fn(async () => {}) })), update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })) };
    h.transaction.mockImplementationOnce(async (cb: any) => cb(tx));
    const res: any = await acceptInvite('u9', 'Invited@Co.CH', 'rawtok');
    expect(res.ok).toBe(true);
    expect(res.organizationId).toBe('o1');
    expect(tx.insert).toHaveBeenCalled();
  });
});

describe('revokeInvite — permissions + appartenance', () => {
  it('non-admin refusé', async () => {
    const { revokeInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' }); // pas admin
    await expect(revokeInvite('u', 'o1', 'i1')).rejects.toThrow(/admin required/);
  });

  it('invite hors organisation → NOT_FOUND', async () => {
    const { revokeInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'AUTRE', status: 'pending' });
    await expect(revokeInvite('owner1', 'o1', 'i1')).rejects.toThrow(/NOT_FOUND/);
  });

  it('owner révoque une invitation pending', async () => {
    const { revokeInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', status: 'pending' });
    h.update.mockReturnValueOnce({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) });
    const res = await revokeInvite('owner1', 'o1', 'i1');
    expect(res.ok).toBe(true);
  });
});

describe('listInvites — pas de tokenHash exposé', () => {
  it('ne renvoie jamais tokenHash', async () => {
    const { listInvites } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'fleet_admin' });
    h.findInvitesMany.mockResolvedValueOnce([{ id: 'i1', email: 'a@b.ch', role: 'driver', status: 'pending', expiresAt: new Date(), createdAt: new Date(), tokenHash: 'SECRET_HASH', invitedByUserId: 'owner1' }]);
    const rows = await listInvites('admin1', 'o1');
    expect(rows[0]).not.toHaveProperty('tokenHash');
    expect(rows[0]).not.toHaveProperty('invitedByUserId');
    expect(JSON.stringify(rows)).not.toContain('SECRET_HASH');
  });
});
