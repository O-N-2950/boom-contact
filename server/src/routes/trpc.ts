import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import type { Context } from '../middleware/context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Standardized error envelope: { success: false, error: { code, message } }
        standardError: {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Protected procedure — requires valid JWT ──────────────────
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.authUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise.' });
  }
  return next({ ctx: { ...ctx, authUser: ctx.authUser } });
});

// ── Admin procedure — requires valid JWT with role=admin ──────
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.authUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise.' });
  }
  if (ctx.authUser.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin requis.' });
  }
  return next({ ctx: { ...ctx, authUser: ctx.authUser } });
});

// ── Police procedure — requires valid police token in input ──────
export const policeProcedure = t.procedure.use(async ({ ctx, next, rawInput }) => {
  const input = rawInput as { token?: string } | undefined;
  if (!input?.token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token police requis.' });
  }
  const { verifyPoliceToken } = await import('../services/police.service.js');
  const policePayload = verifyPoliceToken(input.token);
  return next({ ctx: { ...ctx, policeUser: policePayload } });
});

// ── HTML escaping utility to prevent XSS in emails ──────────
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Idempotency cache — prevents duplicate mutations ────────
// In-memory with TTL (15 min). For multi-instance, use Redis.
const idempotencyCache = new Map<string, { result: unknown; expiry: number }>();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

// Periodic cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (now > entry.expiry) idempotencyCache.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check and store idempotency key.
 * Returns cached result if key was already processed, null otherwise.
 */
export function checkIdempotency(key: string | undefined): unknown | null {
  if (!key) return null;
  const cached = idempotencyCache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.result;
  return null;
}

export function storeIdempotency(key: string | undefined, result: unknown): void {
  if (!key) return;
  idempotencyCache.set(key, { result, expiry: Date.now() + IDEMPOTENCY_TTL_MS });
}

export { TRPCError };
