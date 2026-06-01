import crypto from 'crypto';
import { db } from '../db/index.js';
import { vehicles, organizations, organizationMembers } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../logger.js';
import { getUserOrganizationRole, roleCan, type OrgRole } from './organization.service.js';

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// Véhicules PERSONNELS uniquement (organization_id NULL). Comportement historique préservé
// (tous les véhicules existants ont organization_id NULL → aucun changement de résultat).
export async function listVehicles(userId: string) {
  return db.query.vehicles.findMany({
    where: and(eq(vehicles.userId, userId), isNull(vehicles.organizationId)),
    orderBy: (v, { desc }) => [desc(v.updatedAt)],
  });
}

export async function saveVehicle(userId: string, input: {
  id?: string;
  nickname?: string;
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  category?: string;
  licenseData?: Record<string, unknown>;
  insuranceData?: Record<string, unknown>;
}) {
  const now = new Date();

  if (input.id) {
    // Update — verify ownership
    const existing = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, input.id), eq(vehicles.userId, userId)),
    });
    if (!existing) throw new Error('Véhicule introuvable.');

    await db.update(vehicles)
      .set({
        nickname:     input.nickname      ?? existing.nickname,
        plate:        input.plate         ?? existing.plate,
        make:         input.make          ?? existing.make,
        model:        input.model         ?? existing.model,
        color:        input.color         ?? existing.color,
        year:         input.year          ?? existing.year,
        category:     input.category      ?? existing.category,
        licenseData:  (input.licenseData   ?? existing.licenseData) as any,
        insuranceData:(input.insuranceData ?? existing.insuranceData) as any,
        updatedAt: now,
      })
      .where(eq(vehicles.id, input.id));

    logger.info('Vehicle updated', { userId, vehicleId: input.id });
    return { ok: true, id: input.id };
  } else {
    // Create
    const id = nanoid();
    await db.insert(vehicles).values({
      id,
      userId,
      nickname:     input.nickname,
      plate:        input.plate,
      make:         input.make,
      model:        input.model,
      color:        input.color,
      year:         input.year,
      category:     input.category,
      licenseData:  (input.licenseData  || {}) as any,
      insuranceData:(input.insuranceData || {}) as any,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Vehicle created', { userId, vehicleId: id, plate: input.plate });
    return { ok: true, id };
  }
}

export async function deleteVehicle(userId: string, vehicleId: string) {
  const existing = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)),
  });
  if (!existing) throw new Error('Véhicule introuvable.');

  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
  logger.info('Vehicle deleted', { userId, vehicleId });
  return { ok: true };
}

// ── Fleet B2B — Value Chain (additif) ────────────────────────
export type VehicleScope = 'personal' | 'organization';
export interface AccessibleVehicle {
  id: string;
  scope: VehicleScope;
  organizationId: string | null;
  organizationName: string | null;
  canManage: boolean;
  label: string;
  nickname: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  year: string | null;
  category: string | null;
  licenseData: Record<string, unknown> | null;
  insuranceData: Record<string, unknown> | null;
}

function toAccessible(v: any, scope: VehicleScope, orgId: string | null, orgName: string | null, canManage: boolean): AccessibleVehicle {
  return {
    id: v.id, scope, organizationId: orgId, organizationName: orgName, canManage,
    label: v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule',
    nickname: v.nickname ?? null, plate: v.plate ?? null, make: v.make ?? null, model: v.model ?? null,
    color: v.color ?? null, year: v.year ?? null, category: v.category ?? null,
    licenseData: v.licenseData ?? null, insuranceData: v.insuranceData ?? null,
  };
}

/** Véhicules personnels (alias explicite). */
export async function listPersonalVehicles(userId: string) {
  const rows = await listVehicles(userId);
  return rows.map(v => toAccessible(v, 'personal', null, null, true));
}

/** Véhicules d'UNE organisation — réservé aux membres actifs. */
export async function listOrganizationVehicles(userId: string, organizationId: string): Promise<AccessibleVehicle[]> {
  const role = await getUserOrganizationRole(userId, organizationId);
  if (!role) throw new Error('FORBIDDEN: not an organization member');
  const org = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
  });
  if (!org) throw new Error('NOT_FOUND: organization');
  const rows = await db.query.vehicles.findMany({ where: eq(vehicles.organizationId, organizationId) });
  const canManage = roleCan(role, 'manage_vehicles');
  return rows.map(v => toAccessible(v, 'organization', org.id, org.name, canManage));
}

