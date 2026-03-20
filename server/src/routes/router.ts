import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../middleware/context';

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  // ── SESSION ──────────────────────────────────────────────
  session: router({
    create: publicProcedure
      .mutation(async () => {
        // TODO: create session in DB, return sessionId + QR
        return { sessionId: 'placeholder', qrUrl: '' };
      }),

    get: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        // TODO: fetch session from DB
        return { id: input.sessionId, status: 'waiting' };
      }),

    updateData: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        role: z.enum(['A', 'B']),
        data: z.record(z.unknown()),
      }))
      .mutation(async ({ input }) => {
        // TODO: update session data in DB
        return { ok: true };
      }),
  }),

  // ── OCR ──────────────────────────────────────────────────
  ocr: router({
    scan: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        documentType: z.enum(['vehicle_registration', 'green_card', 'id', 'auto']).default('auto'),
        country: z.string().default('auto'),
      }))
      .mutation(async ({ input }) => {
        // TODO: call Claude Vision API
        return { type: 'unknown', confidence: 0, rawText: '' };
      }),
  }),

  // ── PDF ──────────────────────────────────────────────────
  pdf: router({
    generate: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        // TODO: generate PDF from session data
        return { pdfBase64: '', filename: `constat-${input.sessionId}.pdf` };
      }),
  }),
});

export type AppRouter = typeof appRouter;
