import { z } from 'zod';
import type { Context } from '../middleware/context';
import { scanDocument, scanDocumentPair } from '../services/ocr.service';
import {
  createSession, getSession, joinSession,
  updateParticipant, updateAccident, signSession, getQRUrl, savePdfUrl,
  verifyParticipantToken
} from '../services/session.service';
import { generateConstatPDF } from '../services/pdf.service.js';
import { sendPDFToDriver } from '../services/email.service.js';
import { transcribeAudio } from '../services/voice.service.js';
import { analyzeAccidentTranscript } from '../services/accident-analyzer.service.js';
import { renderSketch } from '../services/sketch-renderer.service.js';
import { getInsuranceAssistance } from '../services/insurance-assistance.service.js';
import { getCountryEmergencyNumbers } from '../services/emergency-numbers.service.js';
import { io } from '../index';
import { logger } from '../logger.js';
import { db, schema } from '../db/index.js';
import { sessions as sessionsTable } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { CLIENT_URL } from '../constants.js';

// Import sub-routers
import { authRouter } from './auth.router.js';
import { policeRouter } from './police.router.js';
import { paymentRouter, userRouter } from './payment.router.js';
import { vehicleRouter } from './vehicle.router.js';
import { adminRouter, adminDeleteUser, adminSetCredits, adminListUsers, adminCleanupSessions, adminFixOwnerEmails, marketingRouter } from './admin.router.js';

// Import shared tRPC utilities
import { router, publicProcedure, protectedProcedure, TRPCError, escapeHtml } from './trpc.js';

/**
 * Main tRPC Router
 *
 * Structure:
 *   - session: Session lifecycle, participants, updates, PDFs
 *   - ocr: Document scanning
 *   - pdf: PDF generation
 *   - email: PDF sending via email
 *   - payment: Stripe billing
 *   - user: GDPR consent
 *   - police: Police B2B access
 *   - voice: Audio transcription
 *   - sketch: Accident diagram rendering
 *   - auth: Authentication
 *   - vehicle: Personal garage
 *   - admin: Admin dashboard
 *   - emergency: Insurance/emergency lookup
 *   - adminDeleteUser, adminSetCredits, etc: Admin maintenance (top-level)
 *   - marketing: Social post management
 */
