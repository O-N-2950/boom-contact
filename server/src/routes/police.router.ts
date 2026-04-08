import { z } from 'zod';
import { router, publicProcedure, policeProcedure, TRPCError } from './trpc.js';
import { loginPoliceUser, getPoliceDashboard, getOrCreateAnnotation, saveAnnotation as saveAnnotationSvc, getAnnotation } from '../services/police.service.js';
import { getSession } from '../services/session.service.js';
import { policeLoginOutput, policeDashboardOutput, policeJoinSessionOutput, policeGetFullSessionOutput, policeGetAnnotationOutput, policeSaveAnnotationOutput, policeGenerateReportOutput } from './output-schemas.js';

export const policeRouter = router({

  // Login agent — retourne JWT 8h
  login: publicProcedure
    .input(z.object({
      email:    z.string().email().max(320),
      password: z.string().min(6).max(200),
    }))
    .output(policeLoginOutput)
    .mutation(async ({ input }) => {
      const result = await loginPoliceUser(input.email, input.password);
      return result;
    }),

  // Dashboard — sessions actives (token requis)
  dashboard: policeProcedure
    .input(z.object({ token: z.string().max(2000) }))
    .output(policeDashboardOutput)
    .query(async ({ ctx }) => {
      const payload = ctx.policeUser;
      const data = await getPoliceDashboard(payload.stationId);
      return { ...data, agent: { stationId: payload.stationId, canton: payload.canton } };
    }),

  // Rejoindre une session via QR (lecture seule + annotation)
  joinSession: policeProcedure
    .input(z.object({
      token:     z.string().max(2000),
      sessionId: z.string().max(50),
    }))
    .output(policeJoinSessionOutput)
    .query(async ({ ctx, input }) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable ou expirée' });
      return {
        session,
        policeAgent: { stationId: payload.stationId, canton: payload.canton }
      };
    }),

  // Session complète avec audit trail
  getFullSession: policeProcedure
    .input(z.object({ token: z.string().max(2000), sessionId: z.string().max(50) }))
    .output(policeGetFullSessionOutput)
    .query(async ({ ctx, input }) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable ou expirée' });
      await getOrCreateAnnotation(input.sessionId, payload.userId, payload.stationId, payload.country || 'CH');
      return { session, policeAgent: payload };
    }),

  // Charger annotations existantes
  getAnnotation: policeProcedure
    .input(z.object({ token: z.string().max(2000), sessionId: z.string().max(50) }))
    .output(policeGetAnnotationOutput)
    .query(async ({ ctx, input }) => {
      const payload = ctx.policeUser;
      return getAnnotation(input.sessionId, payload.stationId);
    }),

  // Sauvegarder annotations agent
  saveAnnotation: policeProcedure
    .input(z.object({
      token:     z.string().max(2000),
      sessionId: z.string().max(50),
      data: z.object({
        reportNumber:  z.string().max(200).optional(),
        infractions:   z.array(z.object({ code: z.string().max(100), description: z.string().max(1000), party: z.enum(['A','B','both']) })).max(50),
        measures:      z.array(z.object({ type: z.string().max(200), description: z.string().max(1000), party: z.enum(['A','B','both']).optional() })).max(50),
        witnesses:     z.array(z.object({ name: z.string().max(200), address: z.string().max(500).optional(), phone: z.string().max(50).optional(), statement: z.string().max(5000).optional() })).max(20),
        observations:  z.string().max(10_000).optional(),
      }),
    }))
    .output(policeSaveAnnotationOutput)
    .mutation(async ({ ctx, input }) => {
      const payload = ctx.policeUser;
      const result = await saveAnnotationSvc(input.sessionId, payload.userId, payload.stationId, input.data);
      return { ok: true, id: result.id };
    }),

  // Générer PDF rapport d'intervention
  generateReport: policeProcedure
    .input(z.object({ token: z.string().max(2000), sessionId: z.string().max(50) }))
    .output(policeGenerateReportOutput)
    .mutation(async ({ ctx, input }) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable' });
      const annotation = await getAnnotation(input.sessionId, payload.stationId);
      const { db } = await import('../db/index.js');
      const { policeUsers, policeStations } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const [agentRow] = await db.select().from(policeUsers).where(eq(policeUsers.id, payload.userId)).limit(1);
      const [stationRow] = await db.select().from(policeStations).where(eq(policeStations.id, payload.stationId)).limit(1);
      const annotationData = annotation
        ? { reportNumber: annotation.reportNumber || undefined, infractions: annotation.infractions || [], measures: annotation.measures || [], witnesses: annotation.witnesses || [], observations: annotation.observations || undefined }
        : { infractions: [] as const, measures: [] as const, witnesses: [] as const };
      const { generatePoliceReport } = await import('../services/pdf.police.js');
      const pdfBytes = await generatePoliceReport(
        session, annotationData,
        { firstName: agentRow?.firstName || 'Agent', lastName: agentRow?.lastName || '', badgeNumber: agentRow?.badgeNumber || undefined, stationName: stationRow?.name || payload.stationId, canton: payload.canton },
        payload.country || 'CH'
      );
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
      const filename = `rapport-intervention-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;
      return { pdfBase64, filename };
    }),

});
