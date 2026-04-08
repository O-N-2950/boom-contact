import { z } from 'zod';
import type { Context } from '../middleware/context.js';
import { router, adminProcedure, TRPCError } from './trpc.js';
import { adminStatsOutput, adminUsersOutput, adminDeleteUserOutput, adminSetCreditsOutput, adminListUsersOutput, adminCleanupSessionsOutput, adminFixOwnerEmailsOutput, marketingPostsOutput, marketingActionOutput } from './output-schemas.js';
import { logger, maskEmail } from '../logger.js';
import { db, schema } from '../db/index.js';
import { sessions, users, payments, creditTxns, vehicles, magicTokens, socialPosts } from '../db/schema.js';
import { desc, gte, eq, count, sum, sql, isNull, and, inArray } from 'drizzle-orm';

export const adminRouter = router({

  // GET admin.stats — full dashboard data, admin only
  stats: adminProcedure
    .output(adminStatsOutput)
    .query(async () => {
      const now = new Date();
      const since24h = new Date(now.getTime() - 24 * 3600 * 1000);
      const since7d  = new Date(now.getTime() - 7  * 24 * 3600 * 1000);
      const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      // Parallelize all independent queries
      const [
        [totalSessions],
        [completedSessions],
        [activeSessions],
        [sessions24h],
        [sessions7d],
        recentSessions,
        [totalUsers],
        [users7d],
        [users30d],
        [totalRevenue],
        [revenue30d],
        [revenue7d],
        [totalCredits],
        revenueByPack,
        recentPayments,
        [giftsTotal],
      ] = await Promise.all([
        // Sessions stats
        db.select({ c: count() }).from(sessions),
        db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'completed')),
        db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'active')),
        db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since24h)),
        db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since7d)),
        db.query.sessions.findMany({
          orderBy: [desc(sessions.createdAt)],
          limit: 30,
          columns: { id: true, status: true, createdAt: true, ownerEmail: true, accident: true, participantA: true },
        }),
        // Users stats
        db.select({ c: count() }).from(users),
        db.select({ c: count() }).from(users).where(gte(users.createdAt, since7d)),
        db.select({ c: count() }).from(users).where(gte(users.createdAt, since30d)),
        // Revenue stats
        db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')),
        db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since30d)),
        db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since7d)),
        db.select({ s: sum(payments.creditsGranted) }).from(payments).where(eq(payments.status, 'paid')),
        // Revenue by package
        db.select({
          packageId: payments.packageId,
          count: count(),
          revenue: sum(payments.amountCents),
          credits: sum(payments.creditsGranted),
        }).from(payments).where(eq(payments.status, 'paid')).groupBy(payments.packageId),
        // Recent payments (last 20)
        db.query.payments.findMany({
          orderBy: [desc(payments.createdAt)],
          limit: 20,
          columns: { id: true, userEmail: true, packageId: true, packageLabel: true, amountCents: true, currency: true, status: true, paidAt: true, creditsGranted: true },
        }),
        // Credit transactions (gifts sent)
        db.select({ s: sum(creditTxns.delta) }).from(creditTxns).where(eq(creditTxns.reason, 'gift')),
      ]);

      // IA costs estimate: OCR scans ≈ 0.003€/scan (Claude Sonnet Vision)
      // Each completed session uses ~2 OCR scans avg
      const ocrCostPerScan = 0.003;
      const estOcrScans    = (completedSessions.c || 0) * 2;
      const estOcrCost     = estOcrScans * ocrCostPerScan;

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
  users: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .output(adminUsersOutput)
    .query(async ({ input }) => {
      return db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        limit: input.limit,
        columns: { id: true, email: true, role: true, credits: true, createdAt: true, lastSeenAt: true, country: true },
      });
    }),

});

// ── ADMIN MAINTENANCE PROCEDURES (top-level) ──────────────────────────────────

export const adminDeleteUser = adminProcedure
  .input(z.object({ email: z.string().email().max(320) }))
  .output(adminDeleteUserOutput)
  .mutation(async ({ input }) => {
    // Ne pas supprimer le compte admin
    if (input.email === 'contact@boom.contact') throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossible de supprimer le compte admin principal.' });

    const emailLower = input.email.toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable: ' + input.email });

    await db.delete(magicTokens).where(eq(magicTokens.email, emailLower));
    await db.delete(vehicles).where(eq(vehicles.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));

    logger.info('Compte supprimé par admin', { email: maskEmail(input.email) });
    return { ok: true, deleted: input.email };
  });

