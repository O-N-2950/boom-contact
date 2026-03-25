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
import { createCheckoutSession, getUserCredits, saveConsent, useCredit, PACKAGES, SUPPORTED_CURRENCIES, COUNTRY_TO_CURRENCY, getPrice, formatPrice } from '../services/stripe.service.js';
import { transcribeAudio } from '../services/voice.service.js';
import { analyzeAccidentTranscript } from '../services/accident-analyzer.service.js';
import { renderSketch } from '../services/sketch-renderer.service.js';
import { loginPoliceUser, verifyPoliceToken, getPoliceDashboard, getOrCreateAnnotation, saveAnnotation as saveAnnotationSvc, getAnnotation } from '../services/police.service.js';
import { registerUser, loginWithPassword, createMagicToken, verifyMagicToken, createGiftLink, claimGiftLink } from '../services/auth.service.js';
import { sendMagicLink, sendGiftCreditsLink } from '../services/email.service.js';
import { io } from '../index';
import { generateDailyPosts, getPendingPosts, approvePost, markPosted, archivePost } from '../services/social-generator.service.js';

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
        role: z.enum(['A', 'B', 'C', 'D', 'E']),
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
          vehicleAPos:      z.record(z.string(), z.any()).optional(), // position véhicule A sur la carte
          vehicleCount:     z.number().optional(),   // 1=solo, 2=standard, 3-5=multi
          partyBStatus:     z.record(z.string(), z.any()).optional(), // fuite/blessé/refus/décédé
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

        // Si vehicleCount fourni, mettre à jour la colonne DB dédiée
        if (input.data.vehicleCount !== undefined) {
          const { db, schema } = await import('../db/index.js');
          const { eq } = await import('drizzle-orm');
          await db.update(schema.sessions)
            .set({ vehicleCount: input.data.vehicleCount } as any)
            .where(eq(schema.sessions.id, input.sessionId));
        }

        io.to(`session:${input.sessionId}`).emit('accident-updated', input.data);
        return { ok: true };
      }),

    // Sign constat
    sign: publicProcedure
      .input(z.object({
        sessionId:       z.string(),
        role:            z.enum(['A', 'B', 'C', 'D', 'E']),
        signatureBase64: z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const result = await signSession(input.sessionId, input.role, input.signatureBase64);
        if (!result) throw new Error('Session not found');

        const { session, bothSigned } = result;
        io.to(`session:${input.sessionId}`).emit('signed', { role: input.role, bothSigned });

        if (bothSigned) {
          io.to(`session:${input.sessionId}`).emit('constat-complete', { sessionId: input.sessionId });

          // ── Génération PDF + envoi email automatique ─────────────
          setImmediate(async () => {
            try {
              const { logger: log } = await import('../logger.js');
              const { db } = await import('../db/index.js');
              const { sessions: sessionsTable } = await import('../db/schema.js');
              const { eq } = await import('drizzle-orm');
              const { generateConstatPDF } = await import('../services/pdf.service.js');
              const { sendPDFToDriver } = await import('../services/email.service.js');
              const { savePdfUrl } = await import('../services/session.service.js');

              const { getSession } = await import('../services/session.service.js');
              const fullSession = await getSession(input.sessionId);
              if (!fullSession) return;

              const A = fullSession.participantA as any;
              const B = fullSession.participantB as any;
              const emailA = A?.driver?.email;
              const emailB = B?.driver?.email;

              // Stocker ownerEmail en DB (= email du conducteur A)
              if (emailA) {
                await db.update(sessionsTable)
                  .set({ ownerEmail: emailA } as any)
                  .where(eq(sessionsTable.id, input.sessionId));
              }

              // Générer PDF pour A
              const pdfBytesA = await generateConstatPDF(fullSession, 'A');
              const pdfB64A = Buffer.from(pdfBytesA).toString('base64');
              const filename = `constat-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;

              // Sauvegarder l'URL en DB (base64 stocké temporairement)
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
                log.info(`PDF envoyé à conducteur A: ${emailA}`);
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
                log.info(`PDF envoyé à conducteur B: ${emailB}`);
              }

              // Piéton avec email → envoyer PDF version A aussi
              if (emailB && bIsPedestrian) {
                const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Piéton';
                await sendPDFToDriver({
                  driverEmail: emailB,
                  driverName: nameB,
                  role: 'A', // version A du PDF pour le piéton
                  sessionId: input.sessionId,
                  pdfBase64: pdfB64A,
                  language: B?.language || 'fr',
                });
                log.info(`PDF envoyé au piéton: ${emailB}`);
              }

            } catch (err) {
              // Ne jamais bloquer la réponse — l'envoi email est best-effort
              log.error('Auto PDF/email failed', { sessionId: input.sessionId, err: String(err) });
            }
          });
        }
        return { ok: true, bothSigned, status: session.status };
      }),

    // GET session.history — sessions where owner_email = logged-in user
    history: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.authUser) return [];
        const { db } = await import('../db/index.js');
        const { sessions } = await import('../db/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        return db.query.sessions.findMany({
          where: eq(sessions.ownerEmail, ctx.authUser.email),
          orderBy: [desc(sessions.createdAt)],
          limit: 50,
        });
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

    // Scan multi-documents — analyse N photos en parallèle, retourne N résultats
    batchScan: publicProcedure
      .input(z.object({
        images: z.array(z.string().min(100)).min(1).max(4),
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
      .input(z.object({
        sessionId: z.string(),
        role: z.enum(['A', 'B', 'C', 'D', 'E']).default('A'),
      }))
      .mutation(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session not found');

        // Conditions pour générer le PDF :
        // 1. Session completed (deux signatures) — cas normal
        // 2. Session signing + partyBStatus (déclaration unilatérale)
        // 3. Session signing + piéton/vélo côté B (pas de signature adverse requise)
        // 4. Accident solo (vehicleCount=1 dans la colonne DB session, pas dans accident)
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

        if (!canGenerate) throw new Error('Both parties must sign before generating PDF');

        const role = (input.role === 'A' || input.role === 'B') ? input.role : 'A';
        const pdfBytes = await generateConstatPDF(session, role);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const filename = `constat-${session.id}-${role}-${new Date().toISOString().split('T')[0]}.pdf`;
        return { pdfBase64, filename };
      }),
  }),
  // ── EMAIL ─────────────────────────────────────────────────
  email: router({
    // Send PDF to driver's own email — they forward to their insurer
    sendToDriver: publicProcedure
      .input(z.object({
        sessionId:   z.string(),
        role:        z.enum(['A', 'B', 'C', 'D', 'E']),
        driverEmail: z.string().email(),
        pdfBase64:   z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session not found');

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
        packageId:        z.enum(['single', 'pack3', 'pack10']),
        userEmail:        z.string().email(),
        currency:         z.enum(['CHF','EUR','GBP','AUD','USD','CAD','SGD','JPY']).default('EUR'),
        locale:           z.string().default('fr'),
        countryCode:      z.string().optional(),
        constatSessionId: z.string().optional(), // pour retour direct après paiement one-shot
      }))
      .mutation(async ({ input }) => {
        return createCheckoutSession(
          input.packageId,
          input.userEmail,
          input.currency,
          input.locale,
          input.constatSessionId,
        );
      }),

    // GET payment.currencies — return full pricing grid
    currencies: publicProcedure
      .query(() => {
        const grid: Record<string, any> = {};
        for (const pkgId of ['single','pack3','pack10'] as const) {
          grid[pkgId] = {};
          for (const cur of SUPPORTED_CURRENCIES) {
            grid[pkgId][cur] = {
              amountCents: getPrice(pkgId, cur),
              formatted: formatPrice(getPrice(pkgId, cur), cur),
            };
          }
        }
        return { packages: grid, currencies: SUPPORTED_CURRENCIES, countryMap: COUNTRY_TO_CURRENCY };
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


  // ── POLICE B2B — authentification institutionnelle ───────────
  police: router({

    // Login agent — retourne JWT 8h
    login: publicProcedure
      .input(z.object({
        email:    z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const result = await loginPoliceUser(input.email, input.password);
        return result;
      }),

    // Dashboard — sessions actives (token requis)
    dashboard: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        const data = await getPoliceDashboard(payload.stationId);
        return { ...data, agent: { stationId: payload.stationId, canton: payload.canton } };
      }),

    // Rejoindre une session via QR (lecture seule + annotation)
    joinSession: publicProcedure
      .input(z.object({
        token:     z.string(),
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session introuvable ou expirée');
        return {
          session,
          policeAgent: { stationId: payload.stationId, canton: payload.canton }
        };
      }),

    // Session complète avec audit trail
    getFullSession: publicProcedure
      .input(z.object({ token: z.string(), sessionId: z.string() }))
      .query(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session introuvable ou expirée');
        await getOrCreateAnnotation(input.sessionId, payload.userId, payload.stationId, (payload as any).country || 'CH');
        return { session, policeAgent: payload };
      }),

    // Charger annotations existantes
    getAnnotation: publicProcedure
      .input(z.object({ token: z.string(), sessionId: z.string() }))
      .query(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        return getAnnotation(input.sessionId, payload.stationId);
      }),

    // Sauvegarder annotations agent
    saveAnnotation: publicProcedure
      .input(z.object({
        token:     z.string(),
        sessionId: z.string(),
        data: z.object({
          reportNumber:  z.string().optional(),
          infractions:   z.array(z.object({ code: z.string(), description: z.string(), party: z.enum(['A','B','both']) })),
          measures:      z.array(z.object({ type: z.string(), description: z.string(), party: z.enum(['A','B','both']).optional() })),
          witnesses:     z.array(z.object({ name: z.string(), address: z.string().optional(), phone: z.string().optional(), statement: z.string().optional() })),
          observations:  z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        const result = await saveAnnotationSvc(input.sessionId, payload.userId, payload.stationId, input.data as any);
        return { ok: true, id: result.id };
      }),

    // Générer PDF rapport d'intervention
    generateReport: publicProcedure
      .input(z.object({ token: z.string(), sessionId: z.string() }))
      .mutation(async ({ input }) => {
        const payload = verifyPoliceToken(input.token);
        const session = await getSession(input.sessionId);
        if (!session) throw new Error('Session introuvable');
        const annotation = await getAnnotation(input.sessionId, payload.stationId);
        const { db } = await import('../db/index.js');
        const { policeUsers, policeStations } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const [agentRow] = await db.select().from(policeUsers).where(eq(policeUsers.id, payload.userId)).limit(1);
        const [stationRow] = await db.select().from(policeStations).where(eq(policeStations.id, payload.stationId)).limit(1);
        const annotationData = annotation
          ? { reportNumber: annotation.reportNumber || undefined, infractions: (annotation.infractions as any) || [], measures: (annotation.measures as any) || [], witnesses: (annotation.witnesses as any) || [], observations: annotation.observations || undefined }
          : { infractions: [], measures: [], witnesses: [] };
        const { generatePoliceReport } = await import('../services/pdf.police.js');
        const pdfBytes = await generatePoliceReport(
          session as any, annotationData,
          { firstName: agentRow?.firstName || 'Agent', lastName: agentRow?.lastName || '', badgeNumber: agentRow?.badgeNumber || undefined, stationName: stationRow?.name || payload.stationId, canton: payload.canton },
          (payload as any).country || 'CH'
        );
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const filename = `rapport-intervention-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;
        return { pdfBase64, filename };
      }),

  }),


  // ── VOICE — Transcription Whisper ─────────────────────────
  voice: router({

    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(100),
        mimeType:    z.string().default('audio/webm'),
        lang:        z.string().optional(), // hint langue pour Whisper
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

    // Analyse IA du témoignage → scénario + questions
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

  // ── PARTENAIRE WIN WIN ────────────────────────────────────
  // Permet à WIN WIN de créer une session boom.contact avec le
  // véhicule du client pré-chargé (plaque, marque, assureur).
  // Aucun scan de permis ou carte verte requis côté client.
  winwin: router({

    // POST winwin.createSession — crée une session avec véhicule pré-chargé
    // Header requis: x-winwin-key = WINWIN_PARTNER_KEY (variable Railway boom)
    createSession: publicProcedure
      .input(z.object({
        // Clé partenaire WIN WIN (validée côté serveur)
        partnerKey: z.string().min(10),
        // Données véhicule WIN WIN
        vehicle: z.object({
          plaque:        z.string().optional(),
          marque:        z.string().optional(),
          modele:        z.string().optional(),
          couleur:       z.string().optional(),
          annee:         z.number().optional(),
          numeroPolice:  z.string().optional(),
        }),
        // Données assurance WIN WIN
        insurance: z.object({
          compagnie:     z.string().optional(),
          numeroPolice:  z.string().optional(),
          agence:        z.string().optional(),
          agenceTel:     z.string().optional(),
          agenceEmail:   z.string().optional(),
        }).optional(),
        // Données conducteur (optionnel)
        driver: z.object({
          nom:     z.string().optional(),
          prenom:  z.string().optional(),
          adresse: z.string().optional(),
          npa:     z.string().optional(),
          localite:z.string().optional(),
          tel:     z.string().optional(),
        }).optional(),
        // Langue préférée
        language: z.string().default('fr'),
      }))
      .mutation(async ({ input }) => {
        // Valider la clé partenaire
        const validKey = process.env.WINWIN_PARTNER_KEY;
        if (!validKey || input.partnerKey !== validKey) {
          throw new Error('Clé partenaire invalide');
        }

        // Créer la session boom.contact
        const session = await createSession();

        // Pré-charger les données du véhicule WIN WIN (conducteur A)
        const vehicleData: Record<string, any> = {};
        if (input.vehicle.plaque)       vehicleData.licensePlate = input.vehicle.plaque;
        if (input.vehicle.marque)       vehicleData.make = input.vehicle.marque;
        if (input.vehicle.modele)       vehicleData.model = input.vehicle.modele;
        if (input.vehicle.couleur)      vehicleData.color = input.vehicle.couleur;
        if (input.vehicle.annee)        vehicleData.year = String(input.vehicle.annee);
        if (input.vehicle.numeroPolice) vehicleData.policyNumber = input.vehicle.numeroPolice;

        const insuranceData: Record<string, any> = {};
        if (input.insurance?.compagnie)    insuranceData.companyName = input.insurance.compagnie;
        if (input.insurance?.numeroPolice) insuranceData.policyNumber = input.insurance.numeroPolice;
        if (input.insurance?.agence)       insuranceData.agencyName = input.insurance.agence;
        if (input.insurance?.agenceTel)    insuranceData.agencyPhone = input.insurance.agenceTel;
        if (input.insurance?.agenceEmail)  insuranceData.agencyEmail = input.insurance.agenceEmail;
        // WIN WIN est toujours le courtier
        insuranceData.brokerName  = 'WIN WIN Finance Group';
        insuranceData.brokerPhone = '+41 32 466 11 00';
        insuranceData.brokerEmail = 'sinistre@winwin.swiss';

        const driverData: Record<string, any> = {};
        if (input.driver?.nom)      driverData.lastName = input.driver.nom;
        if (input.driver?.prenom)   driverData.firstName = input.driver.prenom;
        if (input.driver?.adresse)  driverData.address = input.driver.adresse;
        if (input.driver?.npa)      driverData.zipCode = input.driver.npa;
        if (input.driver?.localite) driverData.city = input.driver.localite;
        if (input.driver?.tel)      driverData.phone = input.driver.tel;

        // Pré-charger la session avec les données WIN WIN
        await updateParticipant(session.id, 'A', {
          vehicle:   Object.keys(vehicleData).length > 0 ? vehicleData : undefined,
          insurance: Object.keys(insuranceData).length > 0 ? insuranceData : undefined,
          driver:    Object.keys(driverData).length > 0 ? driverData : undefined,
          language:  input.language,
        });

        const qrUrl = getQRUrl(session.id, CLIENT_URL);

        return {
          ok: true,
          sessionId: session.id,
          qrUrl,
          // URL directe pour que le client A accède sans scanner le QR
          directUrl: `${CLIENT_URL}/constat/${session.id}?lang=${input.language}&prefilled=true`,
          message: `Session créée. Véhicule ${input.vehicle.plaque || ''} pré-chargé.`,
        };
      }),

  }),


  // ── SKETCH RENDERER (Puppeteer Chrome) ───────────────────
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

  // ── AUTH ─────────────────────────────────────────────────────
  auth: router({

    // POST auth.register
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ input }) => {
        try {
          const result = await registerUser(input.email, input.password);
          return { ok: true, ...result };
        } catch (err: any) {
          if (err.message === 'EMAIL_EXISTS') throw new Error('Cet email est déjà utilisé.');
          throw err;
        }
      }),

    // POST auth.login
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        try { return await loginWithPassword(input.email, input.password); }
        catch { throw new Error('Email ou mot de passe incorrect.'); }
      }),

    // POST auth.magicLinkRequest
    magicLinkRequest: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const token = await createMagicToken(input.email);
        const magicUrl = `${CLIENT_URL}/?magic=${token}`;
        await sendMagicLink(input.email, magicUrl);
        return { ok: true };
      }),

    // POST auth.magicLinkVerify
    magicLinkVerify: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const result = await verifyMagicToken(input.token);
        if (!result) throw new Error('Lien invalide ou expiré.');
        return { ok: true, ...result };
      }),

    // GET auth.me
    me: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.authUser) return null;
        const { db } = await import('../db/index.js');
        const { users } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const user = await db.query.users.findFirst({ where: eq(users.id, ctx.authUser.sub) });
        if (!user) return null;
        return { id: user.id, email: user.email, role: user.role, credits: user.credits,
                 firstName: (user as any).firstName || '', lastName: (user as any).lastName || '',
                 phone: (user as any).phone || '', company: (user as any).company || '',
                 address: (user as any).address || '' };
      }),

    // POST auth.updateProfile — modifier prénom, nom, tel, société, adresse
    updateProfile: publicProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName:  z.string().optional(),
        phone:     z.string().optional(),
        company:   z.string().optional(),
        address:   z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.authUser) throw new Error('Connexion requise.');
        const { db } = await import('../db/index.js');
        const { users } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const updates: Record<string, any> = {};
        if (input.firstName !== undefined) updates.firstName = input.firstName;
        if (input.lastName  !== undefined) updates.lastName  = input.lastName;
        if (input.phone     !== undefined) updates.phone     = input.phone;
        if (input.company   !== undefined) updates.company   = input.company;
        if (input.address   !== undefined) updates.address   = input.address;
        await db.update(users).set(updates).where(eq(users.id, ctx.authUser.sub));
        return { ok: true };
      }),

    // POST auth.updateEmail — changer son adresse email
    updateEmail: publicProcedure
      .input(z.object({
        newEmail:    z.string().email(),
        currentPassword: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.authUser) throw new Error('Connexion requise.');
        const { db } = await import('../db/index.js');
        const { users } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const { verifyPassword } = await import('../services/auth.service.js');
        const user = await db.query.users.findFirst({ where: eq(users.id, ctx.authUser.sub) });
        if (!user) throw new Error('Utilisateur introuvable.');
        // Vérifier le mot de passe actuel
        const valid = user.passwordHash && await verifyPassword(input.currentPassword, user.passwordHash);
        if (!valid) throw new Error('Mot de passe incorrect.');
        // Vérifier que le nouvel email n'est pas déjà utilisé
        const existing = await db.query.users.findFirst({ where: eq(users.email, input.newEmail) });
        if (existing) throw new Error('Cet email est déjà utilisé.');
        await db.update(users).set({ email: input.newEmail }).where(eq(users.id, ctx.authUser.sub));
        return { ok: true };
      }),

    // POST auth.deleteAccount — suppression définitive compte + données
    deleteAccount: publicProcedure
      .input(z.object({}))
      .mutation(async ({ ctx }) => {
        if (!ctx.authUser) throw new Error('Connexion requise.');
        const { db } = await import('../db/index.js');
        const { users, vehicles, magicTokens } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const userId = ctx.authUser.sub;
        const userEmail = ctx.authUser.email;

        // Bloquer suppression du compte admin
        if (ctx.authUser.role === 'admin') throw new Error('Impossible de supprimer un compte admin.');

        // Supprimer dans l'ordre : tokens → véhicules → user
        await db.delete(magicTokens).where(eq(magicTokens.email, userEmail));
        await db.delete(vehicles).where(eq(vehicles.userId, userId));
        await db.delete(users).where(eq(users.id, userId));

        logger.info('Compte supprimé', { userId, email: userEmail });
        return { ok: true };
      }),

    // POST auth.grantCredits — admin only
    grantCredits: publicProcedure
      .input(z.object({
        credits: z.number().min(1).max(999999),
        recipientEmail: z.string().email().optional(),
        sendEmail: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
        const token = await createGiftLink(input.credits, ctx.authUser.email);
        const giftUrl = `${CLIENT_URL}/?gift=${token}`;
        if (input.sendEmail && input.recipientEmail) {
          await sendGiftCreditsLink(input.recipientEmail, giftUrl, input.credits);
        }
        const waText = encodeURIComponent(`🎁 ${input.credits} crédit${input.credits > 1 ? 's' : ''} offert${input.credits > 1 ? 's' : ''} sur boom.contact ! Clique ici pour les réclamer : ${giftUrl}`);
        return { ok: true, giftUrl, waUrl: `https://wa.me/?text=${waText}` };
      }),

  
  // POST auth.adminBootstrap — set admin password (protected by ADMIN_BOOTSTRAP_SECRET env)
  // One-time use route to set the admin password hash
  // Call: POST /trpc/auth.adminBootstrap with { secret, password }
  // Remove ADMIN_BOOTSTRAP_SECRET env var after use
  adminBootstrap: publicProcedure
    .input(z.object({ secret: z.string(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
      if (!expected || input.secret !== expected) throw new Error('Invalid secret.');
      const { hashPassword } = await import('../services/auth.service.js');
      const { db } = await import('../db/index.js');
      const { users } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const hash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash: hash, role: 'admin', credits: 999999 }).where(eq(users.email, 'contact@boom.contact'));
      return { ok: true };
    }),

  // POST auth.claimGift
    claimGift: publicProcedure
      .input(z.object({ token: z.string(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const result = await claimGiftLink(input.token, input.email);
        return { ok: true, ...result };
      }),

  }),

  // ── VEHICLES — garage personnel ──────────────────────────────
  vehicle: router({

    // GET vehicle.list
    list: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.authUser) return [];
        const { listVehicles } = await import('../services/vehicle.service.js');
        return listVehicles(ctx.authUser.sub);
      }),

    // POST vehicle.save — create or update
    save: publicProcedure
      .input(z.object({
        id:           z.string().optional(),
        nickname:     z.string().optional(),
        plate:        z.string().optional(),
        make:         z.string().optional(),
        model:        z.string().optional(),
        color:        z.string().optional(),
        year:         z.string().optional(),
        category:     z.string().optional(),
        licenseData:  z.record(z.any()).optional(),
        insuranceData:z.record(z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.authUser) throw new Error('Connexion requise.');
        const { saveVehicle } = await import('../services/vehicle.service.js');
        return saveVehicle(ctx.authUser.sub, input);
      }),

    // POST vehicle.delete
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.authUser) throw new Error('Connexion requise.');
        const { deleteVehicle } = await import('../services/vehicle.service.js');
        return deleteVehicle(ctx.authUser.sub, input.id);
      }),

  }),


  // ── ADMIN ─────────────────────────────────────────────────────
  admin: router({

    // GET admin.stats — full dashboard data, admin only
    stats: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');

        const { db } = await import('../db/index.js');
        const { sessions, users, payments, creditTxns } = await import('../db/schema.js');
        const { desc, gte, eq, count, sum, sql } = await import('drizzle-orm');

        const now = new Date();
        const since24h = new Date(now.getTime() - 24 * 3600 * 1000);
        const since7d  = new Date(now.getTime() - 7  * 24 * 3600 * 1000);
        const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

        // Sessions stats
        const [totalSessions]     = await db.select({ c: count() }).from(sessions);
        const [completedSessions] = await db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'completed'));
        const [activeSessions]    = await db.select({ c: count() }).from(sessions).where(eq(sessions.status, 'active'));
        const [sessions24h]       = await db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since24h));
        const [sessions7d]        = await db.select({ c: count() }).from(sessions).where(gte(sessions.createdAt, since7d));

        // Recent sessions (last 30)
        const recentSessions = await db.query.sessions.findMany({
          orderBy: [desc(sessions.createdAt)],
          limit: 30,
          columns: { id: true, status: true, createdAt: true, ownerEmail: true, accident: true, participantA: true },
        });

        // Users stats
        const [totalUsers]  = await db.select({ c: count() }).from(users);
        const [users7d]     = await db.select({ c: count() }).from(users).where(gte(users.createdAt, since7d));
        const [users30d]    = await db.select({ c: count() }).from(users).where(gte(users.createdAt, since30d));

        // Revenue stats
        const [totalRevenue]   = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid'));
        const [revenue30d]     = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since30d));
        const [revenue7d]      = await db.select({ s: sum(payments.amountCents) }).from(payments).where(eq(payments.status, 'paid')).where(gte(payments.paidAt, since7d));
        const [totalCredits]   = await db.select({ s: sum(payments.creditsGranted) }).from(payments).where(eq(payments.status, 'paid'));

        // Revenue by package
        const revenueByPack = await db.select({
          packageId: payments.packageId,
          count: count(),
          revenue: sum(payments.amountCents),
          credits: sum(payments.creditsGranted),
        }).from(payments).where(eq(payments.status, 'paid')).groupBy(payments.packageId);

        // Recent payments (last 20)
        const recentPayments = await db.query.payments.findMany({
          orderBy: [desc(payments.createdAt)],
          limit: 20,
          columns: { id: true, userEmail: true, packageId: true, packageLabel: true, amountCents: true, currency: true, status: true, paidAt: true, creditsGranted: true },
        });

        // IA costs estimate: OCR scans ≈ 0.003€/scan (Claude Sonnet Vision)
        // Each completed session uses ~2 OCR scans avg
        const ocrCostPerScan = 0.003;
        const estOcrScans    = (completedSessions.c || 0) * 2;
        const estOcrCost     = estOcrScans * ocrCostPerScan;

        // Credit transactions (gifts sent)
        const [giftsTotal] = await db.select({ s: sum(creditTxns.delta) }).from(creditTxns).where(eq(creditTxns.reason, 'gift'));

        return {
          sessions: {
            total:     totalSessions.c || 0,
            completed: completedSessions.c || 0,
            active:    activeSessions.c || 0,
            last24h:   sessions24h.c || 0,
            last7d:    sessions7d.c || 0,
            recent:    recentSessions,
          },
          users: {
            total:  totalUsers.c || 0,
            last7d: users7d.c || 0,
            last30d:users30d.c || 0,
          },
          revenue: {
            totalCents:  Number(totalRevenue.s  || 0),
            last30dCents:Number(revenue30d.s     || 0),
            last7dCents: Number(revenue7d.s      || 0),
            totalCredits:Number(totalCredits.s   || 0),
            byPackage:   revenueByPack,
            recent:      recentPayments,
          },
          ai: {
            estOcrScans,
            estOcrCostEur: Math.round(estOcrCost * 100) / 100,
            costPerSession: ocrCostPerScan * 2,
          },
          gifts: {
            totalGiven: Number(giftsTotal.s || 0),
          },
        };
      }),

    // GET admin.users — paginated user list
    users: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
        const { db } = await import('../db/index.js');
        const { users } = await import('../db/schema.js');
        const { desc } = await import('drizzle-orm');
        return db.query.users.findMany({
          orderBy: [desc(users.createdAt)],
          limit: input.limit,
          columns: { id: true, email: true, role: true, credits: true, createdAt: true, lastSeenAt: true, country: true },
        });
      }),

  }),


  // ── EMERGENCY INSURANCE LOOKUP ───────────────────────────────
  emergency: router({

    // POST emergency.insuranceLookup — DB first, AI fallback
    // Looks up 24h assistance number for any insurer worldwide
    insuranceLookup: publicProcedure
      .input(z.object({
        insurerA: z.string().optional(),  // From participant A OCR
        insurerB: z.string().optional(),  // From participant B OCR
        countryCode: z.string().optional(), // ISO 2-letter country code
      }))
      .mutation(async ({ input }) => {
        const { getInsuranceAssistance } = await import('../services/insurance-assistance.service.js');

        const [resultA, resultB] = await Promise.all([
          input.insurerA ? getInsuranceAssistance(input.insurerA, input.countryCode) : Promise.resolve(null),
          input.insurerB ? getInsuranceAssistance(input.insurerB, input.countryCode) : Promise.resolve(null),
        ]);

        return { participantA: resultA, participantB: resultB };
      }),


    // GET emergency.countryLookup — DB first, AI fallback for any country
    countryLookup: publicProcedure
      .input(z.object({
        countryCode: z.string().min(2).max(3),
        countryName: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { getCountryEmergencyNumbers } = await import('../services/emergency-numbers.service.js');
        return getCountryEmergencyNumbers(input.countryCode, input.countryName);
      }),

    // GET emergency.singleLookup — for AccountPage / manual use
    singleLookup: publicProcedure
      .input(z.object({
        insurer: z.string().min(2),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getInsuranceAssistance } = await import('../services/insurance-assistance.service.js');
        return getInsuranceAssistance(input.insurer, input.country);
      }),

  }),



  // ── ADMIN MAINTENANCE ──────────────────────────────────────────
  // POST admin.deleteUser — supprimer un compte utilisateur par email (admin only)
  adminDeleteUser: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
      const { db } = await import('../db/index.js');
      const { users, vehicles, magicTokens } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');

      // Ne pas supprimer le compte admin
      if (input.email === 'contact@boom.contact') throw new Error('Impossible de supprimer le compte admin principal.');

      const emailLower = input.email.toLowerCase();
      const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
      if (!user) throw new Error('Utilisateur introuvable: ' + input.email);

      await db.delete(magicTokens).where(eq(magicTokens.email, emailLower));
      await db.delete(vehicles).where(eq(vehicles.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));

      console.log('[ADMIN] Compte supprimé:', input.email);
      return { ok: true, deleted: input.email };
    }),

  // GET admin.listUsers — lister tous les utilisateurs
  // POST admin.setCredits — créditer directement un compte (admin only)
  adminSetCredits: publicProcedure
    .input(z.object({
      email: z.string().email(),
      credits: z.number().min(0).max(999999),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
      const { db } = await import('../db/index.js');
      const { users } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const emailLower = input.email.toLowerCase();
      const user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
      if (!user) throw new Error('Utilisateur introuvable: ' + input.email);
      await db.update(users).set({ credits: input.credits }).where(eq(users.id, user.id));
      return { ok: true, email: emailLower, credits: input.credits };
    }),

  adminListUsers: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
      const { db } = await import('../db/index.js');
      const { users } = await import('../db/schema.js');
      const all = await db.select({
        id: users.id,
        email: users.email,
        role: users.role,
        credits: users.credits,
        createdAt: users.createdAt,
      }).from(users);
      return all;
    }),

  adminCleanupSessions: publicProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
      const { db } = await import('../db/index.js');
      const { sessions } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const signing = await db.query.sessions.findMany({ where: eq(sessions.status, 'signing') });
      let fixed = 0;
      const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
      for (const s of signing) {
        const A = (s.participantA as any) ?? {};
        const B = (s.participantB as any);
        const acc = (s.accident as any) ?? {};
        const sigA = !!A?.signature;
        if (!sigA) continue;
        const bHasRealData = B && (B?.driver?.firstName || B?.vehicle?.licensePlate);
        const bIsNonSigning = B && (NON_SIGNING.includes(B?.vehicle?.vehicleType) || B?.isPedestrian);
        const hasPartyBStatus = !!acc.partyBStatus;
        const isSolo = (s.vehicleCount ?? 2) === 1;
        if (isSolo || hasPartyBStatus || bIsNonSigning || !bHasRealData) {
          await db.update(sessions).set({ status: 'completed' } as any).where(eq(sessions.id, s.id));
          fixed++;
        }
      }
      return { fixed, total: signing.length };
    }),

  adminFixOwnerEmails: publicProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.authUser || ctx.authUser.role !== 'admin') throw new Error('Admin requis.');
      const { db } = await import('../db/index.js');
      const { sessions } = await import('../db/schema.js');
      const { eq, isNull, and } = await import('drizzle-orm');
      const missing = await db.query.sessions.findMany({
        where: and(eq(sessions.status, 'completed'), isNull(sessions.ownerEmail)),
      });
      let fixed = 0;
      for (const s of missing) {
        const email = (s.participantA as any)?.driver?.email;
        if (email) {
          await db.update(sessions).set({ ownerEmail: email } as any).where(eq(sessions.id, s.id));
          fixed++;
        }
      }
      return { fixed, total: missing.length };
    }),


  // ── MARKETING ───────────────────────────────────────────────
  marketing: router({

    posts: publicProcedure
      .input(z.object({ platform: z.string().optional(), status: z.string().optional() }))
      .query(async ({ ctx, input }: { ctx: Context; input: any }) => {
        if (!ctx.user || ctx.user.role !== 'admin') throw new Error('UNAUTHORIZED');
        const { db } = await import('../db/index.js');
        const { socialPosts: sp } = await import('../db/schema.js');
        const { eq, and } = await import('drizzle-orm');
        const conds: any[] = [];
        if (input.platform) conds.push(eq(sp.platform, input.platform));
        if (input.status)   conds.push(eq(sp.status, input.status));
        const posts = await (conds.length > 0
          ? (db as any).select().from(sp).where(and(...conds)).orderBy(sp.createdAt)
          : (db as any).select().from(sp).orderBy(sp.createdAt));
        return { posts: posts.map((p: any) => ({ ...p, hashtags: JSON.parse(p.hashtags || '[]') })) };
      }),

    generate: publicProcedure
      .input(z.object({ count: z.number().min(1).max(8).default(4) }))
      .mutation(async ({ ctx }: { ctx: Context }) => {
        if (!ctx.user || ctx.user.role !== 'admin') throw new Error('UNAUTHORIZED');
        const generated = await generateDailyPosts(4);
        return { generated };
      }),

    approve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
        if (!ctx.user || ctx.user.role !== 'admin') throw new Error('UNAUTHORIZED');
        await approvePost(input.id);
        return { ok: true };
      }),

    markPosted: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
        if (!ctx.user || ctx.user.role !== 'admin') throw new Error('UNAUTHORIZED');
        await markPosted(input.id);
        return { ok: true };
      }),

    archive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }: { ctx: Context; input: any }) => {
        if (!ctx.user || ctx.user.role !== 'admin') throw new Error('UNAUTHORIZED');
        await archivePost(input.id);
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;










