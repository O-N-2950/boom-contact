import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DB (hoisted spies configurables par test) ───────────
const h = vi.hoisted(() => {
  const valuesSpy = vi.fn().mockResolvedValue(undefined);
  const whereSpy = vi.fn().mockResolvedValue(undefined);
  const setSpy = vi.fn(() => ({ where: whereSpy }));
  return {
    valuesSpy, whereSpy, setSpy,
    findMemberFirst: vi.fn(),
    findMemberMany: vi.fn().mockResolvedValue([]),
    findOrgFirst: vi.fn(),
    findOrgMany: vi.fn().mockResolvedValue([]),
    findUserFirst: vi.fn(),
  };
});

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      organizationMembers: { findFirst: h.findMemberFirst, findMany: h.findMemberMany },
      organizations:       { findFirst: h.findOrgFirst,    findMany: h.findOrgMany },
      users:               { findFirst: h.findUserFirst },
    },
    insert: vi.fn(() => ({ values: h.valuesSpy })),
    update: vi.fn(() => ({ set: h.setSpy })),
    transaction: vi.fn(async (cb: any) => cb({ insert: vi.fn(() => ({ values: h.valuesSpy })), update: vi.fn(() => ({ set: h.setSpy })) })),
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ organizations: {}, organizationMembers: {}, users: {} }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, maskEmail: (e: string) => e }));

beforeEach(() => {
  h.findMemberFirst.mockReset();
  h.findMemberMany.mockReset().mockResolvedValue([]);
  h.findOrgFirst.mockReset();
  h.findOrgMany.mockReset().mockResolvedValue([]);
  h.findUserFirst.mockReset();
  h.valuesSpy.mockClear();
  h.setSpy.mockClear();
  h.whereSpy.mockClear();
});

// ── 1. Matrice de permissions — PURE (cœur sécurité) ─────────
describe('Org permission matrix (pure)', () => {
  it('owner peut tout', async () => {
    const { roleCan } = await import('../services/organization.service.js');
    for (const a of ['manage_org', 'manage_members', 'invite_member', 'manage_vehicles', 'view'] as const) {
      expect(roleCan('owner', a)).toBe(true);
    }
  });
  it('fleet_admin gère membres/véhicules/invitations mais PAS l\'org', async () => {
    const { roleCan } = await import('../services/organization.service.js');
    expect(roleCan('fleet_admin', 'manage_members')).toBe(true);
    expect(roleCan('fleet_admin', 'manage_vehicles')).toBe(true);
    expect(roleCan('fleet_admin', 'invite_member')).toBe(true);
    expect(roleCan('fleet_admin', 'manage_org')).toBe(false);
  });
  it('driver ne peut rien gérer (lecture seule de ce qui le concerne)', async () => {
    const { roleCan } = await import('../services/organization.service.js');
    expect(roleCan('driver', 'view')).toBe(true);
    expect(roleCan('driver', 'manage_members')).toBe(false);
    expect(roleCan('driver', 'manage_vehicles')).toBe(false);
    expect(roleCan('driver', 'invite_member')).toBe(false);
    expect(roleCan('driver', 'manage_org')).toBe(false);
  });
  it('viewers = lecture seule', async () => {
    const { roleCan, isViewerRole } = await import('../services/organization.service.js');
    for (const r of ['broker_viewer', 'insurer_viewer'] as const) {
      expect(roleCan(r, 'view')).toBe(true);
      expect(roleCan(r, 'manage_members')).toBe(false);
      expect(roleCan(r, 'manage_vehicles')).toBe(false);
      expect(isViewerRole(r)).toBe(true);
    }
    expect(isViewerRole('driver')).toBe(false);
  });
  it('null (non-membre) ne peut rien', async () => {
    const { roleCan } = await import('../services/organization.service.js');
    for (const a of ['manage_org', 'manage_members', 'invite_member', 'manage_vehicles', 'view'] as const) {
      expect(roleCan(null, a)).toBe(false);
    }
  });
  it('canAssignRole : owner→tout ; fleet_admin→driver/viewer seulement ; jamais owner', async () => {
    const { canAssignRole } = await import('../services/organization.service.js');
    expect(canAssignRole('owner', 'owner')).toBe(true);
    expect(canAssignRole('owner', 'fleet_admin')).toBe(true);
    expect(canAssignRole('fleet_admin', 'driver')).toBe(true);
    expect(canAssignRole('fleet_admin', 'broker_viewer')).toBe(true);
    expect(canAssignRole('fleet_admin', 'owner')).toBe(false);
    expect(canAssignRole('fleet_admin', 'fleet_admin')).toBe(false);
    expect(canAssignRole('driver', 'driver')).toBe(false);
  });
  it('canRemoveRole : fleet_admin ne peut retirer ni owner ni fleet_admin', async () => {
    const { canRemoveRole } = await import('../services/organization.service.js');
    expect(canRemoveRole('fleet_admin', 'driver')).toBe(true);
    expect(canRemoveRole('fleet_admin', 'owner')).toBe(false);
    expect(canRemoveRole('fleet_admin', 'fleet_admin')).toBe(false);
    expect(canRemoveRole('owner', 'fleet_admin')).toBe(true);
    expect(canRemoveRole('driver', 'driver')).toBe(false);
  });
});

