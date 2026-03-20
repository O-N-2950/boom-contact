import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../middleware/context';
import { scanDocument, scanDocumentPair } from '../services/ocr.service';
import {
  createSession, getSession, joinSession,
  updateParticipant, updateAccident, signSession, getQRUrl
} from '../services/session.service';
import { io } from '../index';

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export const appRouter = router({

  // ── SESSION ──────────────────────────────────────────────
  session: router({

    // Driver A creates session → gets QR code URL
    create: publicProcedure
      .mutation(() => {
        const session = createSession();
        const qrUrl = getQRUrl(session.id, CLIENT_URL);
        return { sessionId: session.id, qrUrl, status: session.status };
      }),

    // Get session state
    get: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(({ input }) => {
        const session = getSession(input.sessionId);
        if (!session) throw new Error('Session not found or expired');
        return session;
      }),

    // Driver B joins via QR scan
    join: publicProcedure
      .input(z.object({ sessionId: z.string(), language: z.string().default('fr') }))
      .mutation(({ input }) => {
        const session = joinSession(input.sessionId, input.language);
        if (!session) throw new Error('Session not found, expired or already completed');

        // Notify driver A via WebSocket
        io.to(`session:${input.sessionId}`).emit('participant-joined', { role: 'B' });
        return session;
      }),

    // Update participant data (vehicle, driver, insurance)
    updateParticipant: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        role: z.enum(['A', 'B']),
        data: z.object({
          vehicle:      z.record(z.string(), z.any()).optional(),
          driver:       z.record(z.string(), z.any()).optional(),
          insurance:    z.record(z.string(), z.any()).optional(),
          damagedZones: z.array(z.string()).optional(),
          circumstances:z.array(z.string()).optional(),
          language:     z.string().optional(),
        }),
      }))
      .mutation(({ input }) => {
        const session = updateParticipant(input.sessionId, input.role, input.data as any);
        if (!session) throw new Error('Session not found');

        // Sync to other party via WebSocket
        io.to(`session:${input.sessionId}`).emit('data-updated', {
          role: input.role,
          data: input.data,
        });
        return { ok: true };
      }),

    // Update shared accident data
    updateAccident: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        data: z.object({
          date:             z.string().optional(),
          time:             z.string().optional(),
          location:         z.record(z.string(), z.any()).optional(),
          description:      z.string().optional(),
          faultDeclaration: z.enum(['A','B','shared','unknown']).optional(),
          witnesses:        z.string().optional(),
          policeReport:     z.boolean().optional(),
          policeRef:        z.string().optional(),
          injuries:         z.boolean().optional(),
          sketchImage:      z.string().optional(),
        }),
      }))
      .mutation(({ input }) => {
        const session = updateAccident(input.sessionId, input.data as any);
        if (!session) throw new Error('Session not found');

        io.to(`session:${input.sessionId}`).emit('accident-updated', input.data);
        return { ok: true };
      }),

    // Sign constat
    sign: publicProcedure
      .input(z.object({
        sessionId:       z.string(),
        role:            z.enum(['A', 'B']),
        signatureBase64: z.string().min(100),
      }))
      .mutation(({ input }) => {
        const result = signSession(input.sessionId, input.role, input.signatureBase64);
        if (!result) throw new Error('Session not found');

        const { session, bothSigned } = result;
        io.to(`session:${input.sessionId}`).emit('signed', { role: input.role, bothSigned });

        if (bothSigned) {
          io.to(`session:${input.sessionId}`).emit('constat-complete', { sessionId: input.sessionId });
        }
        return { ok: true, bothSigned, status: session.status };
      }),
  }),

  // ── OCR ──────────────────────────────────────────────────
  ocr: router({
    scan: publicProcedure
      .input(z.object({
        imageBase64:  z.string().min(100),
        mediaType:    z.enum(['image/jpeg','image/png','image/webp']).default('image/jpeg'),
        documentType: z.enum(['vehicle_registration','green_card','drivers_license','auto']).default('auto'),
        country:      z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hint = input.documentType !== 'auto' || input.country
          ? { documentType: input.documentType, country: input.country }
          : undefined;
        return scanDocument(input.imageBase64, input.mediaType, hint);
      }),

    scanPair: publicProcedure
      .input(z.object({
        registrationBase64: z.string().min(100),
        greenCardBase64:    z.string().min(100),
      }))
      .mutation(async ({ input }) =>
        scanDocumentPair(input.registrationBase64, input.greenCardBase64)
      ),
  }),

  // ── PDF ──────────────────────────────────────────────────
  pdf: router({
    generate: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        // TODO Phase 5 — pdf.service.ts
        return { pdfBase64: '', filename: `constat-${input.sessionId}.pdf` };
      }),
  }),
});

export type AppRouter = typeof appRouter;
