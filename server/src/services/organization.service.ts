/**
 * Fleet B2B — Organization service (sprint Fleet Foundation).
 * Additif : ne touche ni users, ni vehicles, ni le flow constat.
 *
 * Cœur de permission = fonctions PURES (roleCan + dérivés), testables sans DB.
 * Les guards `assert*` sont de fins wrappers DB qui appliquent la matrice pure.
 */
import crypto from 'crypto';
import { db } from '../db/index.js';
import { organizations, organizationMembers, users, organizationInvites } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../logger.js';

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── Types ────────────────────────────────────────────────────
export type OrgRole = 'owner' | 'fleet_admin' | 'driver' | 'broker_viewer' | 'insurer_viewer';
export type OrgMemberStatus = 'active' | 'suspended' | 'removed';
export type OrgAction =
  | 'manage_org'        // renommer, supprimer, facturation — owner uniquement
  | 'manage_members'    // inviter / retirer / changer rôle
  | 'invite_member'
  | 'manage_vehicles'   // ajouter / éditer véhicules d'org (sprint futur)
  | 'view';             // voir l'organisation et ses métadonnées

export const ORG_ROLES: readonly OrgRole[] = ['owner', 'fleet_admin', 'driver', 'broker_viewer', 'insurer_viewer'];
const VIEWER_ROLES: readonly OrgRole[] = ['broker_viewer', 'insurer_viewer'];

// ── Matrice de permissions — PURE (testable sans DB) ─────────
export function roleCan(role: OrgRole | null, action: OrgAction): boolean {
  if (!role) return false;
  switch (action) {
    case 'manage_org':
      return role === 'owner';
    case 'manage_members':
    case 'invite_member':
    case 'manage_vehicles':
      return role === 'owner' || role === 'fleet_admin';
    case 'view':
      return ORG_ROLES.includes(role); // tout membre actif peut voir
    default:
      return false;
  }
}

// Dérivés purs (sucre)
export const canInviteOrganizationMemberRole = (role: OrgRole | null) => roleCan(role, 'invite_member');
export const canManageOrganizationVehiclesRole = (role: OrgRole | null) => roleCan(role, 'manage_vehicles');
export const isViewerRole = (role: OrgRole | null): boolean => !!role && VIEWER_ROLES.includes(role);

/**
 * Un acteur peut-il assigner/modifier un membre vers `targetRole` ?
 * - owner : peut tout (y compris promouvoir owner).
 * - fleet_admin : peut gérer driver / viewers, mais JAMAIS owner ni un autre fleet_admin→owner.
 * PURE.
 */
export function canAssignRole(actorRole: OrgRole | null, targetRole: OrgRole): boolean {
  if (actorRole === 'owner') return true;
  if (actorRole === 'fleet_admin') {
    return targetRole === 'driver' || VIEWER_ROLES.includes(targetRole);
  }
  return false;
}

/** Un acteur (par rôle) peut-il retirer un membre ayant `targetRole` ? PURE. */
export function canRemoveRole(actorRole: OrgRole | null, targetRole: OrgRole): boolean {
  if (actorRole === 'owner') return targetRole !== 'owner' ? true : true; // owner gère, contrôle "dernier owner" en DB
  if (actorRole === 'fleet_admin') return targetRole !== 'owner' && targetRole !== 'fleet_admin' ? true : false;
  return false;
}

// ── Guards DB ────────────────────────────────────────────────
export async function getUserOrganizationRole(userId: string, organizationId: string): Promise<OrgRole | null> {
  const m = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.status, 'active'),
    ),
  });
  return (m?.role as OrgRole) ?? null;
}

export async function assertOrganizationMember(userId: string, organizationId: string): Promise<OrgRole> {
  const role = await getUserOrganizationRole(userId, organizationId);
  if (!role) throw new Error('FORBIDDEN: not an organization member');
  return role;
}
export async function assertOrganizationAdmin(userId: string, organizationId: string): Promise<OrgRole> {
  const role = await getUserOrganizationRole(userId, organizationId);
  if (!roleCan(role, 'manage_members')) throw new Error('FORBIDDEN: admin required');
  return role as OrgRole;
}
export async function assertOrganizationOwner(userId: string, organizationId: string): Promise<OrgRole> {
  const role = await getUserOrganizationRole(userId, organizationId);
  if (role !== 'owner') throw new Error('FORBIDDEN: owner required');
  return role;
}
export async function canManageOrganizationVehicles(userId: string, organizationId: string): Promise<boolean> {
  return roleCan(await getUserOrganizationRole(userId, organizationId), 'manage_vehicles');
}
export async function canInviteOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
  return roleCan(await getUserOrganizationRole(userId, organizationId), 'invite_member');
}