// ── 2. Service — chemins critiques avec DB mockée ────────────
describe('Org service', () => {
  it('createOrganization crée l\'org PUIS le membre owner', async () => {
    const { createOrganization } = await import('../services/organization.service.js');
    const res = await createOrganization('user_1', { name: 'Acme Transports' });
    expect(res.ok).toBe(true);
    expect(h.valuesSpy).toHaveBeenCalledTimes(2);
    const orgRow = h.valuesSpy.mock.calls[0][0];
    const memberRow = h.valuesSpy.mock.calls[1][0];
    expect(orgRow.name).toBe('Acme Transports');
    expect(orgRow.createdByUserId).toBe('user_1');
    expect(memberRow.userId).toBe('user_1');
    expect(memberRow.role).toBe('owner');
    expect(memberRow.status).toBe('active');
  });

  it('listMyOrganizations ne retourne que les orgs où je suis membre actif', async () => {
    const { listMyOrganizations } = await import('../services/organization.service.js');
    h.findMemberMany.mockResolvedValueOnce([{ organizationId: 'org_1', role: 'owner' }]);
    h.findOrgFirst.mockResolvedValueOnce({ id: 'org_1', name: 'Acme', plan: 'free', country: 'CH' });
    const res = await listMyOrganizations('user_1');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ id: 'org_1', role: 'owner' });
  });

  it('assertOrganizationMember rejette un non-membre (FORBIDDEN)', async () => {
    const { assertOrganizationMember } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce(undefined); // pas de membership
    await expect(assertOrganizationMember('intrus', 'org_1')).rejects.toThrow(/FORBIDDEN/);
  });

  it('updateMemberRole refusé pour un driver (assertOrganizationAdmin)', async () => {
    const { updateMemberRole } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' }); // acteur = driver
    await expect(updateMemberRole('driver_user', 'org_1', 'mem_x', 'fleet_admin')).rejects.toThrow(/FORBIDDEN/);
  });

  it('addMember par fleet_admin ajoute un driver existant', async () => {
    const { addMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'fleet_admin' }) // acteur
      .mockResolvedValueOnce(undefined);              // pas déjà membre
    h.findUserFirst.mockResolvedValueOnce({ id: 'user_target', email: 'd@acme.com' });
    const res = await addMember('admin_user', 'org_1', 'd@acme.com', 'driver');
    expect(res.ok).toBe(true);
    expect(h.valuesSpy).toHaveBeenCalledTimes(1);
    expect(h.valuesSpy.mock.calls[0][0]).toMatchObject({ userId: 'user_target', role: 'driver', status: 'active' });
  });

  it('addMember refuse un utilisateur inexistant (NOT_FOUND)', async () => {
    const { addMember } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' }); // acteur owner
    h.findUserFirst.mockResolvedValueOnce(undefined);           // user inexistant
    await expect(addMember('owner_user', 'org_1', 'ghost@x.com', 'driver')).rejects.toThrow(/NOT_FOUND/);
  });

  it('addMember refuse un doublon actif (CONFLICT — unicité membership)', async () => {
    const { addMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })                 // acteur
      .mockResolvedValueOnce({ id: 'mem_e', status: 'active' }); // déjà membre actif
    h.findUserFirst.mockResolvedValueOnce({ id: 'user_target', email: 'd@acme.com' });
    await expect(addMember('owner_user', 'org_1', 'd@acme.com', 'driver')).rejects.toThrow(/CONFLICT/);
  });

  it('removeMember : impossible de retirer le dernier owner (CONFLICT)', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })                                    // acteur owner
      .mockResolvedValueOnce({ id: 'mem_owner', organizationId: 'org_1', role: 'owner' }); // cible owner
    h.findMemberMany.mockResolvedValueOnce([{ id: 'mem_owner' }]);                  // 1 seul owner actif
    await expect(removeMember('owner_user', 'org_1', 'mem_owner')).rejects.toThrow(/CONFLICT/);
  });

  it('removeMember : un fleet_admin ne peut pas retirer un owner (FORBIDDEN)', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'fleet_admin' })                              // acteur admin
      .mockResolvedValueOnce({ id: 'mem_owner', organizationId: 'org_1', role: 'owner' }); // cible owner
    await expect(removeMember('admin_user', 'org_1', 'mem_owner')).rejects.toThrow(/FORBIDDEN/);
  });
});
