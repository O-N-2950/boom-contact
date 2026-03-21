import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../middleware/context';
import { scanDocument, scanDocumentPair } from '../services/ocr.service';
import {
  createSession, getSession, joinSession,
  updateParticipant, updateAccident, signSession, getQRUrl
} from '../services/session.service';
import { generateConstatPDF } from '../services/pdf.service.js';
import { sendPDFToDriver } from '../services/email.service.js';
import { createCheckoutSession, getUserCredits, saveConsent, useCredit, PACKAGES } from '../services/stripe.service.js';
import { io } from '../index';

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;

const CLIENT_URL = process.env.CLIENT_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  || 'https://boom-contact-production.up.railway.app';

export const appRouter = router({

  // ── SESSION ──────────────────────────────────────────────
  session: router({

    // Driver A creates session → gets QR code URL
    create: publicProcedure
      .mutation(async () => {
        const session = await createSession();
        const qrUrl = getQRUrl(session.id, CLIENT_URL);
        return { sessionId: session.id, qrUrl, status: session.status };
      }),

    // Get session state
    get: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session not found or expired');
        return session;
      }),

    // Driver B joins via QR scan
    join: publicProcedure
      .input(z.object({ sessionId: z.string(), language: z.string().default('fr') }))
      .mutation(async ({ input }) => {
        const session = await joinSession(input.sessionId, input.language);
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
      .mutation(async ({ input }) => {
        const session = await updateParticipant(input.sessionId, input.role, input.data as any);
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
          photos:           z.array(z.object({
            id:       z.string(),
            category: z.enum(['scene','vehicleA','vehicleB','injury','document','other']),
            base64:   z.string(),
            caption:  z.string().optional(),
            takenAt:  z.string(),
          })).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const session = await updateAccident(input.sessionId, input.data as any);
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
      .mutation(async ({ input }) => {
        const result = await signSession(input.sessionId, input.role, input.signatureBase64);
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
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session not found');
        if (session.status !== 'completed') throw new Error('Both parties must sign before generating PDF');

        const pdfBytes = await generateConstatPDF(session);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const filename = `constat-${session.id}-${new Date().toISOString().split('T')[0]}.pdf`;
        return { pdfBase64, filename };
      }),
  }),
  // ── EMAIL ─────────────────────────────────────────────────
  email: router({
    // Send PDF to driver's own email — they forward to their insurer
    sendToDriver: publicProcedure
      .input(z.object({
        sessionId:   z.string(),
        role:        z.enum(['A', 'B']),
        driverEmail: z.string().email(),
        pdfBase64:   z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session not found');

        const participant = input.role === 'A' ? session.participantA : session.participantB;
        const driverName = [participant?.driver?.firstName, participant?.driver?.lastName]
          .filter(Boolean).join(' ') || 'Conducteur';
        const insurerName = participant?.insurance?.company || undefined;
        const lang = participant?.language || 'fr';

        const result = await sendPDFToDriver({
          driverEmail:  input.driverEmail,
          driverName,
          role:         input.role,
          sessionId:    input.sessionId,
          pdfBase64:    input.pdfBase64,
          insurerName,
          language:     lang,
        });

        if (!result.ok) throw new Error(result.error || 'Email send failed');
        return { ok: true, messageId: result.messageId };
      }),
  }),

  // ── PAYMENT — packages Stripe ─────────────────────────────
  payment: router({
    // Retourner les packages disponibles
    packages: publicProcedure
      .query(() => Object.values(PACKAGES)),

    // Créer une session Stripe Checkout
    createCheckout: publicProcedure
      .input(z.object({
        packageId: z.enum(['single', 'pack3', 'pack10']),
        userEmail: z.string().email(),
        currency:  z.enum(['EUR', 'CHF']).default('EUR'),
        locale:    z.string().default('fr'),
      }))
      .mutation(async ({ input }) => {
        return createCheckoutSession(
          input.packageId,
          input.userEmail,
          input.currency,
          input.locale,
        );
      }),

    // Vérifier le solde de crédits
    credits: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const credits = await getUserCredits(input.email);
        return { credits };
      }),

    // Utiliser 1 crédit pour démarrer un constat
    useCredit: publicProcedure
      .input(z.object({ email: z.string().email(), sessionId: z.string() }))
      .mutation(async ({ input }) => {
        const ok = await useCredit(input.email, input.sessionId);
        if (!ok) throw new Error('Crédits insuffisants');
        return { ok: true };
      }),
  }),

  // ── USER — consentements RGPD ─────────────────────────────
  user: router({
    saveConsent: publicProcedure
      .input(z.object({
        email:             z.string().email(),
        consentCGU:        z.boolean(),
        consentMarketing:  z.boolean(),
        country:           z.string().optional(),
        language:          z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await saveConsent(
          input.email,
          input.consentCGU,
          input.consentMarketing,
          input.country,
          input.language,
        );
        return { ok: true };
      }),
  }),

});

export type AppRouter = typeof appRouter;
