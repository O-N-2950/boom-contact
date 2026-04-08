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
import { logger, maskEmail } from '../logger.js';
import { db, schema } from '../db/index.js';
import { sessions as sessionsTable } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { CLIENT_URL } from '../constants.js';

// ── File upload validation helpers ──────────────────────────────
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_BASE64_SIZE = 7_000_000; // ~5MB in base64 (~4/3 ratio)
export const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateBase64Image(base64String: string, mediaType: string): { valid: boolean; error?: string } {
  // Validate media type
  if (!VALID_MEDIA_TYPES.includes(mediaType)) {
    return { valid: false, error: `Invalid media type. Allowed: ${VALID_MEDIA_TYPES.join(', ')}` };
  }

  // Base64 length check (loose check before decode)
  if (base64String.length > MAX_IMAGE_BASE64_SIZE) {
    return { valid: false, error: `Image base64 exceeds maximum size (max ${MAX_IMAGE_BASE64_SIZE} chars)` };
  }

  // Attempt to decode and check actual byte size
  try {
    const buffer = Buffer.from(base64String, 'base64');
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: `Image size exceeds 5MB limit (actual: ${(buffer.length / 1024 / 1024).toFixed(2)}MB)` };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
}

// Import sub-routers
import { authRouter } from './auth.router.js';
import { policeRouter } from './police.router.js';
import { paymentRouter, userRouter } from './payment.router.js';
import { vehicleRouter } from './vehicle.router.js';
import { adminRouter, adminDeleteUser, adminSetCredits, adminListUsers, adminCleanupSessions, adminFixOwnerEmails, marketingRouter } from './admin.router.js';

// Import shared tRPC utilities
import { router, publicProcedure, protectedProcedure, adminProcedure, TRPCError, escapeHtml, checkIdempotency, storeIdempotency } from './trpc.js';
import { sessionCreateOutput, sessionGetOutput, sessionJoinOutput, pdfGenerateOutput, sessionSignOutput, sessionUpdateParticipantOutput, sessionUpdateAccidentOutput, sessionHistoryOutput, ocrScanOutput, ocrBatchScanOutput, ocrScanPairOutput, emailSendToDriverOutput, emailBugReportOutput, voiceTranscribeOutput, voiceAnalyzeAccidentOutput, sketchRenderOutput, emergencyInsuranceLookupOutput, emergencyCountryLookupOutput, emergencySingleLookupOutput } from './output-schemas.js';

