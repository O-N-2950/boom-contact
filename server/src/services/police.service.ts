// server/src/services/police.service.ts
// Module Police B2B — authentification + dashboard + accès sessions

import { db } from '../db/index.js';
import { policeStations, policeUsers, sessions } from '../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'boom-jwt-secret';

// ── Helpers ─────────────────────────────────────────────────

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

  // Update last login
  await db.update(policeUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(policeUsers.id, user.id));

  // Get station info
  const [station] = await db
    .select()
    .from(policeStations)
    .where(eq(policeStations.id, user.stationId))
    .limit(1);

  const token = jwt.sign(
    { userId: user.id, stationId: user.stationId, role: 'police', canton: station?.canton },
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
      station: station ? { id: station.id, name: station.name, canton: station.canton } : null,
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
    };
  } catch {
    throw new Error('Token invalide ou expiré');
  }
}

// ── Dashboard — sessions récentes actives ────────────────────

export async function getPoliceDashboard(stationId: string) {
  // Sessions actives (non expirées) dans les dernières 24h
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

  return {
    activeSessions: activeSessions.map(s => ({
      id: s.id,
      status: s.status,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      vehicleCount: s.vehicleCount,
      location: (s.accident as any)?.location?.address || null,
      hasInjuries: (s.accident as any)?.location?.hasInjuries || false,
    })),
    stats: {
      total: activeSessions.length,
      withInjuries: activeSessions.filter(s => (s.accident as any)?.location?.hasInjuries).length,
      signed: activeSessions.filter(s => s.status === 'signed').length,
    }
  };
}

// ── Admin : créer station + agent (pour onboarding pilote) ───

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
