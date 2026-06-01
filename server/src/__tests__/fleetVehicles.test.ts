import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DB ──────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  findVehicleFirst: vi.fn(),
  findVehicleMany: vi.fn().mockResolvedValue([]),
  findMemberFirst: vi.fn(),
  findMemberMany: vi.fn().mockResolvedValue([]),
  findOrgFirst: vi.fn(),
  valuesSpy: vi.fn().mockResolvedValue(undefined),
  whereSpy: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      vehicles:            { findFirst: h.findVehicleFirst, findMany: h.findVehicleMany },
      organizationMembers: { findFirst: h.findMemberFirst,  findMany: h.findMemberMany },
      organizations:       { findFirst: h.findOrgFirst },
    },
    insert: vi.fn(() => ({ values: h.valuesSpy })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: h.whereSpy })) })),
    delete: vi.fn(() => ({ where: h.whereSpy })),
  },
  schema: {},
}));
vi.mock('../db/schema.js', () => ({ vehicles: {}, organizations: {}, organizationMembers: {}, users: {} }));
vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  for (const k of ['findVehicleFirst','findMemberFirst','findOrgFirst'] as const) h[k].mockReset();
  h.findVehicleMany.mockReset().mockResolvedValue([]);
  h.findMemberMany.mockReset().mockResolvedValue([]);
  h.valuesSpy.mockClear(); h.whereSpy.mockClear();
});

// ── 1. Mapping garage→constat (PUR, client module) — fonctionne pour un véhicule d'org ──
describe('garage-to-constat mapping (org vehicle)', () => {
  it('préremplit le véhicule + assurance depuis un véhicule (perso ou org)', async () => {
    const { mapGarageVehicleToParticipant } = await import('../../../client/src/components/constat/garageVehicleMap');
    const orgVehicle = { plate: 'JU 99999', make: 'Renault', model: 'Master', color: 'blanc', year: '2022',
      insuranceData: { company: 'Bâloise', policyNumber: 'P-1' } };
    const mapped = mapGarageVehicleToParticipant(orgVehicle as any, 'A');
    expect(mapped.vehicle.licensePlate).toBe('JU 99999');
    expect(mapped.vehicle.make).toBe('Renault');
    expect(mapped.insurance?.company).toBe('Bâloise');
    expect(mapped.insurance?.policyNumber).toBe('P-1');
  });
  it('le scan OCR n\'est PAS obligatoire après sélection garage', async () => {
    const { isScanRequiredAfterGarageSelection } = await import('../../../client/src/components/constat/garageVehicleMap');
    expect(isScanRequiredAfterGarageSelection()).toBe(false);
  });
  it('source organization_garage et event fleet_vehicle_added sont valides', async () => {
    const { VEHICLE_SOURCES, isValidEventName, EVENTS } = await import('../../../client/src/analytics-events');
    expect(VEHICLE_SOURCES).toContain('organization_garage');
    expect(isValidEventName(EVENTS.FLEET_VEHICLE_ADDED)).toBe(true);
    expect(isValidEventName(EVENTS.FLEET_VEHICLE_SELECTED_FOR_CONSTAT)).toBe(true);
  });
});

// ── 2. Guards véhicule (DB mockée) ───────────────────────────
describe('Vehicle access guards', () => {
  it('assertCanReadVehicle : owner voit son véhicule personnel', async () => {
    const { assertCanReadVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v1', userId: 'me', organizationId: null });
    await expect(assertCanReadVehicle('me', 'v1')).resolves.toMatchObject({ id: 'v1' });
  });
  it('assertCanReadVehicle : un autre user NE voit PAS un véhicule personnel', async () => {
    const { assertCanReadVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v1', userId: 'me', organizationId: null });
    await expect(assertCanReadVehicle('intrus', 'v1')).rejects.toThrow(/FORBIDDEN/);
  });
  it('assertCanReadVehicle : un membre voit un véhicule d\'organisation', async () => {
    const { assertCanReadVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v2', userId: 'creator', organizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' }); // membre actif
    await expect(assertCanReadVehicle('driver_user', 'v2')).resolves.toMatchObject({ id: 'v2' });
  });
  it('assertCanReadVehicle : un NON-membre NE voit PAS un véhicule d\'organisation', async () => {
    const { assertCanReadVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v2', userId: 'creator', organizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce(undefined); // pas membre
    await expect(assertCanReadVehicle('intrus', 'v2')).rejects.toThrow(/FORBIDDEN/);
  });
  it('assertCanManageVehicle : un driver NE peut PAS gérer un véhicule d\'org', async () => {
    const { assertCanManageVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v2', userId: 'creator', organizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'driver' });
    await expect(assertCanManageVehicle('driver_user', 'v2')).rejects.toThrow(/FORBIDDEN/);
  });
  it('assertCanManageVehicle : un fleet_admin PEUT gérer un véhicule d\'org', async () => {
    const { assertCanManageVehicle } = await import('../services/vehicle.service.js');
    h.findVehicleFirst.mockResolvedValueOnce({ id: 'v2', userId: 'creator', organizationId: 'org_1' });
    h.findMemberFirst.mockResolvedValueOnce({ role: 'fleet_admin' });
    await expect(assertCanManageVehicle('admin_user', 'v2')).resolves.toMatchObject({ id: 'v2' });
  });
});

// ── 3. Garage unifié ─────────────────────────────────────────
describe('listAccessibleVehicles (garage unifié)', () => {
  it('retourne personnel (canManage=true) + org (scope=organization, canManage selon rôle)', async () => {
    const { listAccessibleVehicles } = await import('../services/vehicle.service.js');
    // personal (listVehicles → vehicles.findMany #1)
    h.findVehicleMany
      .mockResolvedValueOnce([{ id: 'p1', userId: 'me', organizationId: null, make: 'VW', model: 'Golf' }]) // perso
      .mockResolvedValueOnce([{ id: 'o1', userId: 'creator', organizationId: 'org_1', make: 'Renault', model: 'Master' }]); // org
    h.findMemberMany.mockResolvedValueOnce([{ organizationId: 'org_1', role: 'driver' }]);
    h.findOrgFirst.mockResolvedValueOnce({ id: 'org_1', name: 'Acme Transports' });

    const res = await listAccessibleVehicles('me');
    expect(res).toHaveLength(2);
    const personal = res.find(v => v.id === 'p1')!;
    const org = res.find(v => v.id === 'o1')!;
    expect(personal.scope).toBe('personal');
    expect(personal.canManage).toBe(true);
    expect(org.scope).toBe('organization');
    expect(org.organizationName).toBe('Acme Transports');
    expect(org.canManage).toBe(false); // driver ne gère pas
  });

  it('un driver a canManage=false ; un fleet_admin a canManage=true sur les véhicules d\'org', async () => {
    const { listAccessibleVehicles } = await import('../services/vehicle.service.js');
    h.findVehicleMany
      .mockResolvedValueOnce([]) // perso vide
      .mockResolvedValueOnce([{ id: 'o1', organizationId: 'org_1' }]); // org
    h.findMemberMany.mockResolvedValueOnce([{ organizationId: 'org_1', role: 'fleet_admin' }]);
    h.findOrgFirst.mockResolvedValueOnce({ id: 'org_1', name: 'Acme' });
    const res = await listAccessibleVehicles('admin_user');
    expect(res).toHaveLength(1);
    expect(res[0].canManage).toBe(true);
  });
});