export const appRouter = router({

  // ── SESSION ────────────────────────────────
  session: router({

    // Driver A creates session → gets QR code URL + participant tokens
    create: publicProcedure
      .mutation(async () => {
        const session = await createSession();
        const qrUrl = getQRUrl(session.id, CLIENT_URL);
        return { sessionId: session.id, qrUrl, status: session.status, tokenA: session.tokenA, tokenB: session.tokenB };
      }),

    // Get session state
    get: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' });
        return session;
      }),

    // Driver B joins via QR scan
    join: publicProcedure
      .input(z.object({ sessionId: z.string(), language: z.string().default('fr') }))
      .mutation(async ({ input }) => {
        const session = await joinSession(input.sessionId, input.language);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found, expired or already completed' });

        // Notify driver A via WebSocket
        io.to(`session:${input.sessionId}`).emit('participant-joined', { role: 'B' });
        return session;
      }),

    // Update participant data (vehicle, driver, insurance)
    updateParticipant: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        role: z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string(),
        data: z.object({
          vehicle: z.object({
            vehicleType: z.string().optional(),
            licensePlate: z.string().optional(),
            plate: z.string().optional(),
            brand: z.string().optional(),
            make: z.string().optional(),
            model: z.string().optional(),
            year: z.string().optional(),
            color: z.string().optional(),
            vin: z.string().optional(),
            category: z.string().optional(),
            bodyStyle: z.string().optional(),
            type: z.string().optional(),
          }).catchall(z.unknown()).optional(),
          driver: z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            licenseNumber: z.string().optional(),
            licenseExpiry: z.string().optional(),
            name: z.string().optional(),
          }).catchall(z.unknown()).optional(),
          insurance: z.object({
            company: z.string().optional(),
            policyNumber: z.string().optional(),
            agentName: z.string().optional(),
            agentPhone: z.string().optional(),
            agentEmail: z.string().optional(),
            address: z.string().optional(),
            greenCardNumber: z.string().optional(),
            greenCardExpiry: z.string().optional(),
          }).catchall(z.unknown()).optional(),
          damagedZones: z.array(z.string()).optional(),
          circumstances: z.array(z.string()).optional(),
          language:     z.string().optional(),
          isPedestrian: z.boolean().optional(),
          signature: z.string().optional(),
          signedAt: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        // Verify participant token — REQUIRED
        const valid = await verifyParticipantToken(input.sessionId, input.participantToken, input.role);
        if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing participant token' });

        const session = await updateParticipant(input.sessionId, input.role, input.data as any);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

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
        participantToken: z.string(),
        data: z.object({
          date:             z.string().optional(),
          time:             z.string().optional(),
          location:         z.object({
            address: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            postalCode: z.string().optional(),
            canton: z.string().optional(),
          }).catchall(z.unknown()).optional(),
          description:      z.string().optional(),
          faultDeclaration: z.enum(['A','B','shared','unknown']).optional(),
          witnesses:        z.string().optional(),
          policeReport:     z.boolean().optional(),
          policeRef:        z.string().optional(),
          injuries:         z.boolean().optional(),
          sketchImage:      z.string().optional(),
          vehicleAPos:      z.object({
            x: z.number().optional(),
            y: z.number().optional(),
            rotation: z.number().optional(),
            direction: z.string().optional(),
          }).catchall(z.unknown()).optional(),
          vehicleCount:     z.number().optional(),
          partyBStatus:     z.object({
            status: z.string().optional(),
            reason: z.string().optional(),
            description: z.string().optional(),
            type: z.string().optional(),
          }).catchall(z.unknown()).optional(),
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
        // Verify participant token — REQUIRED (either party can update accident)
        const validA = await verifyParticipantToken(input.sessionId, input.participantToken, 'A');
        if (!validA) {
          const validB = await verifyParticipantToken(input.sessionId, input.participantToken, 'B');
          if (!validB) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing participant token' });
        }

        const session = await updateAccident(input.sessionId, input.data as any);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        io.to(`session:${input.sessionId}`).emit('accident-updated', input.data);
        return { ok: true };
      }),

    // Sign constat
    sign: publicProcedure
      .input(z.object({
        sessionId:       z.string(),
        role:            z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string(),
        signatureBase64: z.string().min(100).max(10_000_000),
      }))
      .mutation(async ({ input }) => {
        // Verify participant token — REQUIRED
        const valid = await verifyParticipantToken(input.sessionId, input.participantToken, input.role);
        if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing participant token' });

        const result = await signSession(input.sessionId, input.role, input.signatureBase64);
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const { session, bothSigned } = result;
        io.to(`session:${input.sessionId}`).emit('signed', { role: input.role, bothSigned });

        if (bothSigned) {
          io.to(`session:${input.sessionId}`).emit('constat-complete', { sessionId: input.sessionId });

          // ── Auto PDF + email ─────────────────────────────
          setImmediate(async () => {
            try {
              const fullSession = await getSession(input.sessionId);
              if (!fullSession) return;

              const A = fullSession.participantA as any;
              const B = fullSession.participantB as any;
              const emailA = A?.driver?.email;
              const emailB = B?.driver?.email;

              // Stocker ownerEmail en DB
              if (emailA) {
                await db.update(sessionsTable)
                  .set({ ownerEmail: emailA } as any)
                  .where(eq(sessionsTable.id, input.sessionId));
              }

              // Générer PDF pour A
              const pdfBytesA = await generateConstatPDF(fullSession, 'A');
              const pdfB64A = Buffer.from(pdfBytesA).toString('base64');
              const filename = `constat-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;

              // Sauvegarder l'URL en DB
              await savePdfUrl(input.sessionId, `data:application/pdf;base64,${pdfB64A.slice(0, 50)}...`);

              // Envoyer à conducteur A
              if (emailA) {
                const nameA = [A?.driver?.firstName, A?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur A';
                await sendPDFToDriver({
                  driverEmail: emailA,
                  driverName: nameA,
                  role: 'A',
                  sessionId: input.sessionId,
                  pdfBase64: pdfB64A,
                  insurerName: A?.insurance?.company,
                  language: A?.language || 'fr',
                });
                logger.info(`PDF envoyé à conducteur A: ${emailA}`);
              }

              // Envoyer à conducteur B (si email disponible et pas piéton)
              const bVehicleType = B?.vehicle?.vehicleType;
              const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
              const bIsPedestrian = NON_SIGNING.includes(bVehicleType) || B?.isPedestrian;

              if (emailB && !bIsPedestrian) {
                const pdfBytesB = await generateConstatPDF(fullSession, 'B');
                const pdfB64B = Buffer.from(pdfBytesB).toString('base64');
                const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur B';
                await sendPDFToDriver({
                  driverEmail: emailB,
                  driverName: nameB,
                  role: 'B',
                  sessionId: input.sessionId,
                  pdfBase64: pdfB64B,
                  insurerName: B?.insurance?.company,
                  language: B?.language || 'fr',
                });
                logger.info(`PDF envoyé à conducteur B: ${emailB}`);
              }

              // Piéton avec email → envoyer PDF version A aussi
              if (emailB && bIsPedestrian) {
                const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Piéton';
                await sendPDFToDriver({
                  driverEmail: emailB,
                  driverName: nameB,
                  role: 'A',
                  sessionId: input.sessionId,
                  pdfBase64: pdfB64A,
                  language: B?.language || 'fr',
                });
                logger.info(`PDF envoyé au piéton: ${emailB}`);
              }

            } catch (err) {
              logger.error('Auto PDF/email failed', { sessionId: input.sessionId, err: String(err) });
            }
          });
        }
        return { ok: true, bothSigned, status: session.status };
      }),

    // GET session.history — sessions where owner_email = logged-in user
    history: protectedProcedure
      .query(async ({ ctx }) => {
        return db.query.sessions.findMany({
          where: eq(sessionsTable.ownerEmail, ctx.authUser.email),
          orderBy: [desc(sessionsTable.createdAt)],
          limit: 50,
        });
      }),

  }),

  // ── OCR ────────────────────────────────
  ocr: router({
    scan: publicProcedure
      .input(z.object({
        imageBase64:  z.string().min(100).max(10_000_000),
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

    batchScan: publicProcedure
      .input(z.object({
        images: z.array(z.string().min(100).max(10_000_000)).min(1).max(4),
      }))
      .mutation(async ({ input }) => {
        const results = await Promise.all(
          input.images.map(imageBase64 =>
            scanDocument(imageBase64, 'image/jpeg', { documentType: 'auto' })
          )
        );
        return results;
      }),

    scanPair: publicProcedure
      .input(z.object({
        registrationBase64: z.string().min(100).max(10_000_000),
        greenCardBase64:    z.string().min(100).max(10_000_000),
      }))
      .mutation(async ({ input }) =>
        scanDocumentPair(input.registrationBase64, input.greenCardBase64)
      ),
  }),

  // ── PDF ────────────────────────────────
  pdf: router({
    generate: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        role: z.enum(['A', 'B', 'C', 'D', 'E']).default('A'),
      }))
      .mutation(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const acc = (session as any).accident ?? {};
        const hasPartyBStatus = !!acc.partyBStatus;
        const sessionVehicleCount = (session as any).vehicleCount ?? 2;
        const isSolo = sessionVehicleCount === 1;
        const NON_SIGNING = ['pedestrian', 'bicycle', 'escooter', 'cargo_bike', 'moped'];
        const bIsNonSigning =
          NON_SIGNING.includes((session.participantB as any)?.vehicle?.vehicleType) ||
          NON_SIGNING.includes((session.participantB as any)?.vehicle?.bodyStyle) ||
          (session.participantB as any)?.isPedestrian === true;
        const aHasSigned = !!(session.participantA as any)?.signature;

        const canGenerate =
          session.status === 'completed' ||
          (session.status === 'signing' && aHasSigned && (hasPartyBStatus || isSolo || bIsNonSigning));

        if (!canGenerate) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Both parties must sign before generating PDF' });

        const role = (input.role === 'A' || input.role === 'B') ? input.role : 'A';
        const pdfBytes = await generateConstatPDF(session, role);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const filename = `constat-${session.id}-${role}-${new Date().toISOString().split('T')[0]}.pdf`;
        return { pdfBase64, filename };
      }),
  }),

  // ── EMAIL ────────────────────────────────
  email: router({
    sendToDriver: publicProcedure
      .input(z.object({
        sessionId:   z.string(),
        role:        z.enum(['A', 'B', 'C', 'D', 'E']),
        driverEmail: z.string().email(),
        pdfBase64:   z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const roleMap: Record<string, any> = {
          A: session.participantA, B: session.participantB,
          C: (session as any).participantC, D: (session as any).participantD,
          E: (session as any).participantE,
        };
        const participant = roleMap[input.role];
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

        if (!result.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Email send failed' });
        return { ok: true, messageId: result.messageId };
      }),

    bugReport: publicProcedure
      .input(z.object({
        message:  z.string().min(5).max(2000),
        userEmail: z.string().email().optional(),
        page:     z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const safeEmail = escapeHtml(input.userEmail || 'Anonyme');
        const safePage = escapeHtml(input.page || 'Inconnue');
        const safeUA = escapeHtml(input.userAgent || 'Inconnu');
        const safeMessage = escapeHtml(input.message);
        await resend.emails.send({
          from: 'boom.contact <contact@boom.contact>',
          to:   'contact@boom.contact',
          subject: `🐛 Bug report — boom.contact`,
          html: `<h2>Bug Report</h2>
            <p><strong>De :</strong> ${safeEmail}</p>
            <p><strong>Page :</strong> ${safePage}</p>
            <p><strong>User-Agent :</strong> ${safeUA}</p>
            <hr>
            <p><strong>Message :</strong></p>
            <p style="white-space:pre-wrap;">${safeMessage}</p>
            <hr>
            <p style="color:#999;font-size:12px;">boom.contact Bug Report · ${new Date().toISOString()}</p>`,
        });
        return { ok: true };
      }),
  }),

  // ── VOICE ────────────────────────────────
  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(100).max(10_000_000),
        mimeType:    z.string().default('audio/webm'),
        lang:        z.string().optional(),
        sessionId:   z.string(),
        role:        z.enum(['A', 'B', 'C', 'D', 'E']),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio(
          input.audioBase64,
          input.mimeType,
          input.lang
        );
        return result;
      }),

    analyzeAccident: publicProcedure
      .input(z.object({
        transcript:      z.string().min(1),
        previousAnswers: z.record(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await analyzeAccidentTranscript(
          input.transcript,
          input.previousAnswers
        );
        return result;
      }),
  }),

  // ── SKETCH ────────────────────────────────
  sketch: router({
    render: publicProcedure
      .input(z.object({
        scenario:          z.string().default('intersection_cross'),
        trafficSide:       z.enum(['right','left']).default('right'),
        vehicleAType:      z.string().default('car'),
        vehicleAColor:     z.string().default('bleu'),
        vehicleADirection: z.string().default('east'),
        vehicleAImpactZone:z.string().default('front'),
        vehicleAMoving:    z.boolean().default(true),
        vehicleAReversing: z.boolean().default(false),
        vehicleABrand:     z.string().optional(),
        vehicleAModel:     z.string().optional(),
        vehicleAPlate:     z.string().optional(),
        vehicleBType:      z.string().default('car'),
        vehicleBColor:     z.string().default('rouge'),
        vehicleBDirection: z.string().default('west'),
        vehicleBImpactZone:z.string().default('front'),
        vehicleBMoving:    z.boolean().default(true),
        vehicleBReversing: z.boolean().default(false),
        vehicleBBrand:     z.string().optional(),
        vehicleBModel:     z.string().optional(),
        vehicleBPlate:     z.string().optional(),
        mapImageBase64:    z.string().optional(),
        width:             z.number().default(900),
        height:            z.number().default(650),
      }))
      .mutation(async ({ input }) => {
        const pngBase64 = await renderSketch(input);
        return { pngBase64, width: input.width, height: input.height };
      }),
  }),

  // ── EMERGENCY ────────────────────────────────
  emergency: router({
    insuranceLookup: publicProcedure
      .input(z.object({
        insurerA: z.string().optional(),
        insurerB: z.string().optional(),
        countryCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const [resultA, resultB] = await Promise.all([
          input.insurerA ? getInsuranceAssistance(input.insurerA, input.countryCode) : Promise.resolve(null),
          input.insurerB ? getInsuranceAssistance(input.insurerB, input.countryCode) : Promise.resolve(null),
        ]);

        return { participantA: resultA, participantB: resultB };
      }),

    countryLookup: publicProcedure
      .input(z.object({
        countryCode: z.string().min(2).max(3),
        countryName: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getCountryEmergencyNumbers(input.countryCode, input.countryName);
      }),

    singleLookup: publicProcedure
      .input(z.object({
        insurer: z.string().min(2),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return getInsuranceAssistance(input.insurer, input.country);
      }),
  }),

  // ── MERGED SUB-ROUTERS ────────────────────────────────
  payment: paymentRouter,
  user: userRouter,
  police: policeRouter,
  auth: authRouter,
  vehicle: vehicleRouter,
  admin: adminRouter,

  // ── ADMIN MAINTENANCE (top-level procedures) ────────────────────────────────
  adminDeleteUser,
  adminSetCredits,
  adminListUsers,
  adminCleanupSessions,
  adminFixOwnerEmails,

  // ── MARKETING ────────────────────────────────
  marketing: marketingRouter,
});

export type AppRouter = typeof appRouter;