// ── Helper: verify participant token for A-E ──────────────────
async function verifyAnyParticipant(sessionId: string, participantToken: string): Promise<void> {
  const roles = ['A', 'B', 'C', 'D', 'E'] as const;
  for (const role of roles) {
    const valid = await verifyParticipantToken(sessionId, participantToken, role);
    if (valid) return;
  }
  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid participant token' });
}

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
    // SECURITY: tokenB is only embedded in the QR URL, never returned directly to Driver A
    create: publicProcedure
      .input(z.object({ idempotencyKey: z.string().max(100).optional() }).optional())
      .output(sessionCreateOutput)
      .mutation(async ({ input }) => {
        const iKey = input?.idempotencyKey;
        const cached = checkIdempotency(iKey);
        if (cached) return cached as typeof sessionCreateOutput._output;

        const session = await createSession();
        const qrUrl = getQRUrl(session.id, session.tokenB, CLIENT_URL);
        const result = { sessionId: session.id, qrUrl, status: session.status, tokenA: session.tokenA };
        storeIdempotency(iKey, result);
        return result;
      }),

    // Get session state
    get: publicProcedure
      .input(z.object({ sessionId: z.string().max(50), participantToken: z.string().max(500) }))
      .output(sessionGetOutput)
      .query(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' });
        // Verify participantToken — either A or B token is valid
        const validA = await verifyParticipantToken(input.sessionId, input.participantToken, 'A');
        if (!validA) {
          const validB = await verifyParticipantToken(input.sessionId, input.participantToken, 'B');
          if (!validB) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid participant token' });
        }
        return session;
      }),

    // Driver B joins via QR scan — SECURITY: requires tokenB from QR code URL
    join: publicProcedure
      .input(z.object({ sessionId: z.string().max(50), tokenB: z.string().max(500), language: z.string().max(10).default('fr') }))
      .output(sessionJoinOutput)
      .mutation(async ({ input }) => {
        // Verify tokenB before allowing join (timing-safe comparison)
        const validToken = await verifyParticipantToken(input.sessionId, input.tokenB, 'B');
        if (!validToken) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired join token' });

        const session = await joinSession(input.sessionId, input.language);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found, expired or already completed' });

        // Notify driver A via WebSocket
        io.to(`session:${input.sessionId}`).emit('participant-joined', { role: 'B' });
        return session;
      }),

    // Update participant data (vehicle, driver, insurance)
    updateParticipant: publicProcedure
      .input(z.object({
        sessionId: z.string().max(50),
        role: z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().max(500),
        data: z.object({
          vehicle: z.object({
            vehicleType: z.string().max(100).optional(),
            licensePlate: z.string().max(50).optional(),
            plate: z.string().max(50).optional(),
            brand: z.string().max(100).optional(),
            make: z.string().max(100).optional(),
            model: z.string().max(100).optional(),
            year: z.string().max(10).optional(),
            color: z.string().max(50).optional(),
            vin: z.string().max(50).optional(),
            category: z.string().max(100).optional(),
            bodyStyle: z.string().max(100).optional(),
            type: z.string().max(100).optional(),
          }).optional(),
          driver: z.object({
            firstName: z.string().max(200).optional(),
            lastName: z.string().max(200).optional(),
            address: z.string().max(500).optional(),
            city: z.string().max(200).optional(),
            postalCode: z.string().max(20).optional(),
            country: z.string().max(100).optional(),
            phone: z.string().max(50).optional(),
            email: z.string().max(320).optional(),
            licenseNumber: z.string().max(100).optional(),
            licenseExpiry: z.string().max(50).optional(),
            name: z.string().max(200).optional(),
          }).optional(),
          insurance: z.object({
            company: z.string().max(300).optional(),
            policyNumber: z.string().max(100).optional(),
            agentName: z.string().max(200).optional(),
            agentPhone: z.string().max(50).optional(),
            agentEmail: z.string().max(320).optional(),
            address: z.string().max(500).optional(),
            greenCardNumber: z.string().max(100).optional(),
            greenCardExpiry: z.string().max(50).optional(),
          }).optional(),
          damagedZones: z.array(z.string().max(100)).max(50).optional(),
          circumstances: z.array(z.string().max(200)).max(50).optional(),
          language:     z.string().max(10).optional(),
          isPedestrian: z.boolean().optional(),
          signature: z.string().max(10_000_000).optional(),
          signedAt: z.string().max(50).optional(),
        }),
      }))
      .output(sessionUpdateParticipantOutput)
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
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
        data: z.object({
          date:             z.string().max(50).optional(),
          time:             z.string().max(50).optional(),
          location:         z.object({
            address: z.string().max(500).optional(),
            city: z.string().max(200).optional(),
            country: z.string().max(100).optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            postalCode: z.string().max(20).optional(),
            canton: z.string().max(100).optional(),
          }).optional(),
          description:      z.string().max(5000).optional(),
          faultDeclaration: z.enum(['A','B','shared','unknown']).optional(),
          witnesses:        z.string().max(2000).optional(),
          policeReport:     z.boolean().optional(),
          policeRef:        z.string().max(200).optional(),
          injuries:         z.boolean().optional(),
          sketchImage:      z.string().max(10_000_000).optional(),
          vehicleAPos:      z.object({
            x: z.number().optional(),
            y: z.number().optional(),
            rotation: z.number().optional(),
            direction: z.string().max(50).optional(),
          }).optional(),
          vehicleCount:     z.number().optional(),
          partyBStatus:     z.object({
            status: z.string().max(100).optional(),
            reason: z.string().max(1000).optional(),
            description: z.string().max(2000).optional(),
            type: z.string().max(100).optional(),
          }).optional(),
          photos:           z.array(z.object({
            id:       z.string().max(100),
            category: z.enum(['scene','vehicleA','vehicleB','injury','document','other']),
            base64:   z.string().max(7_000_000),
            caption:  z.string().max(500).optional(),
            takenAt:  z.string().max(50),
          })).max(20).optional(),
        }),
      }))
      .output(sessionUpdateAccidentOutput)
      .mutation(async ({ input }) => {
        // Verify participant token — REQUIRED (either party can update accident)
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        // Validate photo sizes
        if (input.data.photos) {
          for (const photo of input.data.photos) {
            const validation = validateBase64Image(photo.base64, 'image/jpeg');
            if (!validation.valid) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: `Photo validation failed: ${validation.error || 'Invalid image'}` });
            }
          }
        }

        const session = await updateAccident(input.sessionId, input.data as any);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        io.to(`session:${input.sessionId}`).emit('accident-updated', input.data);
        return { ok: true };
      }),

    // Sign constat
    sign: publicProcedure
      .input(z.object({
        sessionId:       z.string().max(50),
        role:            z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().max(500),
        signatureBase64: z.string().min(100).max(10_000_000),
      }))
      .output(sessionSignOutput)
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

              const A = fullSession.participantA;
              const B = fullSession.participantB;
              const emailA = A?.driver?.email;
              const emailB = B?.driver?.email;

              // Stocker ownerEmail en DB
              if (emailA) {
                await db.update(sessionsTable)
                  .set({ ownerEmail: emailA })
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
                logger.info(`PDF envoyé à conducteur A: ${maskEmail(emailA)}`);
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
                logger.info(`PDF envoyé à conducteur B: ${maskEmail(emailB)}`);
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
                logger.info(`PDF envoyé au piéton: ${maskEmail(emailB)}`);
              }

            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              const errorStack = err instanceof Error ? err.stack : undefined;
              logger.error('Auto PDF/email failed — requires manual retry', {
                sessionId: input.sessionId,
                error: errorMsg,
                stack: errorStack,
              });
            }
          });
        }
        return { ok: true, bothSigned, status: session.status };
      }),

    // GET session.history — sessions where owner_email = logged-in user
    history: protectedProcedure
      .output(sessionHistoryOutput)
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
        imageBase64:  z.string().min(100).max(7_000_000),
        mediaType:    z.enum(['image/jpeg','image/png','image/webp','image/gif']).default('image/jpeg'),
        documentType: z.enum(['vehicle_registration','green_card','drivers_license','auto']).default('auto'),
        country:      z.string().max(10).optional(),
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
      }))
      .output(ocrScanOutput)
      .mutation(async ({ input }) => {
        // SECURITY: Always require valid session context — no anonymous OCR
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        // Validate image size and media type
        const validation = validateBase64Image(input.imageBase64, input.mediaType);
        if (!validation.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: validation.error || 'Invalid image file' });
        }

        const hint = input.documentType !== 'auto' || input.country
          ? { documentType: input.documentType, country: input.country }
          : undefined;
        return scanDocument(input.imageBase64, input.mediaType, hint);
      }),

    batchScan: publicProcedure
      .input(z.object({
        images: z.array(z.string().min(100).max(10_000_000)).min(1).max(4),
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
      }))
      .output(ocrBatchScanOutput)
      .mutation(async ({ input }) => {
        // SECURITY: Always require valid session context — no anonymous OCR
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        // Validate each image before processing
        for (const imageBase64 of input.images) {
          const validation = validateBase64Image(imageBase64, 'image/jpeg');
          if (!validation.valid) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: validation.error || 'Invalid image file in batch' });
          }
        }

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
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
      }))
      .output(ocrScanPairOutput)
      .mutation(async ({ input }) => {
        // SECURITY: Always require valid session context — no anonymous OCR
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        // Validate both images
        const regValidation = validateBase64Image(input.registrationBase64, 'image/jpeg');
        if (!regValidation.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Registration: ${regValidation.error || 'Invalid image'}` });
        }

        const greenCardValidation = validateBase64Image(input.greenCardBase64, 'image/jpeg');
        if (!greenCardValidation.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Green card: ${greenCardValidation.error || 'Invalid image'}` });
        }

        return scanDocumentPair(input.registrationBase64, input.greenCardBase64);
      }),
  }),

  // ── PDF ────────────────────────────────
  pdf: router({
    generate: publicProcedure
      .input(z.object({
        sessionId: z.string().max(50),
        role: z.enum(['A', 'B', 'C', 'D', 'E']).default('A'),
        participantToken: z.string().max(500),
      }))
      .output(pdfGenerateOutput)
      .mutation(async ({ input }) => {
        // Verify participant token
        await verifyAnyParticipant(input.sessionId, input.participantToken);
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const acc = session.accident ?? {};
        const hasPartyBStatus = !!acc.partyBStatus;
        const sessionVehicleCount = session.vehicleCount ?? 2;
        const isSolo = sessionVehicleCount === 1;
        const NON_SIGNING = ['pedestrian', 'bicycle', 'escooter', 'cargo_bike', 'moped'];
        const bIsNonSigning =
          NON_SIGNING.includes(session.participantB?.vehicle?.vehicleType) ||
          NON_SIGNING.includes(session.participantB?.vehicle?.bodyStyle) ||
          session.participantB?.isPedestrian === true;
        const aHasSigned = !!session.participantA?.signature;

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
        sessionId:        z.string().max(50),
        role:             z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().max(500),
        driverEmail:      z.string().email().max(320),
        pdfBase64:        z.string().min(100).max(20_000_000),
      }))
      .output(emailSendToDriverOutput)
      .mutation(async ({ input }) => {
        // Verify participant token
        await verifyAnyParticipant(input.sessionId, input.participantToken);
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const roleMap: Record<string, Partial<typeof session.participantA> | null | undefined> = {
          A: session.participantA, B: session.participantB,
          C: session.participantC, D: session.participantD,
          E: session.participantE,
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
      .output(emailBugReportOutput)
      .mutation(async ({ input }) => {
        const { getResendClient } = await import('../services/email.service.js');
        const resend = await getResendClient();
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
            <p style="color:#595959;font-size:12px;">boom.contact Bug Report · ${new Date().toISOString()}</p>`,
        });
        return { ok: true };
      }),
  }),

  // ── VOICE ────────────────────────────────
  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(100).max(10_000_000),
        mimeType:    z.string().max(100).default('audio/webm'),
        lang:        z.string().max(10).optional(),
        sessionId:   z.string().max(50),
        role:        z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().max(500),
      }))
      .output(voiceTranscribeOutput)
      .mutation(async ({ input }) => {
        // Verify participant token
        await verifyAnyParticipant(input.sessionId, input.participantToken);
        const result = await transcribeAudio(
          input.audioBase64,
          input.mimeType,
          input.lang
        );
        return result;
      }),

    analyzeAccident: publicProcedure
      .input(z.object({
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
        transcript:      z.string().min(1).max(50_000),
        previousAnswers: z.record(z.string().max(5000)).optional(),
      }))
      .output(voiceAnalyzeAccidentOutput)
      .mutation(async ({ input }) => {
        // Verify participant token
        await verifyAnyParticipant(input.sessionId, input.participantToken);
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
        sessionId:         z.string().max(50),
        participantToken:  z.string().max(500),
        scenario:          z.string().max(100).default('intersection_cross'),
        trafficSide:       z.enum(['right','left']).default('right'),
        vehicleAType:      z.string().max(100).default('car'),
        vehicleAColor:     z.string().max(50).default('bleu'),
        vehicleADirection: z.string().max(50).default('east'),
        vehicleAImpactZone:z.string().max(50).default('front'),
        vehicleAMoving:    z.boolean().default(true),
        vehicleAReversing: z.boolean().default(false),
        vehicleABrand:     z.string().max(100).optional(),
        vehicleAModel:     z.string().max(100).optional(),
        vehicleAPlate:     z.string().max(50).optional(),
        vehicleBType:      z.string().max(100).default('car'),
        vehicleBColor:     z.string().max(50).default('rouge'),
        vehicleBDirection: z.string().max(50).default('west'),
        vehicleBImpactZone:z.string().max(50).default('front'),
        vehicleBMoving:    z.boolean().default(true),
        vehicleBReversing: z.boolean().default(false),
        vehicleBBrand:     z.string().max(100).optional(),
        vehicleBModel:     z.string().max(100).optional(),
        vehicleBPlate:     z.string().max(50).optional(),
        mapImageBase64:    z.string().max(10_000_000).optional(),
        width:             z.number().default(900),
        height:            z.number().default(650),
      }))
      .output(sketchRenderOutput)
      .mutation(async ({ input }) => {
        // SECURITY: Verify participant token before allowing render
        await verifyAnyParticipant(input.sessionId, input.participantToken);
        const pngBase64 = await renderSketch(input);
        return { pngBase64, width: input.width, height: input.height };
      }),
  }),

  // ── EMERGENCY ────────────────────────────────
  emergency: router({
    insuranceLookup: publicProcedure
      .input(z.object({
        insurerA: z.string().max(300).optional(),
        insurerB: z.string().max(300).optional(),
        countryCode: z.string().max(10).optional(),
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
      }))
      .output(emergencyInsuranceLookupOutput)
      .mutation(async ({ input }) => {
        await verifyAnyParticipant(input.sessionId, input.participantToken);
        const [resultA, resultB] = await Promise.all([
          input.insurerA ? getInsuranceAssistance(input.insurerA, input.countryCode) : Promise.resolve(null),
          input.insurerB ? getInsuranceAssistance(input.insurerB, input.countryCode) : Promise.resolve(null),
        ]);

        return { participantA: resultA, participantB: resultB };
      }),

    countryLookup: publicProcedure
      .input(z.object({
        countryCode: z.string().min(2).max(3),
        countryName: z.string().max(200).optional(),
        sessionId: z.string().max(50).optional(),
        participantToken: z.string().max(500).optional(),
      }))
      .output(emergencyCountryLookupOutput)
      .query(async ({ input }) => {
        if (input.sessionId && input.participantToken) {
          await verifyAnyParticipant(input.sessionId, input.participantToken);
        }
        return getCountryEmergencyNumbers(input.countryCode, input.countryName);
      }),

    singleLookup: publicProcedure
      .input(z.object({
        insurer: z.string().min(2).max(300),
        country: z.string().max(10).optional(),
        sessionId: z.string().max(50),
        participantToken: z.string().max(500),
      }))
      .output(emergencySingleLookupOutput)
      .mutation(async ({ input }) => {
        await verifyAnyParticipant(input.sessionId, input.participantToken);
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