// ── CRUD ─────────────────────────────────────────────────────
export async function createOrganization(userId: string, input: { name: string; country?: string; slug?: string }) {
  const orgId = nanoid();
  const now = new Date();
  // Atomique : org + membership owner dans une transaction → jamais d'org orpheline.
  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({
      id: orgId, name: input.name, country: input.country, slug: input.slug,
      plan: 'free', createdByUserId: userId, createdAt: now, updatedAt: now,
    });
    await tx.insert(organizationMembers).values({
      id: nanoid(), organizationId: orgId, userId, role: 'owner', status: 'active',
      joinedAt: now, createdAt: now, updatedAt: now,
    });
  });
  logger.info('Organization created', { orgId, userId });
  return { ok: true as const, id: orgId };
}

export async function listMyOrganizations(userId: string) {
  const memberships = await db.query.organizationMembers.findMany({
    where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')),
  });
  const out: Array<{ id: string; name: string; role: OrgRole; plan: string; country: string | null }> = [];
  for (const m of memberships) {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, m.organizationId), isNull(organizations.deletedAt)),
    });
    if (org) out.push({ id: org.id, name: org.name, role: m.role as OrgRole, plan: org.plan, country: org.country });
  }
  return out;
}

export async function getOrganization(userId: string, organizationId: string) {
  await assertOrganizationMember(userId, organizationId);
  const org = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
  });
  if (!org) throw new Error('NOT_FOUND: organization');
  return { id: org.id, name: org.name, slug: org.slug, plan: org.plan, country: org.country, createdAt: org.createdAt };
}

export async function listMembers(userId: string, organizationId: string) {
  await assertOrganizationMember(userId, organizationId);
  const members = await db.query.organizationMembers.findMany({
    where: and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, 'active')),
  });
  // Renvoie le strict nécessaire (pas de PII superflue)
  return members.map(m => ({ id: m.id, userId: m.userId, role: m.role as OrgRole, status: m.status as OrgMemberStatus, joinedAt: m.joinedAt, invitedEmail: m.invitedEmail }));
}

/**
 * Ajoute un membre EXISTANT (par email) à l'organisation.
 * Le flux d'invitation par email (utilisateur inexistant) est volontairement différé.
 */
export async function addMember(actorUserId: string, organizationId: string, email: string, role: OrgRole) {
  const actorRole = await assertOrganizationAdmin(actorUserId, organizationId);
  if (!canAssignRole(actorRole, role)) throw new Error('FORBIDDEN: cannot assign this role');

  const target = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!target) throw new Error('NOT_FOUND: user must have a boom.contact account first');

  const existing = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, target.id)),
  });
  if (existing && existing.status === 'active') throw new Error('CONFLICT: already a member');

  const now = new Date();
  if (existing) {
    // réactiver un membre précédemment retiré
    await db.update(organizationMembers)
      .set({ role, status: 'active', joinedAt: now, updatedAt: now })
      .where(eq(organizationMembers.id, existing.id));
    logger.info('Organization member reactivated', { organizationId, role });
    return { ok: true as const, id: existing.id, reactivated: true as const };
  }
  const id = nanoid();
  await db.insert(organizationMembers).values({
    id, organizationId, userId: target.id, invitedEmail: email.toLowerCase(),
    role, status: 'active', joinedAt: now, createdAt: now, updatedAt: now,
  });
  logger.info('Organization member added', { organizationId, role });
  return { ok: true as const, id, reactivated: false as const };
}

