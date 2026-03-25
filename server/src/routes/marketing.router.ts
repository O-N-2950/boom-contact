import { initTRPC } from '@trpc/server';
import type { Context } from '../middleware/context.js';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { schema } from '../db/schema.js';
import { logger } from '../logger.js';
import {
  generateDailyPosts,
  getPendingPosts,
  approvePost,
  markPosted,
  archivePost,
  seedInitialPosts,
} from '../services/social-generator.service.js';

const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;

// Middleware admin simplifié (réutilise le même pattern que admin.stats)
function requireAdmin(ctx: any) {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new Error('UNAUTHORIZED');
  }
}

export const marketingRouter = router({

  // GET /trpc/marketing.posts — liste posts par statut/plateforme
  posts: publicProcedure
    .input(z.object({
      platform: z.string().optional(),
      status:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const conditions: any[] = [];
      if (input.platform) conditions.push(eq((schema.socialPosts as any).platform, input.platform));
      if (input.status)   conditions.push(eq((schema.socialPosts as any).status, input.status));

      const { and } = await import('drizzle-orm');
      const posts = conditions.length > 0
        ? await (db as any).select().from(schema.socialPosts).where(and(...conditions)).orderBy((schema.socialPosts as any).createdAt)
        : await (db as any).select().from(schema.socialPosts).orderBy((schema.socialPosts as any).createdAt);

      return { posts: posts.map((p: any) => ({
        ...p,
        hashtags: JSON.parse(p.hashtags || '[]'),
      }))};
    }),

  // POST /trpc/marketing.generate — déclenche génération manuelle
  generate: publicProcedure
    .input(z.object({ count: z.number().min(1).max(8).default(4) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const generated = await generateDailyPosts(input.count);
      logger.info('[Marketing] Génération manuelle', { generated });
      return { generated };
    }),

  // POST /trpc/marketing.approve — approuve un post
  approve: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await approvePost(input.id);
      return { ok: true };
    }),

  // POST /trpc/marketing.markPosted — marque comme publié
  markPosted: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await markPosted(input.id);
      return { ok: true };
    }),

  // POST /trpc/marketing.archive — archive un post
  archive: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await archivePost(input.id);
      return { ok: true };
    }),

  // POST /trpc/marketing.seed — seed les 60 posts initiaux (une fois)
  seed: publicProcedure
    .input(z.object({ posts: z.array(z.any()) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const inserted = await seedInitialPosts(input.posts);
      return { inserted };
    }),
});
