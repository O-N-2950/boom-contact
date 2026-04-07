import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import type { Context } from '../middleware/context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Protected procedure — requires valid JWT ──────────────────
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.authUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise.' });
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

export { TRPCError };