export async function updateMemberRole(actorUserId: string, organizationId: string, memberId: string, newRole: OrgRole) {
  const actorRole = await assertOrganizationAdmin(actorUserId, organizationId);
  const member = await db.query.organizationMembers.findFirst({ where: eq(organizationMembers.id, memberId) });
  if (!member || member.organizationId !== organizationId) throw new Error('NOT_FOUND: member');

  const currentRole = member.role as OrgRole;
  if (!canAssignRole(actorRole, currentRole) || !canAssignRole(actorRole, newRole)) {
    throw new Error('FORBIDDEN: insufficient rights for this role change');
  }
  // Protéger le dernier owner
  if (currentRole === 'owner' && newRole !== 'owner') {
    const owners = await countActiveOwners(organizationId);
    if (owners <= 1) throw new Error('CONFLICT: cannot demote the last owner');
  }
  await db.update(organizationMembers).set({ role: newRole, updatedAt: new Date() }).where(eq(organizationMembers.id, memberId));
  logger.info('Organization member role updated', { organizationId, newRole });
  return { ok: true as const };
}

export async function removeMember(actorUserId: string, organizationId: string, memberId: string) {
  const actorRole = await assertOrganizationAdmin(actorUserId, organizationId);
  const member = await db.query.organizationMembers.findFirst({ where: eq(organizationMembers.id, memberId) });
  if (!member || member.organizationId !== organizationId) throw new Error('NOT_FOUND: member');
  const targetRole = member.role as OrgRole;
  if (!canRemoveRole(actorRole, targetRole)) throw new Error('FORBIDDEN: cannot remove this member');
  if (targetRole === 'owner') {
    const owners = await countActiveOwners(organizationId);
    if (owners <= 1) throw new Error('CONFLICT: cannot remove the last owner');
  }
  await db.update(organizationMembers).set({ status: 'removed', updatedAt: new Date() }).where(eq(organizationMembers.id, memberId));
  logger.info('Organization member removed', { organizationId });
  return { ok: true as const };
}

export async function leaveOrganization(userId: string, organizationId: string) {
  const role = await assertOrganizationMember(userId, organizationId);
  if (role === 'owner') {
    const owners = await countActiveOwners(organizationId);
    if (owners <= 1) throw new Error('CONFLICT: transfer ownership before leaving');
  }
  await db.update(organizationMembers)
    .set({ status: 'removed', updatedAt: new Date() })
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)));
  logger.info('Member left organization', { organizationId });
  return { ok: true as const };
}

async function countActiveOwners(organizationId: string): Promise<number> {
  const owners = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.role, 'owner'),
      eq(organizationMembers.status, 'active'),
    ),
  });
  return owners.length;
}

// ── Fleet B2B — Invitations membres (onboarding) ─────────────────────────────
const INVITE_TTL_DAYS = 7;
const INVITABLE_ROLES: readonly OrgRole[] = ['driver', 'fleet_admin'];

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Crée une invitation + renvoie le token BRUT (à mettre uniquement dans l'email, jamais loggé/stocké). */
export async function inviteMember(actorUserId: string, organizationId: string, email: string, role: OrgRole) {
  const actorRole = await assertOrganizationAdmin(actorUserId, organizationId);
  if (!INVITABLE_ROLES.includes(role)) throw new Error('FORBIDDEN: role not invitable');
  if (!canAssignRole(actorRole, role)) throw new Error('FORBIDDEN: cannot assign this role');
  const normEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) throw new Error('CONFLICT: invalid email');

  // Déjà membre actif ?
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, normEmail) });
  if (existingUser) {
    const m = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, existingUser.id)),
    });
    if (m && m.status === 'active') throw new Error('CONFLICT: already a member');
  }

  const rawToken = crypto.randomBytes(24).toString('base64url'); // jamais stocké
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 86400_000);
  const id = nanoid();

  await db.transaction(async (tx) => {
    // Révoquer toute invitation pending existante pour (org, email) → 1 seule active
    await tx.update(organizationInvites)
      .set({ status: 'revoked', updatedAt: now })
      .where(and(
        eq(organizationInvites.organizationId, organizationId),
        eq(organizationInvites.email, normEmail),
        eq(organizationInvites.status, 'pending'),
      ));
    await tx.insert(organizationInvites).values({
      id, organizationId, email: normEmail, role, tokenHash, status: 'pending',
      invitedByUserId: actorUserId, expiresAt, createdAt: now, updatedAt: now,
    });
  });
  logger.info('Organization invite created', { organizationId, role }); // pas d'email ni token
  return { ok: true as const, inviteId: id, rawToken, email: normEmail, role, expiresAt };
}