// POST admin.setCredits — créditer directement un compte (admin only)
export const adminSetCredits = adminProcedure
  .input(z.object({
    email: z.string().email().max(320),
    credits: z.number().min(0).max(999999),
  }))
  .output(adminSetCreditsOutput)
  .mutation(async ({ input }) => {
    const emailLower = input.email.toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable: ' + input.email });
    await db.update(users).set({ credits: input.credits }).where(eq(users.id, user.id));
    return { ok: true, email: emailLower, credits: input.credits };
  });

// GET admin.listUsers — lister tous les utilisateurs
export const adminListUsers = adminProcedure
  .input(z.object({
    limit: z.number().min(1).max(500).default(100),
    offset: z.number().min(0).default(0),
  }).default({ limit: 100, offset: 0 }))
  .output(adminListUsersOutput)
  .query(async ({ input }) => {
    const all = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      credits: users.credits,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
    return all;
  });

export const adminCleanupSessions = adminProcedure
  .output(adminCleanupSessionsOutput)
  .mutation(async () => {
    const signing = await db.query.sessions.findMany({
      where: eq(sessions.status, 'signing'),
      columns: { id: true, participantA: true, participantB: true, accident: true, vehicleCount: true },
    });
    const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
    const toComplete: string[] = [];
    for (const s of signing) {
      const A = s.participantA ?? {};
      const B = s.participantB;
      const acc = s.accident ?? {};
      const sigA = !!A?.signature;
      if (!sigA) continue;
      const bHasRealData = B && (B?.driver?.firstName || B?.vehicle?.licensePlate);
      const bIsNonSigning = B && (NON_SIGNING.includes(B?.vehicle?.vehicleType as string) || B?.isPedestrian);
      const hasPartyBStatus = !!acc.partyBStatus;
      const isSolo = (s.vehicleCount ?? 2) === 1;
      if (isSolo || hasPartyBStatus || bIsNonSigning || !bHasRealData) {
        toComplete.push(s.id);
      }
    }
    // Batch update instead of N+1
    if (toComplete.length > 0) {
      await db.update(sessions).set({ status: 'completed' }).where(inArray(sessions.id, toComplete));
    }
    return { fixed: toComplete.length, total: signing.length };
  });

export const adminFixOwnerEmails = adminProcedure
  .output(adminFixOwnerEmailsOutput)
  .mutation(async () => {
    const missing = await db.query.sessions.findMany({
      where: and(eq(sessions.status, 'completed'), isNull(sessions.ownerEmail)),
      columns: { id: true, participantA: true },
    });
    // Batch: collect all updates, then execute in one pass
    const updates: { id: string; email: string }[] = [];
    for (const s of missing) {
      const email = s.participantA?.driver?.email;
      if (email) updates.push({ id: s.id, email });
    }
    if (updates.length > 0) {
      await Promise.all(updates.map(u =>
        db.update(sessions).set({ ownerEmail: u.email }).where(eq(sessions.id, u.id))
      ));
    }
    return { fixed: updates.length, total: missing.length };
  });

// ── MARKETING ROUTER ───────────────────────────────────────────

// Marketing router — social-generator module removed (dead code).
// Keeping router stub so existing admin references don't break.
export const marketingRouter = router({

  posts: adminProcedure
    .input(z.object({ platform: z.string().max(100).optional(), status: z.string().max(50).optional() }))
    .output(marketingPostsOutput)
    .query(async ({ input }) => {
      const conds: ReturnType<typeof eq>[] = [];
      if (input.platform) conds.push(eq(socialPosts.platform, input.platform));
      if (input.status)   conds.push(eq(socialPosts.status, input.status));
      const posts = await (conds.length > 0
        ? db.select().from(socialPosts).where(and(...conds)).orderBy(socialPosts.createdAt)
        : db.select().from(socialPosts).orderBy(socialPosts.createdAt));
      return { posts: posts.map((p) => ({ ...p, hashtags: JSON.parse(p.hashtags || '[]') })) };
    }),

  generate: adminProcedure
    .input(z.object({ count: z.number().min(1).max(8).default(4) }))
    .output(marketingActionOutput)
    .mutation(async () => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Social generator module has been removed.' });
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .output(marketingActionOutput)
    .mutation(async ({ input }) => {
      await db.update(socialPosts).set({ status: 'approved' }).where(eq(socialPosts.id, input.id));
      return { ok: true };
    }),

  markPosted: adminProcedure
    .input(z.object({ id: z.number() }))
    .output(marketingActionOutput)
    .mutation(async ({ input }) => {
      await db.update(socialPosts).set({ status: 'posted' }).where(eq(socialPosts.id, input.id));
      return { ok: true };
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .output(marketingActionOutput)
    .mutation(async ({ input }) => {
      await db.update(socialPosts).set({ status: 'archived' }).where(eq(socialPosts.id, input.id));
      return { ok: true };
    }),

});
