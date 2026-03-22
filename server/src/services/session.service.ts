import { logger } from '../logger.js';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import type { ConstatSession, ParticipantData, AccidentData } from '../../../shared/types';

const SESSION_TTL_HOURS = 24;

function makeId(size = 12): string {
  return randomBytes(size).toString('base64url').slice(0, size);
}

function rowToSession(row: typeof schema.sessions.$inferSelect): ConstatSession {
  return {
    id:           row.id,
    status:       row.status as ConstatSession['status'],
    createdAt:    row.createdAt,
    expiresAt:    row.expiresAt,
    accident:     (row.accident as any) ?? {},
    participantA: (row.participantA as any) ?? { role: 'A', vehicle: {}, driver: {}, insurance: {}, damagedZones: [], circumstances: [], language: 'fr' },
    participantB: (row.participantB as any) ?? undefined,
    participantC: (row as any).participantC ?? undefined,
    participantD: (row as any).participantD ?? undefined,
    participantE: (row as any).participantE ?? undefined,
    vehicleCount: (row as any).vehicleCount ?? 2,
    pdfUrl:       row.pdfUrl ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// CREATE — Driver A starts a constat
// ─────────────────────────────────────────────────────────────
export async function createSession(): Promise<ConstatSession> {
  const id = makeId(12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  const [row] = await db.insert(schema.sessions).values({
    id,
    status: 'waiting',
    createdAt: now,
    expiresAt,
    accident: {},
    participantA: {
      role: 'A', vehicle: {}, driver: {},
      insurance: {}, damagedZones: [], circumstances: [], language: 'fr',
    },
    participantB: null,
  }).returning();

  logger.session('created', id);
  return rowToSession(row);
}

// ─────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────
export async function getSession(id: string): Promise<ConstatSession | null> {
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);

  if (!row) return null;

  // Auto-expire check — only expire if not signed/completed
  if (new Date() > row.expiresAt && row.status !== 'completed' && row.status !== 'signing') {
    await db.update(schema.sessions)
      .set({ status: 'expired' })
      .where(eq(schema.sessions.id, id));
    return { ...rowToSession(row), status: 'expired' };
  }

  return rowToSession(row);
}

// ─────────────────────────────────────────────────────────────
// JOIN — Driver B scans QR
// ─────────────────────────────────────────────────────────────
export async function joinSession(id: string, lang = 'fr'): Promise<ConstatSession | null> {
  const session = await getSession(id);
  if (!session) return null;
  if (session.status === 'expired' || session.status === 'completed') return null;

  const [row] = await db.update(schema.sessions)
    .set({
      status: 'active',
      participantB: {
        role: 'B', vehicle: {}, driver: {},
        insurance: {}, damagedZones: [], circumstances: [], language: lang,
      },
    })
    .where(eq(schema.sessions.id, id))
    .returning();

  logger.session('joined', id, lang);
  return rowToSession(row);
}

// ─────────────────────────────────────────────────────────────
// UPDATE PARTICIPANT
// ─────────────────────────────────────────────────────────────
export async function updateParticipant(
  id: string,
  role: 'A' | 'B',
  data: Partial<ParticipantData>,
): Promise<ConstatSession | null> {
  const session = await getSession(id);
  if (!session) return null;

  const key = role === 'A' ? 'participantA' : 'participantB';
  const current = role === 'A' ? session.participantA : (session.participantB ?? {});
  const merged = { ...current, ...data };

  const [row] = await db.update(schema.sessions)
    .set({ [key]: merged })
    .where(eq(schema.sessions.id, id))
    .returning();

  return rowToSession(row);
}

// ─────────────────────────────────────────────────────────────
// UPDATE ACCIDENT
// ─────────────────────────────────────────────────────────────
export async function updateAccident(
  id: string,
  data: Partial<AccidentData>,
): Promise<ConstatSession | null> {
  const session = await getSession(id);
  if (!session) return null;

  const [row] = await db.update(schema.sessions)
    .set({ accident: { ...session.accident, ...data } })
    .where(eq(schema.sessions.id, id))
    .returning();

  return rowToSession(row);
}

// ─────────────────────────────────────────────────────────────
// SIGN
// ─────────────────────────────────────────────────────────────
export async function signSession(
  id: string,
  role: string,
  signatureBase64: string,
): Promise<{ session: ConstatSession; bothSigned: boolean } | null> {
  const session = await getSession(id);
  if (!session) return null;

  // Map role to DB column
  const keyMap: Record<string, string> = {
    A: 'participantA', B: 'participantB', C: 'participantC', D: 'participantD', E: 'participantE',
  };
  const key = keyMap[role];
  if (!key) return null;

  const current = (session as any)[role === 'A' ? 'participantA'
    : role === 'B' ? 'participantB'
    : role === 'C' ? 'participantC'
    : role === 'D' ? 'participantD'
    : 'participantE'] ?? {};

  const updated = { ...current, signature: signatureBase64, signedAt: new Date().toISOString() };

  // allSigned = every participant that exists (has a driver name) has now signed
  const participants = [
    role === 'A' ? updated : session.participantA,
    role === 'B' ? updated : session.participantB,
    (session as any).participantC && (role === 'C' ? updated : (session as any).participantC),
    (session as any).participantD && (role === 'D' ? updated : (session as any).participantD),
    (session as any).participantE && (role === 'E' ? updated : (session as any).participantE),
  ].filter(Boolean);

  const presentParticipants = participants.filter((p: any) => p?.driver?.firstName || p?.vehicle?.licensePlate || p?.vehicle?.plate || p?.name || p?.vehicle?.brand);
  const allSigned = presentParticipants.length >= 2 &&
    presentParticipants.every((p: any) => !!p?.signature);

  const newStatus = allSigned ? 'completed' : 'signing';

  const [row] = await db.update(schema.sessions)
    .set({ [key]: updated, status: newStatus } as any)
    .where(eq(schema.sessions.id, id))
    .returning();

  logger.session(allSigned ? 'completed' : `signed-${role}`, id, role);
  return { session: rowToSession(row), bothSigned: allSigned };
}

// ─────────────────────────────────────────────────────────────
// SAVE PDF URL
// ─────────────────────────────────────────────────────────────
export async function savePdfUrl(id: string, url: string): Promise<void> {
  await db.update(schema.sessions)
    .set({ pdfUrl: url })
    .where(eq(schema.sessions.id, id));
}

// ─────────────────────────────────────────────────────────────
// QR URL helper
// ─────────────────────────────────────────────────────────────
export function getQRUrl(sessionId: string, baseUrl: string): string {
  return `${baseUrl}?session=${sessionId}`;
}