export async function listInvites(actorUserId: string, organizationId: string) {
  await assertOrganizationAdmin(actorUserId, organizationId);
  const rows = await db.query.organizationInvites.findMany({
    where: eq(organizationInvites.organizationId, organizationId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 50,
  });
  // JAMAIS de tokenHash exposé
  return rows.map((i) => ({
    id: i.id, email: i.email, role: i.role, status: i.status,
    expiresAt: i.expiresAt, createdAt: i.createdAt,
  }));
}

export async function revokeInvite(actorUserId: string, organizationId: string, inviteId: string) {
  await assertOrganizationAdmin(actorUserId, organizationId);
  const inv = await db.query.organizationInvites.findFirst({ where: eq(organizationInvites.id, inviteId) });
  if (!inv || inv.organizationId !== organizationId) throw new Error('NOT_FOUND: invite');
  if (inv.status !== 'pending') throw new Error('CONFLICT: invite not pending');
  await db.update(organizationInvites)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(eq(organizationInvites.id, inviteId));
  logger.info('Organization invite revoked', { organizationId });
  return { ok: true as const };
}

/** Accepte une invitation : vérifie token + email correspondant + non expirée. */
export async function acceptInvite(userId: string, userEmail: string, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const inv = await db.query.organizationInvites.findFirst({ where: eq(organizationInvites.tokenHash, tokenHash) });
  if (!inv) throw new Error('NOT_FOUND: invite');
  if (inv.status === 'accepted') return { ok: true as const, alreadyAccepted: true as const, organizationId: inv.organizationId };
  if (inv.status !== 'pending') throw new Error('CONFLICT: invite not pending');
  const now = new Date();
  if (inv.expiresAt < now) {
    await db.update(organizationInvites).set({ status: 'expired', updatedAt: now }).where(eq(organizationInvites.id, inv.id));
    throw new Error('CONFLICT: invite expired');
  }
  if (inv.email !== userEmail.trim().toLowerCase()) throw new Error('FORBIDDEN: invite email mismatch');

  await db.transaction(async (tx) => {
    const existing = await tx.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, inv.organizationId), eq(organizationMembers.userId, userId)),
    });
    if (existing) {
      await tx.update(organizationMembers)
        .set({ role: inv.role, status: 'active', joinedAt: now, updatedAt: now })
        .where(eq(organizationMembers.id, existing.id));
    } else {
      await tx.insert(organizationMembers).values({
        id: nanoid(), organizationId: inv.organizationId, userId, invitedEmail: inv.email,
        role: inv.role, status: 'active', joinedAt: now, createdAt: now, updatedAt: now,
      });
    }
    await tx.update(organizationInvites)
      .set({ status: 'accepted', acceptedByUserId: userId, acceptedAt: now, updatedAt: now })
      .where(eq(organizationInvites.id, inv.id));
  });
  logger.info('Organization invite accepted', { organizationId: inv.organizationId, role: inv.role });
  return { ok: true as const, organizationId: inv.organizationId, role: inv.role };
}

/** Renvoie une invitation pending : NOUVEAU token, prolonge l'expiration, ré-émet l'email. */
export async function resendInvite(actorUserId: string, organizationId: string, inviteId: string) {
  await assertOrganizationAdmin(actorUserId, organizationId);
  const inv = await db.query.organizationInvites.findFirst({ where: eq(organizationInvites.id, inviteId) });
  if (!inv || inv.organizationId !== organizationId) throw new Error('NOT_FOUND: invite');
  if (inv.status !== 'pending') throw new Error('CONFLICT: invite not pending');

  const rawToken = crypto.randomBytes(24).toString('base64url'); // jamais stocké
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 86400_000);
  await db.update(organizationInvites)
    .set({ tokenHash, expiresAt, updatedAt: now })
    .where(eq(organizationInvites.id, inviteId));
  logger.info('Organization invite resent', { organizationId, role: inv.role }); // ni email ni token
  return { ok: true as const, inviteId, rawToken, email: inv.email, role: inv.role as OrgRole, expiresAt };
}
