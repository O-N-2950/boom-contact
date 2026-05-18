import crypto from 'crypto';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure, TRPCError } from './trpc.js';
import { registerUser, loginWithPassword, createMagicToken, verifyMagicToken, createGiftLink, claimGiftLink, verifyPassword, hashPassword, revokeUserTokens, verifyEmail } from '../services/auth.service.js';
import { sendMagicLink, sendGiftCreditsLink } from '../services/email.service.js';
import { logger, maskEmail } from '../logger.js';
import { db } from '../db/index.js';
import { users, vehicles, magicTokens, payments, creditTxns, sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { CLIENT_URL } from '../constants.js';
import { authMeOutput, authLoginOutput, authRegisterOutput, authMagicLinkRequestOutput, authMagicLinkVerifyOutput, authUpdateProfileOutput, authUpdateEmailOutput, authDeleteAccountOutput, authGrantCreditsOutput, authAdminBootstrapOutput, authClaimGiftOutput } from './output-schemas.js';
import { logAudit } from '../services/audit.service.js';

export const authRouter = router({

  // POST auth.register
  register: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(320), password: z.string().trim().min(8).max(200) }))
    .output(authRegisterOutput)
    .mutation((async ({ input, ctx }: any) => {
      try {
        const result = await registerUser(input.email, input.password);
        logAudit({ event: 'user.register', userId: result.id, ip: ctx.req?.ip, detail: { email: input.email } });
        // Set httpOnly cookie (secure, SameSite=Strict) — backward compat: token still in body
        if (ctx.res && result.token) {
          ctx.res.cookie('boom_token', result.token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
        }
        return { ok: true, ...result };
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'EMAIL_EXISTS') throw new TRPCError({ code: 'CONFLICT', message: 'Cet email est déjà utilisé.' });
        throw err;
      }
    }) as any),

  // POST auth.login
  login: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(320), password: z.string().trim().max(200) }))
    .output(authLoginOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await loginWithPassword(input.email, input.password);
        logAudit({ event: 'user.login', userId: result.user.id, ip: ctx.req?.ip, detail: { email: input.email } });
        // Set httpOnly cookie
        if (ctx.res && result.token) {
          ctx.res.cookie('boom_token', result.token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
        }
        return result;
      }
      catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('auth.login failed', { error: msg });
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect.' });
      }
    }),

  // POST auth.magicLinkRequest
  magicLinkRequest: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(320) }))
    .output(authMagicLinkRequestOutput)
    .mutation(async ({ input }) => {
      try {
        const token = await createMagicToken(input.email);
        const magicUrl = `${CLIENT_URL}/?magic=${token}`;
        await sendMagicLink(input.email, magicUrl);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'MAGIC_LINK_RATE_LIMITED') {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de demandes de lien magique. Réessayez dans une heure.' });
        }
        throw err;
      }
      // Always return ok to avoid email enumeration
      return { ok: true };
    }),

  // POST auth.magicLinkVerify
  magicLinkVerify: publicProcedure
    .input(z.object({ token: z.string().trim().max(500) }))
    .output(authMagicLinkVerifyOutput)
    .mutation(async ({ input, ctx }) => {
      const result = await verifyMagicToken(input.token);
      if (!result) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lien invalide ou expiré.' });
      // Set httpOnly cookie
      if (ctx.res && result.token) {
        ctx.res.cookie('boom_token', result.token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
      }
      return { ok: true, ...result };
    }),

  // GET auth.me — returns null for unauthenticated, data for authenticated
  me: publicProcedure
    .output(authMeOutput)
    .query(async ({ ctx }) => {
      if (!ctx.authUser) return null;
      const user = await db.query.users.findFirst({ where: eq(users.id, ctx.authUser.sub) });
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, credits: user.credits,
               firstName: user.firstName || '', lastName: user.lastName || '',
               phone: user.phone || '', company: user.company || '',
               address: user.address || '', verified: user.verified ?? false };
    }),

  // POST auth.updateProfile — modifier prénom, nom, tel, société, adresse
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().trim().max(200).optional(),
      lastName: z.string().trim().max(200).optional(),
      phone: z.string().trim().max(50).optional(),
      company: z.string().trim().max(300).optional(),
      address: z.string().trim().max(500).optional(),
    }))
    .output(authUpdateProfileOutput)
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, string | undefined> = {};
      if (input.firstName !== undefined) updates.firstName = input.firstName;
      if (input.lastName  !== undefined) updates.lastName  = input.lastName;
      if (input.phone     !== undefined) updates.phone     = input.phone;
      if (input.company   !== undefined) updates.company   = input.company;
      if (input.address   !== undefined) updates.address   = input.address;
      await db.update(users).set(updates).where(eq(users.id, ctx.authUser.sub));
      return { ok: true };
    }),

  // POST auth.updateEmail — changer son adresse email
  updateEmail: protectedProcedure
    .input(z.object({
      newEmail: z.string().trim().email(),
      currentPassword: z.string().trim().min(1),
    }))
    .output(authUpdateEmailOutput)
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({ where: eq(users.id, ctx.authUser.sub) });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
      // Vérifier le mot de passe actuel
      const valid = user.passwordHash && await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Mot de passe incorrect.' });
      // Vérifier que le nouvel email n'est pas déjà utilisé
      const existing = await db.query.users.findFirst({ where: eq(users.email, input.newEmail) });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Cet email est déjà utilisé.' });
      await db.update(users).set({ email: input.newEmail }).where(eq(users.id, ctx.authUser.sub));
      return { ok: true };
    }),

  // POST auth.deleteAccount — suppression définitive compte + données
  deleteAccount: protectedProcedure
    .input(z.object({}))
    .output(authDeleteAccountOutput)
    .mutation(async ({ ctx }) => {
      const userId = ctx.authUser.sub;
      const userEmail = ctx.authUser.email;

      // Bloquer suppression du compte admin
      if (ctx.authUser.role === 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossible de supprimer un compte admin.' });

      // Suppression RGPD/nLPD dans une transaction atomique.
      //  - Données personnelles (constats, photos, signatures, vocal,
      //    véhicules, tokens) → SUPPRIMÉES.
      //  - Écritures financières (paiements, crédits) → ANONYMISÉES et non
      //    supprimées : obligation légale de conservation comptable/fiscale
      //    (~10 ans). L'email est remplacé par un identifiant non réversible
      //    → plus aucun lien avec une personne identifiable.
      const anonId = crypto.createHash('sha256').update(userEmail).digest('hex').slice(0, 16);
      const anonEmail = `deleted-${anonId}@anonymized.invalid`;

      await db.transaction(async (tx) => {
        // 1. Constats appartenant à l'utilisateur (PII : photos, signatures, vocal)
        await tx.delete(sessions).where(eq(sessions.ownerEmail, userEmail));
        // 2. Anonymisation des écritures financières (rétention fiscale)
        await tx.update(payments).set({ userEmail: anonEmail }).where(eq(payments.userEmail, userEmail));
        await tx.update(creditTxns).set({ userEmail: anonEmail }).where(eq(creditTxns.userEmail, userEmail));
        // 3. Tokens magiques + véhicules + compte
        await tx.delete(magicTokens).where(eq(magicTokens.email, userEmail));
        await tx.delete(vehicles).where(eq(vehicles.userId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });

      logger.info('Compte supprimé', { userId, email: maskEmail(userEmail) });
      return { ok: true };
    }),

  // POST auth.grantCredits — admin only
  grantCredits: adminProcedure
    .input(z.object({
      credits: z.number().min(1).max(999999),
      recipientEmail: z.string().trim().email().optional(),
      sendEmail: z.boolean().default(false),
    }))
    .output(authGrantCreditsOutput)
    .mutation(async ({ ctx, input }) => {
      const token = await createGiftLink(input.credits, ctx.authUser.email);
      const giftUrl = `${CLIENT_URL}/?gift=${token}`;
      if (input.sendEmail && input.recipientEmail) {
        await sendGiftCreditsLink(input.recipientEmail, giftUrl, input.credits);
      }
      const waText = encodeURIComponent(`🎁 ${input.credits} crédit${input.credits > 1 ? 's' : ''} offert${input.credits > 1 ? 's' : ''} sur boom.contact ! Clique ici pour les réclamer : ${giftUrl}`);
      return { ok: true, giftUrl, waUrl: `https://wa.me/?text=${waText}` };
    }),

  adminBootstrap: publicProcedure
    .input(z.object({ secret: z.string().trim().max(500), password: z.string().trim().min(8).max(200) }))
    .output(authAdminBootstrapOutput)
    .mutation(async ({ input }) => {
      const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
      if (!expected) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid secret.' });
      // Timing-safe comparison to prevent timing attacks
      const inputBuf = Buffer.from(input.secret);
      const expectedBuf = Buffer.from(expected);
      if (inputBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(inputBuf, expectedBuf)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid secret.' });
      }

      // Check if an admin already exists — disable endpoint after first setup
      const existingAdmin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
      if (existingAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin already exists. Bootstrap is disabled.' });

      const hash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash: hash, role: 'admin', credits: 999999 }).where(eq(users.email, 'contact@boom.contact'));
      logAudit({ event: 'admin.bootstrap', detail: { email: 'contact@boom.contact' } });
      return { ok: true };
    }),

  // POST auth.logout — revoke all tokens for the current user
  logout: protectedProcedure
    .output(z.object({ ok: z.boolean() }))
    .mutation(async ({ ctx }) => {
      await revokeUserTokens(ctx.authUser.sub);
      return { ok: true };
    }),

  claimGift: publicProcedure
    .input(z.object({ token: z.string().trim().max(500), email: z.string().trim().email().max(320) }))
    .output(authClaimGiftOutput)
    .mutation(async ({ input, ctx }) => {
      const result = await claimGiftLink(input.token, input.email);
      logAudit({ event: 'credit.gift_claimed', ip: ctx.req?.ip, detail: { email: input.email, credits: result.credits } });
      return { ok: true, ...result };
    }),

  // POST auth.verifyEmail — mark email as verified
  verifyEmailToken: publicProcedure
    .input(z.object({ token: z.string().trim().max(500) }))
    .output(z.object({ ok: z.boolean() }))
    .mutation(async ({ input }) => {
      const ok = await verifyEmail(input.token);
      if (!ok) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token de vérification invalide ou expiré.' });
      return { ok: true };
    }),

});
