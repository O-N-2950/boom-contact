import { z } from 'zod';
import type { Context } from '../middleware/context';
import { scanDocument, scanDocumentPair } from '../services/ocr.service';
import {
  createSession, getSession, joinSession,
  updateParticipant, updateAccident, signSession, getQRUrl, savePdfUrl,
  verifyParticipantToken, getParticipantTokens
} from '../services/session.service';
import { generateConstatPDF } from '../services/pdf.service.js';
import { sendPDFToDriver } from '../services/email.service.js';
import { timestampPDF } from '../services/timestamp.service.js';
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

// Magic bytes signatures for image format verification
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  'image/gif':  [0x47, 0x49, 0x46],        // GIF
};

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
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64String, 'base64');
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: `Image size exceeds 5MB limit (actual: ${(buffer.length / 1024 / 1024).toFixed(2)}MB)` };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  // Verify magic bytes match declared media type
  const expectedMagic = MAGIC_BYTES[mediaType];
  if (expectedMagic) {
    if (buffer.length < expectedMagic.length) {
      return { valid: false, error: 'File too small to be a valid image' };
    }
    const match = expectedMagic.every((byte, i) => buffer[i] === byte);
    if (!match) {
      return { valid: false, error: `File content does not match declared type ${mediaType} (magic bytes mismatch)` };
    }
  }

  return { valid: true };
}

// Import sub-routers
import { authRouter } from './auth.router.js';
import { policeRouter } from './police.router.js';
import { paymentRouter, userRouter } from './payment.router.js';
import { vehicleRouter } from './vehicle.router.js';
import { adminRouter, adminDeleteUser, adminSetCredits, adminListUsers, adminCleanupSessions, adminFixOwnerEmails, adminListConstats, adminResendPdf, adminB2BOutreach, marketingRouter } from './admin.router.js';

