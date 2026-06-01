import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  findMemberFirst: vi.fn(),   // getUserOrganizationRole (acteur) + member ciblé
  findMemberMany:  vi.fn().mockResolvedValue([]), // countActiveOwners
  findInviteFirst: vi.fn(),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })),
}));

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      organizationMembers: { findFirst: h.findMemberFirst, findMany: h.findMemberMany },
      organizationInvites: { findFirst: h.findInviteFirst },
    },
    update: h.update,
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ organizations: {}, organizationMembers: {}, users: {}, organizationInvites: {} }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  h.findMemberFirst.mockReset();
  h.findMemberMany.mockReset().mockResolvedValue([]);
  h.findInviteFirst.mockReset();
  h.update.mockReset().mockReturnValue({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) });
});

describe('updateMemberRole', () => {
  it('owner promeut un driver en fleet_admin', async () => {
    const { updateMemberRole } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })                       // acteur
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'driver' }); // cible
    const res = await updateMemberRole('owner1', 'o1', 'm1', 'fleet_admin' as any);
    expect(res.ok).toBe(true);
  });

  it('fleet_admin NE peut PAS changer le rôle d\'un owner', async () => {
    const { updateMemberRole } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'fleet_admin' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'owner' });
    await expect(updateMemberRole('fa1', 'o1', 'm1', 'driver' as any)).rejects.toThrow(/insufficient rights/);
  });

  it('driver ne peut rien changer (pas admin)', async () => {
    const { updateMemberRole } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' }); // assertOrganizationAdmin throw
    await expect(updateMemberRole('d1', 'o1', 'm1', 'fleet_admin' as any)).rejects.toThrow(/admin required/);
  });

  it('impossible de rétrograder le DERNIER owner', async () => {
    const { updateMemberRole } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'owner' });
    h.findMemberMany.mockResolvedValueOnce([{ id: 'm1' }]); // 1 seul owner
    await expect(updateMemberRole('owner1', 'o1', 'm1', 'driver' as any)).rejects.toThrow(/last owner/);
  });
});

describe('removeMember', () => {
  it('owner retire un driver', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'driver' });
    const res = await removeMember('owner1', 'o1', 'm1');
    expect(res.ok).toBe(true);
  });

  it('fleet_admin retire un driver', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'fleet_admin' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'driver' });
    const res = await removeMember('fa1', 'o1', 'm1');
    expect(res.ok).toBe(true);
  });

  it('fleet_admin NE retire PAS un owner', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'fleet_admin' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'owner' });
    await expect(removeMember('fa1', 'o1', 'm1')).rejects.toThrow(/cannot remove/);
  });

  it('impossible de retirer le DERNIER owner', async () => {
    const { removeMember } = await import('../services/organization.service.js');
    h.findMemberFirst
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'm1', organizationId: 'o1', role: 'owner' });
    h.findMemberMany.mockResolvedValueOnce([{ id: 'm1' }]); // 1 seul owner
    await expect(removeMember('owner1', 'o1', 'm1')).rejects.toThrow(/last owner/);
  });
});

describe('resendInvite', () => {
  it('pending → nouveau token, ré-émet ; token brut renvoyé mais hash JAMAIS exposé', async () => {
    const { resendInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', status: 'pending', email: 'a@b.ch', role: 'driver' });
    const res: any = await resendInvite('owner1', 'o1', 'i1');
    expect(res.ok).toBe(true);
    expect(typeof res.rawToken).toBe('string');
    expect(res.rawToken.length).toBeGreaterThan(20);
    expect(res).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(res)).not.toMatch(/[0-9a-f]{64}/);
  });

  it('deux renvois → deux tokens DIFFÉRENTS (nouveau hash à chaque fois)', async () => {
    const { resendInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValue({ role: 'owner' });
    h.findInviteFirst.mockResolvedValue({ id: 'i1', organizationId: 'o1', status: 'pending', email: 'a@b.ch', role: 'driver' });
    const r1: any = await resendInvite('owner1', 'o1', 'i1');
    const r2: any = await resendInvite('owner1', 'o1', 'i1');
    expect(r1.rawToken).not.toBe(r2.rawToken);
  });

  it('invitation déjà acceptée → refusée', async () => {
    const { resendInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'o1', status: 'accepted', email: 'a@b.ch', role: 'driver' });
    await expect(resendInvite('owner1', 'o1', 'i1')).rejects.toThrow(/not pending/);
  });

  it('invitation hors organisation → NOT_FOUND', async () => {
    const { resendInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'owner' });
    h.findInviteFirst.mockResolvedValueOnce({ id: 'i1', organizationId: 'AUTRE', status: 'pending' });
    await expect(resendInvite('owner1', 'o1', 'i1')).rejects.toThrow(/NOT_FOUND/);
  });

  it('non-admin refusé', async () => {
    const { resendInvite } = await import('../services/organization.service.js');
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    await expect(resendInvite('d1', 'o1', 'i1')).rejects.toThrow(/admin required/);
  });
});
