/**
 * Fleet B2B — organization.router (sprint Fleet Foundation).
 * Toutes les routes exigent l'authentification (protectedProcedure).
 * Les droits fins sont appliqués dans organization.service (guards).
 * Aucune UI publique n'expose encore ces routes.
 */
import { z } from 'zod';
import { router, protectedProcedure, TRPCError } from './trpc.js';
import { logAudit } from '../services/audit.service.js';
import type { OrgRole } from '../services/organization.service.js';

const ORG_ROLE_ENUM = z.enum(['owner', 'fleet_admin', 'driver', 'broker_viewer', 'insurer_viewer']);
// Rôles assignables via l'API d'ajout/màj (owner se gère via création / transfert dédié plus tard)
const ASSIGNABLE_ROLE_ENUM = z.enum(['fleet_admin', 'driver', 'broker_viewer', 'insurer_viewer']);

/** Traduit les erreurs métier (préfixes FORBIDDEN/NOT_FOUND/CONFLICT) en TRPCError. */
function mapError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith('FORBIDDEN')) throw new TRPCError({ code: 'FORBIDDEN', message: msg.replace(/^FORBIDDEN:\s*/, '') || 'Accès refusé.' });
  if (msg.startsWith('NOT_FOUND')) throw new TRPCError({ code: 'NOT_FOUND', message: msg.replace(/^NOT_FOUND:\s*/, '') || 'Introuvable.' });
  if (msg.startsWith('CONFLICT'))  throw new TRPCError({ code: 'CONFLICT',  message: msg.replace(/^CONFLICT:\s*/, '')  || 'Conflit.' });
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erreur interne.' });
}

export const organizationRouter = router({

  listMine: protectedProcedure
    .query(async ({ ctx }) => {
      const { listMyOrganizations } = await import('../services/organization.service.js');
      return listMyOrganizations(ctx.authUser.sub);
    }),

  create: protectedProcedure
    .input(z.object({
      name:    z.string().trim().min(2).max(120),
      country: z.string().trim().max(10).optional(),
      slug:    z.string().trim().max(60).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { createOrganization } = await import('../services/organization.service.js');
        const res = await createOrganization(ctx.authUser.sub, input);
        logAudit({ event: 'org.created', userId: ctx.authUser.sub, detail: { organizationId: res.id } });
        return res;
      } catch (e) { mapError(e); }
    }),

  get: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .query(async ({ ctx, input }) => {
      try {
        const { getOrganization } = await import('../services/organization.service.js');
        return await getOrganization(ctx.authUser.sub, input.organizationId);
      } catch (e) { mapError(e); }
    }),

  listMembers: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .query(async ({ ctx, input }) => {
      try {
        const { listMembers } = await import('../services/organization.service.js');
        return await listMembers(ctx.authUser.sub, input.organizationId);
      } catch (e) { mapError(e); }
    }),

  // Ajoute un membre EXISTANT par email (invitation email différée).
  addMember: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      email:          z.string().trim().email().max(320),
      role:           ASSIGNABLE_ROLE_ENUM,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { addMember } = await import('../services/organization.service.js');
        const res = await addMember(ctx.authUser.sub, input.organizationId, input.email, input.role as OrgRole);
        logAudit({ event: 'org.member_added', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId, role: input.role } });
        return res;
      } catch (e) { mapError(e); }
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      memberId:       z.string().trim().max(20),
      role:           ASSIGNABLE_ROLE_ENUM,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { updateMemberRole } = await import('../services/organization.service.js');
        const res = await updateMemberRole(ctx.authUser.sub, input.organizationId, input.memberId, input.role as OrgRole);
        logAudit({ event: 'org.member_role_updated', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId, role: input.role } });
        return res;
      } catch (e) { mapError(e); }
    }),

  removeMember: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20), memberId: z.string().trim().max(20) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { removeMember } = await import('../services/organization.service.js');
        const res = await removeMember(ctx.authUser.sub, input.organizationId, input.memberId);
        logAudit({ event: 'org.member_removed', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId } });
        return res;
      } catch (e) { mapError(e); }
    }),

  leave: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { leaveOrganization } = await import('../services/organization.service.js');
        const res = await leaveOrganization(ctx.authUser.sub, input.organizationId);
        logAudit({ event: 'org.member_left', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId } });
        return res;
      } catch (e) { mapError(e); }
    }),

  // ── Fleet B2B — Invitations membres (owner/fleet_admin) ──────────────
  inviteMember: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      email:          z.string().trim().email().max(200),
      role:           z.enum(['driver', 'fleet_admin']),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { inviteMember } = await import('../services/organization.service.js');
        const res = await inviteMember(ctx.authUser.sub, input.organizationId, input.email, input.role);
        // Lien d'invitation (token brut UNIQUEMENT dans l'email, jamais loggé/renvoyé au client)
        const { CLIENT_URL } = await import('../config.js');
        const inviteUrl = `${CLIENT_URL}/?invite=${res.rawToken}`;
        const { sendOrganizationInvite } = await import('../services/email.service.js');
        // Nom d'org pour l'email (lecture interne, non exposé en analytics)
        const { getOrganization } = await import('../services/organization.service.js');
        const org = await getOrganization(ctx.authUser.sub, input.organizationId).catch(() => null);
        await sendOrganizationInvite(res.email, (org as any)?.name || 'votre organisation', input.role, inviteUrl);
        logAudit({ event: 'org.member_invited', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId, role: input.role } });
        return { ok: true, inviteId: res.inviteId, expiresAt: res.expiresAt }; // PAS de token renvoyé
      } catch (e) { mapError(e); }
    }),

  listInvites: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .query(async ({ ctx, input }) => {
      try {
        const { listInvites } = await import('../services/organization.service.js');
        return await listInvites(ctx.authUser.sub, input.organizationId);
      } catch (e) { mapError(e); }
    }),

  revokeInvite: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20), inviteId: z.string().trim().max(20) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { revokeInvite } = await import('../services/organization.service.js');
        const res = await revokeInvite(ctx.authUser.sub, input.organizationId, input.inviteId);
        logAudit({ event: 'org.invite_revoked', userId: ctx.authUser.sub, detail: { organizationId: input.organizationId } });
        return res;
      } catch (e) { mapError(e); }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().trim().min(10).max(200) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { acceptInvite } = await import('../services/organization.service.js');
        const res = await acceptInvite(ctx.authUser.sub, ctx.authUser.email, input.token);
        if (!(res as any).alreadyAccepted) {
          logAudit({ event: 'org.invite_accepted', userId: ctx.authUser.sub, detail: { organizationId: res.organizationId } });
        }
        return res;
      } catch (e) { mapError(e); }
    }),
});