// Import shared tRPC utilities
import { router, publicProcedure, protectedProcedure, adminProcedure, TRPCError, escapeHtml, checkIdempotency, storeIdempotency, stripHtmlTags } from './trpc.js';
import { logAudit } from '../services/audit.service.js';
import { sessionCreateOutput, sessionGetOutput, sessionJoinOutput, pdfGenerateOutput, sessionSignOutput, sessionUpdateParticipantOutput, sessionUpdateAccidentOutput, sessionHistoryOutput, ocrScanOutput, ocrBatchScanOutput, ocrScanPairOutput, emailSendToDriverOutput, emailBugReportOutput, voiceTranscribeOutput, voiceAnalyzeAccidentOutput, sketchRenderOutput, emergencyInsuranceLookupOutput, emergencyCountryLookupOutput, emergencySingleLookupOutput, sessionVerifyProofOutput } from './output-schemas.js';
import { verifyHash } from '../services/timestamp.service.js';

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
      .input(z.object({ idempotencyKey: z.string().trim().max(100).optional() }).optional())
      .output(sessionCreateOutput)
      .mutation(async ({ input }) => {
        const iKey = input?.idempotencyKey;
        const cached = checkIdempotency(iKey);
        if (cached) return cached as typeof sessionCreateOutput._output;

        const session = await createSession();
        const qrUrl = getQRUrl(session.id, session.tokenB, CLIENT_URL);
        const result = { sessionId: session.id, qrUrl, status: session.status, tokenA: session.tokenA };
        storeIdempotency(iKey, result);
        logAudit({ event: 'session.created', sessionId: session.id });
        return result;
      }),

    // Get session state
    get: publicProcedure
      .input(z.object({ sessionId: z.string().trim().max(50), participantToken: z.string().trim().max(500) }))
      .output(sessionGetOutput)
      .query(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' });
        // Verify participantToken — tout token participant valide (A à E)
        let valid = false;
        for (const r of ['A', 'B', 'C', 'D', 'E']) {
          if (await verifyParticipantToken(input.sessionId, input.participantToken, r)) { valid = true; break; }
        }
        if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid participant token' });
        return session;
      }),

    // Un participant rejoint via QR — SECURITY: requiert le token du rôle (depuis l'URL du QR)
    join: publicProcedure
      .input(z.object({ sessionId: z.string().trim().max(50), tokenB: z.string().trim().max(500), role: z.enum(['B','C','D','E']).default('B'), language: z.string().trim().max(10).default('fr') }))
      .output(sessionJoinOutput)
      .mutation(async ({ input }) => {
        // Vérifie le token DU RÔLE (timing-safe) — B = tokenB stocké, C/D/E = token dérivé
        const validToken = await verifyParticipantToken(input.sessionId, input.tokenB, input.role);
        if (!validToken) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired join token' });

        const session = await joinSession(input.sessionId, input.language, input.role);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found, expired or already completed' });

        // Notify driver A via WebSocket
        io.to(`session:${input.sessionId}`).emit('participant-joined', { role: input.role });
        return session;
      }),

    // Voie B — Tokens de jonction par rôle (B/C/D/E) pour générer les QR
    // multi-véhicules. Gardé par tokenA : seul le créateur de session y accède.
    participantTokens: publicProcedure
      .input(z.object({ sessionId: z.string().trim().max(50), participantToken: z.string().trim().max(500) }))
      .query(async ({ input }) => {
        const validA = await verifyParticipantToken(input.sessionId, input.participantToken, 'A');
        if (!validA) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid participant token' });
        const tokens = await getParticipantTokens(input.sessionId);
        if (!tokens) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        return tokens;
      }),

    // Update participant data (vehicle, driver, insurance)
    updateParticipant: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().max(50),
        role: z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().trim().max(500),
        data: z.object({
          vehicle: z.object({
            vehicleType: z.string().trim().max(100).optional(),
            licensePlate: z.string().trim().max(50).optional(),
            plate: z.string().trim().max(50).optional(),
            brand: z.string().trim().max(100).optional(),
            make: z.string().trim().max(100).optional(),
            model: z.string().trim().max(100).optional(),
            year: z.string().trim().max(10).optional(),
            color: z.string().trim().max(50).optional(),
            vin: z.string().trim().max(50).optional(),
            category: z.string().trim().max(100).optional(),
            bodyStyle: z.string().trim().max(100).optional(),
            type: z.string().trim().max(100).optional(),
          }).optional(),
          driver: z.object({
            firstName: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            lastName: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            address: z.string().trim().max(500).optional().transform(v => v ? stripHtmlTags(v) : v),
            city: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            postalCode: z.string().trim().max(20).optional(),
            country: z.string().trim().max(100).optional(),
            phone: z.string().trim().max(50).optional(),
            email: z.string().trim().max(320).optional(),
            licenseNumber: z.string().trim().max(100).optional(),
            licenseExpiry: z.string().trim().max(50).optional(),
            name: z.string().trim().max(200).optional(),
          }).optional(),
          insurance: z.object({
            company: z.string().trim().max(300).optional(),
            policyNumber: z.string().trim().max(100).optional(),
            agentName: z.string().trim().max(200).optional(),
            agentPhone: z.string().trim().max(50).optional(),
            agentEmail: z.string().trim().max(320).optional(),
            address: z.string().trim().max(500).optional(),
            greenCardNumber: z.string().trim().max(100).optional(),
            greenCardExpiry: z.string().trim().max(50).optional(),
          }).optional(),
          damagedZones: z.array(z.string().trim().max(100)).max(50).optional(),
          circumstances: z.array(z.string().trim().max(200)).max(50).optional(),
          language:     z.string().trim().max(10).optional(),
          isPedestrian: z.boolean().optional(),
          signature: z.string().max(10_000_000).optional(),
          signedAt: z.string().trim().max(50).optional(),
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

    // H2 — Conducteur A documente la partie adverse PIÉTON SANS TÉLÉPHONE
    // (constat unilatéral : aucun conducteur B ne scanne de QR, donc aucun
    //  détenteur de tokenB). Le créateur de session (tokenA) est autorisé à
    //  écrire participantB UNIQUEMENT si aucun vrai B n'a déjà saisi de
    //  données (garde anti-écrasement). Sécurisé : tokenA prouve la
    //  propriété de la session ; le garde empêche d'écraser un B réel.
    fillAbsentPedestrian: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().max(50),
        participantToken: z.string().trim().max(500),
        data: z.object({
          driver: z.object({
            firstName: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            lastName: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            address: z.string().trim().max(500).optional().transform(v => v ? stripHtmlTags(v) : v),
            city: z.string().trim().max(200).optional().transform(v => v ? stripHtmlTags(v) : v),
            postalCode: z.string().trim().max(20).optional(),
            country: z.string().trim().max(100).optional(),
            phone: z.string().trim().max(50).optional(),
            email: z.string().trim().max(320).optional(),
          }).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        // Auth : SEUL le créateur de session (tokenA) est autorisé
        const validA = await verifyParticipantToken(input.sessionId, input.participantToken, 'A');
        if (!validA) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid participant token' });

        const session = await getSession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        // Garde anti-écrasement : refuser si un vrai B a déjà saisi des données
        const b: any = (session as any).participantB;
        const bHasRealData = !!(b && (b.driver?.firstName || b.driver?.lastName || b.vehicle?.licensePlate || b.vehicle?.plate));
        if (bHasRealData) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Participant B already has data' });
        }

        await updateParticipant(input.sessionId, 'B', {
          vehicle: { vehicleType: 'pedestrian' },
          driver: input.data.driver ?? {},
          isPedestrian: true,
        } as any);
        logAudit({ event: 'session.absentPedestrianFilled', sessionId: input.sessionId });
        return { ok: true };
      }),

    // Update shared accident data
    updateAccident: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().max(50),
        participantToken: z.string().trim().max(500),
        data: z.object({
          date:             z.string().trim().max(50).optional(),
          time:             z.string().trim().max(50).optional(),
          location:         z.object({
            address: z.string().trim().max(500).optional(),
            city: z.string().trim().max(200).optional(),
            country: z.string().trim().max(100).optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            postalCode: z.string().trim().max(20).optional(),
            canton: z.string().trim().max(100).optional(),
          }).optional(),
          description:      z.string().trim().max(5000).optional().transform(v => v ? stripHtmlTags(v) : v),
          faultDeclaration: z.enum(['A','B','shared','unknown']).optional(),
          witnesses:        z.string().trim().max(2000).optional().transform(v => v ? stripHtmlTags(v) : v),
          policeReport:     z.boolean().optional(),
          policeRef:        z.string().trim().max(200).optional(),
          injuries:         z.boolean().optional(),
          sketchImage:      z.string().max(10_000_000).optional(),
          vehicleAPos:      z.object({
            x: z.number().optional(),
            y: z.number().optional(),
            rotation: z.number().optional(),
            direction: z.string().trim().max(50).optional(),
          }).optional(),
          vehicleCount:     z.number().optional(),
          partyBStatus:     z.object({
            status: z.string().trim().max(100).optional(),
            reason: z.string().trim().max(1000).optional(),
            description: z.string().trim().max(2000).optional(),
            type: z.string().trim().max(100).optional(),
          }).optional(),
          photos:           z.array(z.object({
            id:       z.string().trim().max(100),
            category: z.enum(['scene','vehicleA','vehicleB','vehicleC','vehicleD','vehicleE','injury','document','other']),
            base64:   z.string().max(7_000_000),
            mediaType: z.enum(['image/jpeg','image/png']).optional(),
            caption:  z.string().trim().max(500).optional(),
            takenAt:  z.string().trim().max(50),
          })).max(20).optional(),
        }),
      }))
      .output(sessionUpdateAccidentOutput)
      .mutation(async ({ input }) => {
        // Verify participant token — REQUIRED (either party can update accident)
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        // Validate photos — uniquement JPEG/PNG (seuls formats que le PDF
        // sait intégrer). WebP/GIF rejetés explicitement à l'upload pour
        // éviter tout échec silencieux à la génération du PDF. Le client
        // produit toujours du JPEG (canvas.toDataURL('image/jpeg')).
        if (input.data.photos) {
          for (const photo of input.data.photos) {
            let mt = (photo as any).mediaType as string | undefined;
            if (!mt) {
              const buf = Buffer.from(String(photo.base64).slice(0, 16), 'base64');
              if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) mt = 'image/jpeg';
              else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) mt = 'image/png';
              else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) mt = 'image/webp';
              else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) mt = 'image/gif';
              else mt = 'image/jpeg'; // défaut prudent si non détecté
            }
            if (mt !== 'image/jpeg' && mt !== 'image/png') {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Format photo non supporté (JPEG ou PNG uniquement)' });
            }
            const validation = validateBase64Image(photo.base64, mt);
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
        participantToken: z.string().trim().max(500),
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

        logAudit({ event: 'session.signed', sessionId: input.sessionId, detail: { role: input.role, bothSigned } });

        if (bothSigned) {
          io.to(`session:${input.sessionId}`).emit('constat-complete', { sessionId: input.sessionId });

          // ── Auto PDF + email ─────────────────────────────
          setImmediate(async () => {
            try {
              const fullSession = await getSession(input.sessionId);
              if (!fullSession) return;

              // Dedup: if pdfUrl already set, PDF was already sent (by webhook auto-PDF)
              if (fullSession.pdfUrl) {
                logger.info('Sign auto-PDF: PDF already sent (dedup), skipping', { sessionId: input.sessionId });
                return;
              }

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

              // Mark PDF as sent BEFORE emailing to prevent duplicates
              const marker = `pdf-sent-${Date.now()}`;
              await savePdfUrl(input.sessionId, marker);

              // Générer PDF pour A
              const pdfBytesA = await generateConstatPDF(fullSession, 'A');
              const pdfB64A = Buffer.from(pdfBytesA).toString('base64');
              const filename = `constat-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;

              // Blockchain timestamp (non-blocking — never prevents PDF delivery)
              try {
                const proof = await timestampPDF(Buffer.from(pdfBytesA));
                if (proof.sha256) {
                  await db.update(sessionsTable)
                    .set({ timestampProof: proof as any })
                    .where(eq(sessionsTable.id, input.sessionId));
                  logger.info('[OTS] Timestamp proof stored for session', { sessionId: input.sessionId, sha256: proof.sha256.slice(0, 16) + '...' });
                }
              } catch (tsErr) {
                logger.warn('[OTS] Timestamping failed (non-blocking)', { sessionId: input.sessionId, error: String(tsErr) });
              }

              // Envoyer à conducteur A
              if (emailA) {
                const nameA = [A?.driver?.firstName, A?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur A';
                try {
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
                } catch (e) {
                  logger.error('[DELIVERY] Échec envoi PDF A — resend manuel requis', { sessionId: input.sessionId, role: 'A', email: maskEmail(emailA), error: String(e) });
                }
              }

              // Envoyer à conducteur B (si email disponible et pas piéton)
              const bVehicleType = B?.vehicle?.vehicleType;
              const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
              const bIsPedestrian = NON_SIGNING.includes(bVehicleType as string) || (B as any)?.isPedestrian;

              if (emailB && !bIsPedestrian) {
                const pdfBytesB = await generateConstatPDF(fullSession, 'B');
                const pdfB64B = Buffer.from(pdfBytesB).toString('base64');
                const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur B';
                try {
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
                } catch (e) {
                  logger.error('[DELIVERY] Échec envoi PDF B — resend manuel requis', { sessionId: input.sessionId, role: 'B', email: maskEmail(emailB), error: String(e) });
                }
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

              // Voie B — Envoi aux participants additionnels C/D/E (si email)
              for (const role of ['C', 'D', 'E'] as const) {
                const p = (fullSession as any)[`participant${role}`];
                const emailP = p?.driver?.email;
                if (!emailP) continue;
                try {
                  const pIsPedestrian = NON_SIGNING.includes(p?.vehicle?.vehicleType as string) || (p as any)?.isPedestrian;
                  const pdfBytesP = await generateConstatPDF(fullSession, role);
                  const pdfB64P = Buffer.from(pdfBytesP).toString('base64');
                  const nameP = [p?.driver?.firstName, p?.driver?.lastName].filter(Boolean).join(' ') || `Participant ${role}`;
                  await sendPDFToDriver({
                    driverEmail: emailP,
                    driverName: nameP,
                    role,
                    sessionId: input.sessionId,
                    pdfBase64: pdfB64P,
                    insurerName: pIsPedestrian ? undefined : p?.insurance?.company,
                    language: p?.language || 'fr',
                  });
                  logger.info(`PDF envoyé au participant ${role}: ${maskEmail(emailP)}`);
                } catch (e) {
                  // Un échec C/D/E ne bloque pas les autres destinataires
                  logger.error(`[DELIVERY] Échec envoi PDF ${role} — resend manuel requis`, { sessionId: input.sessionId, role, email: maskEmail(emailP), error: String(e) });
                }
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
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .output(sessionHistoryOutput)
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        return db.query.sessions.findMany({
          where: eq(sessionsTable.ownerEmail, ctx.authUser.email),
          orderBy: [desc(sessionsTable.createdAt)],
          limit,
          offset,
        });
      }),

    // Verify a PDF against its stored blockchain timestamp proof
    verifyProof: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().max(50),
        pdfBase64: z.string().min(100).max(20_000_000),
        participantToken: z.string().trim().max(500),
      }))
      .output(sessionVerifyProofOutput)
      .mutation(async ({ input }) => {
        // Verify participant token
        await verifyAnyParticipant(input.sessionId, input.participantToken);

        const [row] = await db.select()
          .from(sessionsTable)
          .where(eq(sessionsTable.id, input.sessionId))
          .limit(1);

        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        const timestampProof = (row as any).timestampProof as {
          sha256: string; otsProofBase64: string; calendarUrl: string; submittedAt: string;
        } | null;

        const pdfBuffer = Buffer.from(input.pdfBase64, 'base64');
        const storedSha256 = timestampProof?.sha256 ?? '';
        const valid = storedSha256 ? verifyHash(pdfBuffer, storedSha256) : false;

        // Compute the hash of the provided PDF for comparison
        const crypto = await import('crypto');
        const providedSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        return {
          valid,
          sha256Provided: providedSha256,
          sha256Stored: storedSha256,
          timestampProof: timestampProof ?? null,
        };
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
        sessionId: z.string().trim().max(50).optional(),
        participantToken: z.string().trim().max(500).optional(),
      }))
      .output(ocrScanOutput)
      .mutation(async ({ input }) => {
        // SECURITY: If session context provided, verify it — allows pre-session OCR (initial scan, plate OCR)
        if (input.sessionId && input.participantToken) {
          await verifyAnyParticipant(input.sessionId, input.participantToken);
        }

        // Validate image size and media type
        const validation = validateBase64Image(input.imageBase64, input.mediaType);
        if (!validation.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: validation.error || 'Invalid image file' });
        }

        const hint = input.documentType !== 'auto' || input.country
          ? { documentType: input.documentType, country: input.country }
          : undefined;
        return scanDocument(input.imageBase64, input.mediaType as any, hint);
      }),

    batchScan: publicProcedure
      .input(z.object({
        images: z.array(z.string().min(100).max(10_000_000)).min(1).max(4),
        sessionId: z.string().trim().max(50).optional(),
        participantToken: z.string().trim().max(500).optional(),
      }))
      .output(ocrBatchScanOutput)
      .mutation(async ({ input }) => {
        // SECURITY: If session context provided, verify it — allows pre-session OCR (driver A initial scan)
        if (input.sessionId && input.participantToken) {
          await verifyAnyParticipant(input.sessionId, input.participantToken);
        }

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
        sessionId: z.string().trim().max(50).optional(),
        participantToken: z.string().trim().max(500).optional(),
      }))
      .output(ocrScanPairOutput)
      .mutation((async ({ input }: any) => {
        // SECURITY: If session context provided, verify it — allows pre-session OCR
        if (input.sessionId && input.participantToken) {
          await verifyAnyParticipant(input.sessionId, input.participantToken);
        }

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
      }) as any),
  }),

  // ── PDF ────────────────────────────────
  pdf: router({
    generate: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().max(50),
        role: z.enum(['A', 'B', 'C', 'D', 'E']).default('A'),
        participantToken: z.string().trim().max(500),
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
          NON_SIGNING.includes(session.participantB?.vehicle?.vehicleType as string) ||
          NON_SIGNING.includes(session.participantB?.vehicle?.bodyStyle as string) ||
          (session.participantB as any)?.isPedestrian === true;
        const aHasSigned = !!session.participantA?.signature;

        const canGenerate =
          session.status === 'completed' ||
          (session.status === 'signing' && aHasSigned && (hasPartyBStatus || isSolo || bIsNonSigning));

        if (!canGenerate) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Both parties must sign before generating PDF' });

        const role = input.role; // Voie B : A-E supportés (PDF complet inclut tous les participants)
        const pdfBytes = await generateConstatPDF(session, role);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const filename = `constat-${session.id}-${role}-${new Date().toISOString().split('T')[0]}.pdf`;

        // Blockchain timestamp (non-blocking — graceful degradation)
        let timestamp: { sha256: string; otsProofBase64: string; calendarUrl: string; submittedAt: string } | undefined;
        try {
          const proof = await timestampPDF(Buffer.from(pdfBytes));
          if (proof.sha256) {
            timestamp = proof;
            // Store proof in DB if not already present
            await db.update(sessionsTable)
              .set({ timestampProof: proof as any })
              .where(eq(sessionsTable.id, input.sessionId));
          }
        } catch (tsErr) {
          logger.warn('[OTS] Timestamping failed in pdf.generate (non-blocking)', { error: String(tsErr) });
        }

        logAudit({ event: 'pdf.generated', sessionId: input.sessionId, detail: { role: input.role } });
        return { pdfBase64, filename, timestamp };
      }),
  }),

  // ── EMAIL ────────────────────────────────
  email: router({
    sendToDriver: publicProcedure
      .input(z.object({
        sessionId:        z.string().max(50),
        role:             z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().trim().max(500),
        driverEmail: z.string().trim().email().max(320),
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
        message: z.string().trim().min(5).max(2000).transform(stripHtmlTags),
        userEmail: z.string().trim().email().optional(),
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
        lang: z.string().trim().max(10).optional(),
        sessionId:   z.string().max(50),
        role:        z.enum(['A', 'B', 'C', 'D', 'E']),
        participantToken: z.string().trim().max(500),
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
        sessionId: z.string().trim().max(50),
        participantToken: z.string().trim().max(500),
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
        width:             z.number().max(4096).default(900),
        height:            z.number().max(4096).default(650),
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
        sessionId: z.string().trim().max(50),
        participantToken: z.string().trim().max(500),
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
        sessionId: z.string().trim().max(50).optional(),
        participantToken: z.string().trim().max(500).optional(),
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
        sessionId: z.string().trim().max(50),
        participantToken: z.string().trim().max(500),
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
  adminListConstats,
  adminResendPdf,
  adminB2BOutreach,

  // ── MARKETING ────────────────────────────────
  marketing: marketingRouter,
});

export type AppRouter = typeof appRouter;