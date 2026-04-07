import { logger } from '../logger.js';
import crypto, { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import type { ConstatSession, ParticipantData, AccidentData } from '../../../shared/types';
import { makeId, NON_SIGNING_TYPES } from '../constants.js';

const SESSION_TTL_HOURS = 24 * 7; // 7 jours — permet de reprendre un constat après blessure

// Type for raw session row with all known columns
interface SessionRow {
  id: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  accident: Partial<AccidentData>;
  participantA: Partial<ParticipantData>;
  participantB: Partial<ParticipantData> | null;
  participantC?: Partial<ParticipantData> | null;
  participantD?: Partial<ParticipantData> | null;
  participantE?: Partial<ParticipantData> | null;
  vehicleCount: number;
  pdfUrl: string | null;
  ownerEmail: string | null;
  tokenA: string | null;
  tokenB: string | null;
}

function rowToSession(row: SessionRow): ConstatSession & { tokenA?: string; tokenB?: string } {
  return {
    id:           row.id,
    status:       row.status as ConstatSession['status'],
    createdAt:    row.createdAt,
    expiresAt:    row.expiresAt,
    accident:     row.accident ?? {},
    participantA: row.participantA ?? { role: 'A', vehicle: {}, driver: {}, insurance: {}, damagedZones: [], circumstances: [], language: 'fr' },
    participantB: row.participantB ?? undefined,
    participantC: row.participantC ?? undefined,
    participantD: row.participantD ?? undefined,
    participantE: row.participantE ?? undefined,
    vehicleCount: row.vehicleCount ?? 2,
    pdfUrl:       row.pdfUrl ?? undefined,
    tokenA:       row.tokenA ?? undefined,
    tokenB:       row.tokenB ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// CREATE — Driver A starts a constat
// ─────────────────────────────────────────────────────────────
export async function createSession(): Promise<ConstatSession & { tokenA: string; tokenB: string }> {
  const id = makeId(12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  // Generate participant tokens for secure access (QR flow — both drivers may be unauthenticated)
  const tokenA = randomBytes(32).toString('base64url');
  const tokenB = randomBytes(32).toString('base64url');

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
    tokenA,
    tokenB,
  } as any).returning();

  logger.session('created', id);
  return { ...rowToSession(row as SessionRow), tokenA, tokenB };
}

// Verify participant token for a session+role
export async function verifyParticipantToken(sessionId: string, token: string, role: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (!row) return false;
  const r = row as SessionRow;

  // Use timing-safe comparison to prevent timing attacks
  function safeCompare(a: string | null | undefined, b: string): boolean {
    if (!a) return false;
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  if (role === 'A' && safeCompare(r.tokenA, token)) return true;
  if (role === 'B' && safeCompare(r.tokenB, token)) return true;
  // Roles C/D/E can use tokenB (they're additional participants like B)
  if (['C', 'D', 'E'].includes(role) && safeCompare(r.tokenB, token)) return true;
  return false;
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
  // Sessions signing et completed ne s'expirent jamais automatiquement
  if (new Date() > row.expiresAt && row.status !== 'completed' && row.status !== 'signing' && row.status !== 'active') {
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
  // Wrap in transaction to prevent race conditions (concurrent updates from both drivers)
  return db.transaction(async (tx) => {
    const [currentRow] = await tx
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1);

    if (!currentRow) return null;

    const typedRow = currentRow as SessionRow;
    const key = role === 'A' ? 'participantA' : 'participantB';
    const current = role === 'A' ? typedRow.participantA ?? {} : typedRow.participantB ?? {};
    const merged = { ...current, ...data };

    const [row] = await tx.update(schema.sessions)
      .set({ [key]: merged })
      .where(eq(schema.sessions.id, id))
      .returning();

    return rowToSession(row as SessionRow);
  });
}

// ─────────────────────────────────────────────────────────────
// UPDATE ACCIDENT
// ─────────────────────────────────────────────────────────────
export async function updateAccident(
  id: string,
  data: Partial<AccidentData> & { vehicleCount?: number },
): Promise<ConstatSession | null> {
  // Wrap in transaction to prevent race conditions (concurrent updates from both drivers)
  return db.transaction(async (tx) => {
    const [currentRow] = await tx
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1);

    if (!currentRow) return null;

    const typedRow = currentRow as SessionRow;
    const currentSession = rowToSession(typedRow);

    // vehicleCount is a top-level column — must be updated separately from accident JSONB
    const { vehicleCount, ...accidentData } = data;
    const updatePayload: Record<string, unknown> = { accident: { ...currentSession.accident, ...accidentData } };
    if (vehicleCount !== undefined) {
      updatePayload.vehicleCount = vehicleCount;
    }

    const [row] = await tx.update(schema.sessions)
      .set(updatePayload)
      .where(eq(schema.sessions.id, id))
      .returning();

    return rowToSession(row as SessionRow);
  });
}

// ─────────────────────────────────────────────────────────────
// SIGN
// ─────────────────────────────────────────────────────────────
export async function signSession(
  id: string,
  role: string,
  signatureBase64: string,
): Promise<{ session: ConstatSession; bothSigned: boolean } | null> {
  // Wrap in transaction to prevent race condition when both drivers sign simultaneously
  return db.transaction(async (tx) => {
  const [sessionRow] = await tx
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);

  if (!sessionRow) return null;
  const typedRow = sessionRow as SessionRow;
  const session = rowToSession(typedRow);

  // Map role to DB column
  const keyMap: Record<string, string> = {
    A: 'participantA', B: 'participantB', C: 'participantC', D: 'participantD', E: 'participantE',
  };
  const key = keyMap[role];
  if (!key) return null;

  const current = role === 'A' ? typedRow.participantA
    : role === 'B' ? typedRow.participantB
    : role === 'C' ? typedRow.participantC
    : role === 'D' ? typedRow.participantD
    : typedRow.participantE;

  const updated = { ...current, signature: signatureBase64, signedAt: new Date().toISOString() };

  // ── Types ne nécessitant pas de signature ─────────────────
  const isPedestrianOrNonSigning = (p: Partial<ParticipantData> | null | undefined) =>
    NON_SIGNING_TYPES.includes(p?.vehicle?.bodyStyle) ||
    NON_SIGNING_TYPES.includes(p?.vehicle?.type) ||
    NON_SIGNING_TYPES.includes(p?.vehicle?.vehicleType) ||
    p?.isPedestrian === true;

  const participants = [
    role === 'A' ? updated : session.participantA,
    role === 'B' ? updated : session.participantB,
    typedRow.participantC && (role === 'C' ? updated : typedRow.participantC),
    typedRow.participantD && (role === 'D' ? updated : typedRow.participantD),
    typedRow.participantE && (role === 'E' ? updated : typedRow.participantE),
  ].filter(Boolean) as (Partial<ParticipantData> | null)[];

  const presentParticipants = participants.filter((p) =>
    p?.driver?.firstName || p?.vehicle?.licensePlate || p?.vehicle?.plate ||
    p?.name || p?.vehicle?.brand || isPedestrianOrNonSigning(p)
  );

  const signingParticipants = presentParticipants.filter((p) => !isPedestrianOrNonSigning(p));

  // vehicleCount est une colonne DB sur la session, pas dans l'objet accident
  const accidentData = typedRow.accident ?? {};
  const sessionVehicleCount = typedRow.vehicleCount ?? 2;
  const isSolo = sessionVehicleCount === 1;

  // Cas partyBStatus : partie adverse déclarée indisponible (fuite, blessé, refus…)
  const hasPartyBStatus = !!accidentData.partyBStatus;

  const allSigned =
    (
      // Cas normal : ≥2 parties présentes, tous les conducteurs ont signé
      (presentParticipants.length >= 2 &&
       signingParticipants.length >= 1 &&
       signingParticipants.every((p) => !!p?.signature))
    ) ||
    // Cas accident solo : 1 seul conducteur, a signé
    (isSolo && signingParticipants.length >= 1 && signingParticipants.every((p) => !!p?.signature)) ||
    // Cas partie B indisponible (fuite, blessé, refus, décédé…)
    (hasPartyBStatus && signingParticipants.some((p) => !!p?.signature)) ||
    // Cas piéton/vélo seul côté B : 1 conducteur + 1 non-signataire, conducteur a signé
    (presentParticipants.length >= 2 &&
     signingParticipants.length === 1 &&
     presentParticipants.some(isPedestrianOrNonSigning) &&
     signingParticipants.every((p) => !!p?.signature));

  const newStatus = allSigned ? 'completed' : 'signing';

  const [row] = await tx.update(schema.sessions)
    .set({ [key]: updated, status: newStatus } as any)
    .where(eq(schema.sessions.id, id))
    .returning();

  logger.session(allSigned ? 'completed' : `signed-${role}`, id, role);
  return { session: rowToSession(row as SessionRow), bothSigned: allSigned };
  }); // end transaction
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


