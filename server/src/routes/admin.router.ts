import { z } from 'zod';
import type { Context } from '../middleware/context.js';
import { router, protectedProcedure, TRPCError } from './trpc.js';
import { generateDailyPosts, approvePost, markPosted, archivePost } from '../services/social-generator.service.js';
import { logger } from '../logger.js';
import { db, schema } from '../db/index.js';
import { sessions, users, payments, creditTxns, vehicles, magicTokens, socialPosts } from '../db/schema.js';
import { desc, gte, eq, count, sum, sql, isNull, and, inArray } from 'drizzle-orm';

export const adminRouter = router({

  // GET admin.stats — full dashboard data, admin only
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });


      const now = new Date();
      const since24h = new Date(now.getTime() - 24 * 3600 * 1000);
      const since7d  = new Date(now.getTime() - 7  * 24 * 3600 * 1000);
      const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      // Sessions stats
      const [totalSessions]     = await db.select({ c: count() }).from(sessions);
      const [completedSessions] = await db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'completed'));
      const [activeSessions]    = await db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'active'));
      const [sessions24h]       = await db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since24h));
      const [sessions7d]        = await db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since7d));

      // Recent sessions (last 30)
      const recentSessions = await db.query.sessions.findMany({
        orderBy: [desc(sessions.createdAt)],
        limit: 30,
        columns: { id: true, status: true, createdAt: true, ownerEmail: true, accident: true, participantA: true },
      });

      // Users stats
      const [totalUsers]  = await db.select({ c: count() }).from(users);
      const [users7d]     = await db.select({ c: count() }).from(users).where(gte(users.createdAt, since7d));
      const [users30d]    = await db.select({ c: count() }).from(users).where(gte(users.createdAt, since30d));

      // Revenue stats
      const [totalRevenue]   = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid'));
      const [revenue30d]     = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since30d));
      const [revenue7d]      = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since7d));
      const [totalCredits]   = await db.select({ s: sum(payments.creditsGranted) }).from(payments).where(eq(payments.status, 'paid'));

      // Revenue by package
      const revenueByPack = await db.select({
        packageId: payments.packageId,
        count: count(),
        revenue: sum(payments.amountCents),
        credits: sum(payments.creditsGranted),
      }).from(payments).where(eq(payments.status, 'paid')).groupBy(payments.packageId);

      // Recent payments (last 20)
      const recentPayments = await db.query.payments.findMany({
        orderBy: [desc(payments.createdAt)],
        limit: 20,
        columns: { id: true, userEmail: true, packageId: true, packageLabel: true, amountCents: true, currency: true, status: true, paidAt: true, creditsGranted: true },
      });

      // IA costs estimate: OCR scans ≈ 0.003€/scan (Claude Sonnet Vision)
      // Each completed session uses ~2 OCR scans avg
      const ocrCostPerScan = 0.003;
      const estOcrScans    = (completedSessions.c || 0) * 2;
      const estOcrCost     = estOcrScans * ocrCostPerScan;

      // Credit transactions (gifts sent)
      const [giftsTotal] = await db.select({ s: sum(creditTxns.delta) }).from(creditTxns).where(eq(creditTxns.reason, 'gift'));

      return {
        sessions: {
          total:     totalSessions.c || 0,
          completed: completedSessions.c || 0,
          active:    activeSessions.c || 0,
          last24h:   sessions24h.c || 0,
          last7d:    sessions7d.c || 0,
          recent:    recentSessions,
        },
        users: {
          total:  totalUsers.c || 0,
          last7d: users7d.c || 0,
          last30d:users30d.c || 0,
        },
        revenue: {
          totalCents:  Number(totalRevenue.s  || 0),
          last30dCents:Number(revenue30d.s     || 0),
          last7dCents: Number(revenue7d.s      || 0),
          totalCredits:Number(totalCredits.s   || 0),
          byPackage:   revenueByPack,
          recent:      recentPayments,
        },
        ai: {
          estOcrScans,
          estOcrCostEur: Math.round(estOcrCost * 100) / 100,
          costPerSession: ocrCostPerScan * 2,
        },
        gifts: {
          totalGiven: Number(giftsTotal.s || 0),
        },
      };
    }),

  // GET admin.users — paginated user list
  users: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      return db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        limit: input.limit,
        columns: { id: true, email: true, role: true, credits: true, createdAt: true, lastSeenAt: true, country: true },
      });
    }),

});

