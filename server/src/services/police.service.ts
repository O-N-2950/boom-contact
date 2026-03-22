// server/src/services/police.service.ts
// Module Police B2B — authentification + dashboard + annotations

import { db } from '../db/index.js';
import { policeStations, policeUsers, policeAnnotations, sessions } from '../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'boom-jwt-secret';

// ── Helpers ──────────────────────────────────────────────────

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'boom-police-salt').digest('hex');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Auth ─────────────────────────────────────────────────────

export async function loginPoliceUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(policeUsers)
    .where(and(eq(policeUsers.email, email), eq(policeUsers.active, true)))
    .limit(1);

  if (!user) throw new Error('Identifiants incorrects');

  const hash = hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Identifiants incorrects');

  await db.update(policeUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(policeUsers.id, user.id));

  const [station] = await db
    .select()
    .from(policeStations)
    .where(eq(policeStations.id, user.stationId))
    .limit(1);

  const token = jwt.sign(
    {
      userId: user.id,
      stationId: user.stationId,
      role: 'police',
      canton: station?.canton,
      country: station?.country || 'CH',
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      badgeNumber: user.badgeNumber,
      role: user.role,
      station: station ? {
        id: station.id,
        name: station.name,
        canton: station.canton,
        country: station.country,
        city: station.city,
      } : null,
    }
  };
}

export function verifyPoliceToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      stationId: string;
      role: 'police';
      canton?: string;
      country?: string;
    };
  } catch {
    throw new Error('Token invalide ou expiré');
  }
}

// ── Dashboard ────────────────────────────────────────────────

export async function getPoliceDashboard(stationId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const activeSessions = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      vehicleCount: sessions.vehicleCount,
      accident: sessions.accident,
    })
    .from(sessions)
    .where(and(
      gte(sessions.createdAt, since),
      gte(sessions.expiresAt, new Date()),
    ))
    .orderBy(desc(sessions.createdAt))
    .limit(50);

  // Check which sessions have police annotations from this station
  const annotatedIds = new Set<string>();
  if (activeSessions.length > 0) {
    const annotations = await db
      .select({ sessionId: policeAnnotations.sessionId })
      .from(policeAnnotations)
      .where(eq(policeAnnotations.stationId, stationId));
    annotations.forEach(a => annotatedIds.add(a.sessionId));
  }

  return {
    activeSessions: activeSessions.map(s => ({
      id: s.id,
      status: s.status,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      vehicleCount: s.vehicleCount,
      location: (s.accident as any)?.location?.address || null,
      city: (s.accident as any)?.location?.city || null,
      hasInjuries: (s.accident as any)?.injuries || false,
      hasAnnotations: annotatedIds.has(s.id),
    })),
    stats: {
      total: activeSessions.length,
      withInjuries: activeSessions.filter(s => (s.accident as any)?.injuries).length,
      signed: activeSessions.filter(s => s.status === 'signed' || s.status === 'completed').length,
      annotated: annotatedIds.size,
    }
  };
}

// ── Annotations ──────────────────────────────────────────────

export interface Infraction {
  code: string;      // ex: "LCR 32" (Suisse), "L3121-1" (France)
  description: string;
  party: 'A' | 'B' | 'both';
}

export interface Measure {
  type: 'alcotest' | 'drug_test' | 'licence_seized' | 'vehicle_towed' | 'pv_issued' | 'warning' | 'other';
  description: string;
  party?: 'A' | 'B' | 'both';
}

export interface Witness {
  name: string;
  address?: string;
  phone?: string;
  statement?: string;
}

export interface AnnotationData {
  reportNumber?: string;
  infractions: Infraction[];
  measures: Measure[];
  witnesses: Witness[];
  observations?: string;
}

export async function getOrCreateAnnotation(
  sessionId: string,
  agentId: string,
  stationId: string,
  country: string = 'CH'
) {
  // Log consultation (audit trail RGPD)
  const [existing] = await db
    .select()
    .from(policeAnnotations)
    .where(and(
      eq(policeAnnotations.sessionId, sessionId),
      eq(policeAnnotations.stationId, stationId)
    ))
    .limit(1);

  if (existing) {
    // Update consulted_at for audit trail
    await db.update(policeAnnotations)
      .set({ consultedAt: new Date() })
      .where(eq(policeAnnotations.id, existing.id));
    return existing;
  }

  // Create new annotation record
  const id = generateId('pan');
  const [created] = await db.insert(policeAnnotations).values({
    id,
    sessionId,
    agentId,
    stationId,
    country,
    infractions: [],
    measures: [],
    witnesses: [],
    consultedAt: new Date(),
  }).returning();

  return created;
}

export async function saveAnnotation(
  sessionId: string,
  agentId: string,
  stationId: string,
  data: AnnotationData
) {
  const [existing] = await db
    .select()
    .from(policeAnnotations)
    .where(and(
      eq(policeAnnotations.sessionId, sessionId),
      eq(policeAnnotations.stationId, stationId)
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(policeAnnotations)
      .set({
        reportNumber: data.reportNumber,
        infractions: data.infractions as any,
        measures: data.measures as any,
        witnesses: data.witnesses as any,
        observations: data.observations,
        updatedAt: new Date(),
      })
      .where(eq(policeAnnotations.id, existing.id))
      .returning();
    return updated;
  }

  // Should not happen (getOrCreate called first), but safety net
  const id = generateId('pan');
  const [created] = await db.insert(policeAnnotations).values({
    id,
    sessionId,
    agentId,
    stationId,
    reportNumber: data.reportNumber,
    infractions: data.infractions as any,
    measures: data.measures as any,
    witnesses: data.witnesses as any,
    observations: data.observations,
    consultedAt: new Date(),
  }).returning();
  return created;
}

export async function getAnnotation(sessionId: string, stationId: string) {
  const [annotation] = await db
    .select()
    .from(policeAnnotations)
    .where(and(
      eq(policeAnnotations.sessionId, sessionId),
      eq(policeAnnotations.stationId, stationId)
    ))
    .limit(1);
  return annotation || null;
}

// ── Admin : créer station + agent ────────────────────────────

export async function createPoliceStation(data: {
  name: string;
  canton?: string;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
}) {
  const id = generateId('stn');
  const [station] = await db.insert(policeStations).values({
    id,
    ...data,
    country: data.country || 'CH',
  }).returning();
  return station;
}

export async function createPoliceUser(data: {
  stationId: string;
  email: string;
  firstName: string;
  lastName: string;
  badgeNumber?: string;
  password: string;
  role?: 'agent' | 'supervisor';
}) {
  const id = generateId('pcu');
  const [user] = await db.insert(policeUsers).values({
    id,
    stationId: data.stationId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    badgeNumber: data.badgeNumber,
    passwordHash: hashPassword(data.password),
    role: data.role || 'agent',
  }).returning();

  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}
