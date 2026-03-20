import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../middleware/context';
import { scanDocument, scanDocumentPair } from '../services/ocr.service';

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
        return { id: input.sessionId, status: 'waiting' };
      }),
  }),

  // ── OCR ──────────────────────────────────────────────────
  ocr: router({

    // Scan a single document
    scan: publicProcedure
      .input(z.object({
        imageBase64: z.string().min(100),
        mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
        documentType: z.enum(['vehicle_registration', 'green_card', 'drivers_license', 'auto']).default('auto'),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hint = input.documentType !== 'auto' || input.country
          ? { documentType: input.documentType, country: input.country }
          : undefined;

        const result = await scanDocument(input.imageBase64, input.mediaType, hint);
        return result;
      }),

    // Scan both documents at once (registration + green card)
    scanPair: publicProcedure
      .input(z.object({
        registrationBase64: z.string().min(100),
        greenCardBase64: z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const result = await scanDocumentPair(
          input.registrationBase64,
          input.greenCardBase64,
        );
        return result;
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