// ── ADMIN MAINTENANCE PROCEDURES (top-level) ──────────────────────────────────

export const adminDeleteUser = protectedProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });

    // Ne pas supprimer le compte admin
    if (input.email === 'contact@boom.contact') throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossible de supprimer le compte admin principal.' });

    const emailLower = input.email.toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable: ' + input.email });

    await db.delete(magicTokens).where(eq(magicTokens.email, emailLower));
    await db.delete(vehicles).where(eq(vehicles.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));

    logger.info('Compte supprimé par admin', { email: input.email });
    return { ok: true, deleted: input.email };
  });

// POST admin.setCredits — créditer directement un compte (admin only)
export const adminSetCredits = protectedProcedure
  .input(z.object({
    email: z.string().email(),
    credits: z.number().min(0).max(999999),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
    const emailLower = input.email.toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable: ' + input.email });
    await db.update(users).set({ credits: input.credits }).where(eq(users.id, user.id));
    return { ok: true, email: emailLower, credits: input.credits };
  });

// GET admin.listUsers — lister tous les utilisateurs
export const adminListUsers = protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(500).default(100),
    offset: z.number().min(0).default(0),
  }).default({ limit: 100, offset: 0 }))
  .query(async ({ ctx, input }) => {
    if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
    const all = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      credits: users.credits,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
    return all;
  });

export const adminCleanupSessions = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
    const signing = await db.query.sessions.findMany({
      where: eq(sessions.status, 'signing'),
      columns: { id: true, participantA: true, participantB: true, accident: true, vehicleCount: true },
    });
    const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
    const toComplete: string[] = [];
    for (const s of signing) {
      const A = (s.participantA as any) ?? {};
      const B = (s.participantB as any);
      const acc = (s.accident as any) ?? {};
      const sigA = !!A?.signature;
      if (!sigA) continue;
      const bHasRealData = B && (B?.driver?.firstName || B?.vehicle?.licensePlate);
      const bIsNonSigning = B && (NON_SIGNING.includes(B?.vehicle?.vehicleType) || B?.isPedestrian);
      const hasPartyBStatus = !!acc.partyBStatus;
      const isSolo = (s.vehicleCount ?? 2) === 1;
      if (isSolo || hasPartyBStatus || bIsNonSigning || !bHasRealData) {
        toComplete.push(s.id);
      }
    }
    // Batch update instead of N+1
    if (toComplete.length > 0) {
      await db.update(sessions).set({ status: 'completed' } as any).where(inArray(sessions.id, toComplete));
    }
    return { fixed: toComplete.length, total: signing.length };
  });

export const adminFixOwnerEmails = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
    const missing = await db.query.sessions.findMany({
      where: and(eq(sessions.status, 'completed'), isNull(sessions.ownerEmail)),
      columns: { id: true, participantA: true },
    });
    // Batch: collect all updates, then execute in one pass
    const updates: { id: string; email: string }[] = [];
    for (const s of missing) {
      const email = (s.participantA as any)?.driver?.email;
      if (email) updates.push({ id: s.id, email });
    }
    if (updates.length > 0) {
      await Promise.all(updates.map(u =>
        db.update(sessions).set({ ownerEmail: u.email } as any).where(eq(sessions.id, u.id))
      ));
    }
    return { fixed: updates.length, total: missing.length };
  });

// ── MARKETING ROUTER ───────────────────────────────────────────

export const marketingRouter = router({

  posts: protectedProcedure
    .input(z.object({ platform: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }: { ctx: Context; input: any }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      const conds: any[] = [];
      if (input.platform) conds.push(eq(socialPosts.platform, input.platform));
      if (input.status)   conds.push(eq(socialPosts.status, input.status));
      const posts = await (conds.length > 0
        ? (db as any).select().from(socialPosts).where(and(...conds)).orderBy(socialPosts.createdAt)
        : (db as any).select().from(socialPosts).orderBy(socialPosts.createdAt));
      return { posts: posts.map((p: any) => ({ ...p, hashtags: JSON.parse(p.hashtags || '[]') })) };
    }),

  generate: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(8).default(4) }))
    .mutation(async ({ ctx }: { ctx: Context }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      const generated = await generateDailyPosts(4);
      return { generated };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      await approvePost(input.id);
      return { ok: true };
    }),

  markPosted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      await markPosted(input.id);
      return { ok: true };
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
      if (ctx.authUser.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
      await archivePost(input.id);
      return { ok: true };
    }),

});
