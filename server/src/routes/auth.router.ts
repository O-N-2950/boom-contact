import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, TRPCError } from './trpc.js';
import { registerUser, loginWithPassword, createMagicToken, verifyMagicToken, createGiftLink, claimGiftLink, verifyPassword, hashPassword } from '../services/auth.service.js';
import { sendMagicLink, sendGiftCreditsLink } from '../services/email.service.js';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { users, vehicles, magicTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const CLIENT_URL = process.env.CLIENT_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  || 'https://boom-contact-production.up.railway.app';

export const authRouter = router({

  // POST auth.register
  register: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      try {
        const result = await registerUser(input.email, input.password);
        return { ok: true, ...result };
      } catch (err: any) {
        if (err.message === 'EMAIL_EXISTS') throw new TRPCError({ code: 'CONFLICT', message: 'Cet email est déjà utilisé.' });
        throw err;
      }
    }),

  // POST auth.login
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await loginWithPassword(input.email, input.password);
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
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const token = await createMagicToken(input.email);
      const magicUrl = `${CLIENT_URL}/?magic=${token}`;
      await sendMagicLink(input.email, magicUrl);
      return { ok: true };
    }),

  // POST auth.magicLinkVerify
  magicLinkVerify: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const result = await verifyMagicToken(input.token);
      if (!result) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lien invalide ou expiré.' });
      return { ok: true, ...result };
    }),

  // GET auth.me — returns null for unauthenticated, data for authenticated
  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.authUser) return null;
      const user = await db.query.users.findFirst({ where: eq(users.id, ctx.authUser.sub) });
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, credits: user.credits,
               firstName: (user as any).firstName || '', lastName: (user as any).lastName || '',
               phone: (user as any).phone || '', company: (user as any).company || '',
               address: (user as any).address || '' };
    }),

  // POST auth.updateProfile — modifier prénom, nom, tel, société, adresse
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName:  z.string().optional(),
      phone:     z.string().optional(),
      company:   z.string().optional(),
      address:   z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, any> = {};
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
      newEmail:    z.string().email(),
      currentPassword: z.string().min(1),
    }))
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
    .mutation(async ({ ctx }) => {
      const userId = ctx.authUser.sub;
      const userEmail = ctx.authUser.email;

      // Bloquer suppression du compte admin
      if (ctx.authUser.role === 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossible de supprimer un compte admin.' });

      // Supprimer dans l'ordre : tokens → véhicules → user
      await db.delete(magicTokens).where(eq(magicTokens.email, userEmail));
      await db.delete(vehicles).where(eq(vehicles.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      logger.info('Compte supprimé', { userId, email: userEmail });
      return { ok: true };
    }),

  // POST auth.grantCredits — admin only
  grantCredits: protectedProcedure
    .input(z.object({
      credits: z.number().min(1).max(999999),
      recipientEmail: z.string().email().optional(),
      sendEmail: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      const token = await createGiftLink(input.credits, ctx.authUser.email);
      const giftUrl = `${CLIENT_URL}/?gift=${token}`;
      if (input.sendEmail && input.recipientEmail) {
        await sendGiftCreditsLink(input.recipientEmail, giftUrl, input.credits);
      }
      const waText = encodeURIComponent(`🎁 ${input.credits} crédit${input.credits > 1 ? 's' : ''} offert${input.credits > 1 ? 's' : ''} sur boom.contact ! Clique ici pour les réclamer : ${giftUrl}`);
      return { ok: true, giftUrl, waUrl: `https://wa.me/?text=${waText}` };
    }),

  adminBootstrap: publicProcedure
    .input(z.object({ secret: z.string(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
      if (!expected || input.secret !== expected) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid secret.' });

      // Check if an admin already exists — disable endpoint after first setup
      const existingAdmin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
      if (existingAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin already exists. Bootstrap is disabled.' });

      const hash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash: hash, role: 'admin', credits: 999999 }).where(eq(users.email, 'contact@boom.contact'));
      return { ok: true };
    }),

  claimGift: publicProcedure
    .input(z.object({ token: z.string(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await claimGiftLink(input.token, input.email);
      return { ok: true, ...result };
    }),

});
