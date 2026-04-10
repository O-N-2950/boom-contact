import { z } from 'zod';
import { router, publicProcedure, policeProcedure, TRPCError } from './trpc.js';
import { loginPoliceUser, getPoliceDashboard, getOrCreateAnnotation, saveAnnotation as saveAnnotationSvc, getAnnotation, getOrCreateIntervention, saveIntervention as saveInterventionSvc, getIntervention as getInterventionSvc, addPolicePhoto as addPolicePhotoSvc } from '../services/police.service.js';
import { getSession } from '../services/session.service.js';
import { policeLoginOutput, policeDashboardOutput, policeJoinSessionOutput, policeGetFullSessionOutput, policeGetAnnotationOutput, policeSaveAnnotationOutput, policeGenerateReportOutput, policeGetInterventionOutput, policeSaveInterventionOutput, policeAddPhotoOutput } from './output-schemas.js';

export const policeRouter = router({

  // Login agent — retourne JWT 8h
  login: publicProcedure
    .input(z.object({
      email: z.string().trim().email().max(320),
      password: z.string().trim().min(6).max(200),
    }))
    .output(policeLoginOutput)
    .mutation((async ({ input }: any) => {
      const result = await loginPoliceUser(input.email, input.password);
      return result;
    }) as any),

  // Dashboard — sessions actives (token requis)
  dashboard: policeProcedure
    .input(z.object({ token: z.string().trim().max(2000) }))
    .output(policeDashboardOutput)
    .query((async ({ ctx }: any) => {
      const payload = ctx.policeUser;
      const data = await getPoliceDashboard(payload.stationId);
      return { ...data, agent: { stationId: payload.stationId, canton: payload.canton } };
    }) as any),

  // Rejoindre une session via QR (lecture seule + annotation)
  joinSession: policeProcedure
    .input(z.object({
      token:     z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
    }))
    .output(policeJoinSessionOutput)
    .query((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable ou expirée' });
      return {
        session,
        policeAgent: { stationId: payload.stationId, canton: payload.canton }
      };
    }) as any),

  // Session complète avec audit trail
  getFullSession: policeProcedure
    .input(z.object({ token: z.string().trim().max(2000), sessionId: z.string().trim().max(50) }))
    .output(policeGetFullSessionOutput)
    .query((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable ou expirée' });
      await getOrCreateAnnotation(input.sessionId, payload.userId, payload.stationId, payload.country || 'CH');
      return { session, policeAgent: payload };
    }) as any),

  // Charger annotations existantes
  getAnnotation: policeProcedure
    .input(z.object({ token: z.string().trim().max(2000), sessionId: z.string().trim().max(50) }))
    .output(policeGetAnnotationOutput)
    .query((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      return getAnnotation(input.sessionId, payload.stationId);
    }) as any),

  // Sauvegarder annotations agent
  saveAnnotation: policeProcedure
    .input(z.object({
      token:     z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
      data: z.object({
        reportNumber:  z.string().trim().max(200).optional(),
        infractions:   z.array(z.object({ code: z.string().max(100), description: z.string().max(1000), party: z.enum(['A','B','both']) })).max(50),
        measures:      z.array(z.object({ type: z.string().max(200), description: z.string().max(1000), party: z.enum(['A','B','both']).optional() })).max(50),
        witnesses:     z.array(z.object({ name: z.string().max(200), address: z.string().max(500).optional(), phone: z.string().max(50).optional(), statement: z.string().max(5000).optional() })).max(20),
        observations:  z.string().max(10_000).optional(),
      }),
    }))
    .output(policeSaveAnnotationOutput)
    .mutation((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const result = await saveAnnotationSvc(input.sessionId, payload.userId, payload.stationId, input.data as any);
      return { ok: true, id: result.id };
    }) as any),

  // ── Intervention QR endpoints ──────────────────────────────

  // Rejoindre une intervention (crée le record si absent)
  joinIntervention: policeProcedure
    .input(z.object({
      token: z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
    }))
    .output(policeGetInterventionOutput)
    .mutation((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable' });
      const intervention = await getOrCreateIntervention(input.sessionId, payload.userId);
      return intervention;
    }) as any),

  // Sauvegarder les données d'intervention complètes
  saveIntervention: policeProcedure
    .input(z.object({
      token: z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
      data: z.object({
        infractions: z.array(z.object({
          code: z.string().max(100),
          description: z.string().max(1000),
          party: z.enum(['A', 'B', 'both']),
        })).max(50),
        driverStates: z.array(z.object({
          party: z.enum(['A', 'B']),
          apparentState: z.enum(['normal', 'shocked', 'minor_injury', 'serious_injury', 'under_influence']),
          alcoholTestDone: z.boolean(),
          alcoholResult: z.enum(['negative', 'positive']).optional(),
          alcoholRate: z.string().max(20).optional(),
          drugTestDone: z.boolean(),
          drugResult: z.enum(['negative', 'positive']).optional(),
          testRefused: z.boolean(),
        })).max(5),
        conditions: z.object({
          weather: z.string().max(50),
          visibility: z.string().max(50),
          roadState: z.string().max(50),
          signage: z.string().max(50),
          signageDetails: z.string().max(500).optional(),
          speedLimit: z.number().min(0).max(300).optional(),
        }).optional(),
        witnesses: z.array(z.object({
          name: z.string().max(200),
          firstName: z.string().max(200).optional(),
          phone: z.string().max(50).optional(),
          address: z.string().max(500).optional(),
          statement: z.string().max(5000).optional(),
        })).max(20),
        observations: z.string().max(10_000).optional(),
        responsibilityEstimate: z.enum(['A_responsible', 'B_responsible', 'shared', 'undetermined']).optional(),
        policePhotos: z.array(z.object({
          id: z.string().max(50),
          category: z.enum(['overview', 'tracks', 'signage', 'other']),
          base64: z.string().max(7_000_000),
          caption: z.string().max(200).optional(),
          takenAt: z.string().max(50),
        })).max(20).optional(),
      }),
    }))
    .output(policeSaveInterventionOutput)
    .mutation((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const result = await saveInterventionSvc(input.sessionId, payload.userId, input.data);
      return { ok: true, id: result.id };
    }) as any),

  // Récupérer une intervention existante
  getIntervention: policeProcedure
    .input(z.object({
      token: z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
    }))
    .output(policeGetInterventionOutput)
    .query((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      return getInterventionSvc(input.sessionId, payload.userId);
    }) as any),

  // Ajouter une photo police
  addPolicePhoto: policeProcedure
    .input(z.object({
      token: z.string().trim().max(2000),
      sessionId: z.string().trim().max(50),
      photo: z.object({
        id: z.string().max(50),
        category: z.enum(['overview', 'tracks', 'signage', 'other']),
        base64: z.string().max(7_000_000),
        caption: z.string().max(200).optional(),
        takenAt: z.string().max(50),
      }),
    }))
    .output(policeAddPhotoOutput)
    .mutation((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const result = await addPolicePhotoSvc(input.sessionId, payload.userId, input.photo);
      return { ok: true, photoCount: (result.policePhotos || []).length };
    }) as any),

  // Générer PDF rapport d'intervention (enhanced with intervention data)
  generateReport: policeProcedure
    .input(z.object({ token: z.string().trim().max(2000), sessionId: z.string().trim().max(50) }))
    .output(policeGenerateReportOutput)
    .mutation((async ({ ctx, input }: any) => {
      const payload = ctx.policeUser;
      const session = await getSession(input.sessionId);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session introuvable' });
      const annotation = await getAnnotation(input.sessionId, payload.stationId);
      const intervention = await getInterventionSvc(input.sessionId, payload.userId);
      const { db } = await import('../db/index.js');
      const { policeUsers, policeStations } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const [agentRow] = await db.select().from(policeUsers).where(eq(policeUsers.id, payload.userId)).limit(1);
      const [stationRow] = await db.select().from(policeStations).where(eq(policeStations.id, payload.stationId)).limit(1);
      const annotationData = annotation
        ? { reportNumber: annotation.reportNumber || undefined, infractions: (annotation.infractions || []) as any[], measures: (annotation.measures || []) as any[], witnesses: (annotation.witnesses || []) as any[], observations: annotation.observations || undefined }
        : { infractions: [] as any[], measures: [] as any[], witnesses: [] as any[] };
      const interventionData = intervention
        ? {
            infractions: intervention.infractions || [],
            driverStates: intervention.driverStates || [],
            conditions: intervention.conditions || undefined,
            witnesses: intervention.witnesses || [],
            observations: intervention.observations || undefined,
            responsibilityEstimate: intervention.responsibilityEstimate || undefined,
            policePhotos: intervention.policePhotos || [],
          }
        : undefined;
      const { generatePoliceReport } = await import('../services/pdf.police.js');
      const pdfBytes = await generatePoliceReport(
        session, annotationData,
        { firstName: agentRow?.firstName || 'Agent', lastName: agentRow?.lastName || '', badgeNumber: agentRow?.badgeNumber || undefined, stationName: stationRow?.name || payload.stationId, canton: payload.canton },
        payload.country || 'CH',
        interventionData
      );
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
      const filename = `rapport-intervention-${input.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;
      return { pdfBase64, filename };
    }) as any),

});