/** Garage UNIFIÉ : véhicules personnels + véhicules de TOUTES les orgs du membre. */
export async function listAccessibleVehicles(userId: string): Promise<AccessibleVehicle[]> {
  const personal = await listPersonalVehicles(userId);
  const memberships = await db.query.organizationMembers.findMany({
    where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')),
  });
  const orgVehicles: AccessibleVehicle[] = [];
  for (const m of memberships) {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, m.organizationId), isNull(organizations.deletedAt)),
    });
    if (!org) continue;
    const rows = await db.query.vehicles.findMany({ where: eq(vehicles.organizationId, org.id) });
    const canManage = roleCan(m.role as OrgRole, 'manage_vehicles');
    for (const v of rows) orgVehicles.push(toAccessible(v, 'organization', org.id, org.name, canManage));
  }
  return [...personal, ...orgVehicles];
}

// ── Guards véhicule ──────────────────────────────────────────
export async function assertCanReadVehicle(userId: string, vehicleId: string) {
  const v = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
  if (!v) throw new Error('NOT_FOUND: vehicle');
  if (v.organizationId) {
    const role = await getUserOrganizationRole(userId, v.organizationId);
    if (!role) throw new Error('FORBIDDEN: not a member of this organization');
  } else if (v.userId !== userId) {
    throw new Error('FORBIDDEN: not your vehicle');
  }
  return v;
}

export async function assertCanManageVehicle(userId: string, vehicleId: string) {
  const v = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
  if (!v) throw new Error('NOT_FOUND: vehicle');
  if (v.organizationId) {
    const role = await getUserOrganizationRole(userId, v.organizationId);
    if (!roleCan(role, 'manage_vehicles')) throw new Error('FORBIDDEN: insufficient rights on fleet vehicle');
  } else if (v.userId !== userId) {
    throw new Error('FORBIDDEN: not your vehicle');
  }
  return v;
}

export async function assertCanCreateOrganizationVehicle(userId: string, organizationId: string) {
  const role = await getUserOrganizationRole(userId, organizationId);
  if (!roleCan(role, 'manage_vehicles')) throw new Error('FORBIDDEN: owner or fleet_admin required');
  return role as OrgRole;
}

/** Crée/édite un véhicule d'ORGANISATION (owner/fleet_admin). */
export async function saveOrganizationVehicle(userId: string, organizationId: string, input: {
  id?: string; nickname?: string; plate?: string; make?: string; model?: string;
  color?: string; year?: string; category?: string;
  licenseData?: Record<string, unknown>; insuranceData?: Record<string, unknown>;
}) {
  const now = new Date();
  if (input.id) {
    const existing = await assertCanManageVehicle(userId, input.id);
    if (existing.organizationId !== organizationId) throw new Error('FORBIDDEN: vehicle/organization mismatch');
    await db.update(vehicles).set({
      nickname: input.nickname ?? existing.nickname, plate: input.plate ?? existing.plate,
      make: input.make ?? existing.make, model: input.model ?? existing.model,
      color: input.color ?? existing.color, year: input.year ?? existing.year,
      category: input.category ?? existing.category,
      licenseData: (input.licenseData ?? existing.licenseData) as any,
      insuranceData: (input.insuranceData ?? existing.insuranceData) as any,
      updatedAt: now,
    }).where(eq(vehicles.id, input.id));
    logger.info('Fleet vehicle updated', { organizationId, vehicleId: input.id });
    return { ok: true as const, id: input.id };
  }
  await assertCanCreateOrganizationVehicle(userId, organizationId);
  const id = nanoid();
  await db.insert(vehicles).values({
    id, userId, organizationId, nickname: input.nickname, plate: input.plate,
    make: input.make, model: input.model, color: input.color, year: input.year, category: input.category,
    licenseData: (input.licenseData || {}) as any, insuranceData: (input.insuranceData || {}) as any,
    createdAt: now, updatedAt: now,
  });
  logger.info('Fleet vehicle created', { organizationId, vehicleId: id });
  return { ok: true as const, id };
}

export async function deleteOrganizationVehicle(userId: string, vehicleId: string) {
  const v = await assertCanManageVehicle(userId, vehicleId);
  if (!v.organizationId) throw new Error('FORBIDDEN: not a fleet vehicle');
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
  logger.info('Fleet vehicle deleted', { vehicleId });
  return { ok: true as const };
}
