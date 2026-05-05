import { logger } from '../logger.js';
import crypto, { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import type { ConstatSession, ParticipantData, AccidentData } from '../../../shared/types';
import { makeId, NON_SIGNING_TYPES } from '../constants.js';

const SESSION_TTL_HOURS = 24 * 7; // 7 jours â permet de reprendre un constat aprÃ¨s blessure

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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// CREATE â Driver A starts a constat
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export async function createSession(): Promise<ConstatSession & { tokenA: string; tokenB: string }> {
  const id = makeId(12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  // Generate participant tokens for secure access (QR flow â both drivers may be unauthenticated)
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
export async function verifyParticipantToken(sessionId: string, token: string, role: string, prefetchedRow?: unknown): Promise<boolean> {
  let r: SessionRow;
  if (prefetchedRow) {
    r = prefetchedRow as SessionRow;
  } else {
    const [row] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1);
    if (!row) return false;
    r = row as SessionRow;
  }

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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// GET
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export async function getSession(id: string): Promise<ConstatSession | null> {
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);

  if (!row) return null;

  // Auto-expire check â only expire if not signed/completed
  // Sessions signing et completed ne s'expirent jamais automatiquement
  if (new Date() > row.expiresAt && row.status !== 'completed' && row.status !== 'signing' && row.status !== 'active') {
    await db.update(schema.sessions)
      .set({ status: 'expired' })
      .where(eq(schema.sessions.id, id));
    return { ...rowToSession(row), status: 'expired' };
  }

  return rowToSession(row);
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// JOIN â Driver B scans QR
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// UPDATE PARTICIPANT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// UPDATE ACCIDENT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

    // vehicleCount is a top-level column â must be updated separately from accident JSONB
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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SIGN
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Types ne nÃ©cessitant pas de signature âââââââââââââââââ
  const isPedestrianOrNonSigning = (p: Partial<ParticipantData> | null | undefined) =>
    NON_SIGNING_TYPES.includes(p?.vehicle?.bodyStyle as string) ||
    NON_SIGNING_TYPES.includes((p?.vehicle as any)?.type as string) ||
    NON_SIGNING_TYPES.includes(p?.vehicle?.vehicleType as string) ||
    (p as any)?.isPedestrian === true;

  const participants = [
    role === 'A' ? updated : session.participantA,
    role === 'B' ? updated : session.participantB,
    typedRow.participantC && (role === 'C' ? updated : typedRow.participantC),
    typedRow.participantD && (role === 'D' ? updated : typedRow.participantD),
    typedRow.participantE && (role === 'E' ? updated : typedRow.participantE),
  ].filter(Boolean) as (Partial<ParticipantData> | null)[];

  const presentParticipants = participants.filter((p) =>
    p?.driver?.firstName || p?.vehicle?.licensePlate || (p?.vehicle as any)?.plate ||
    (p as any)?.name || p?.vehicle?.brand || isPedestrianOrNonSigning(p)
  );

  const signingParticipants = presentParticipants.filter((p) => !isPedestrianOrNonSigning(p));

  // vehicleCount est une colonne DB sur la session, pas dans l'objet accident
  const accidentData = typedRow.accident ?? {};
  const sessionVehicleCount = typedRow.vehicleCount ?? 2;
  const isSolo = sessionVehicleCount === 1;

  // Cas partyBStatus : partie adverse dÃ©clarÃ©e indisponible (fuite, blessÃ©, refusâ¦)
  const hasPartyBStatus = !!accidentData.partyBStatus;

  const allSigned =
    (
      // Cas normal : â¥2 parties prÃ©sentes, tous les conducteurs ont signÃ©
      (presentParticipants.length >= 2 &&
       signingParticipants.length >= 1 &&
       signingParticipants.every((p) => !!p?.signature))
    ) ||
    // Cas accident solo : 1 seul conducteur, a signÃ©
    (isSolo && signingParticipants.length >= 1 && signingParticipants.every((p) => !!p?.signature)) ||
    // Cas partie B indisponible (fuite, blessÃ©, refus, dÃ©cÃ©dÃ©â¦)
    (hasPartyBStatus && signingParticipants.some((p) => !!p?.signature)) ||
    // Cas piÃ©ton/vÃ©lo seul cÃ´tÃ© B : 1 conducteur + 1 non-signataire, conducteur a signÃ©
    (presentParticipants.length >= 2 &&
     signingParticipants.length === 1 &&
     presentParticipants.some(isPedestrianOrNonSigning) &&
     signingParticipants.every((p) => !!p?.signature));

  const newStatus = allSigned ? 'completed' : 'signing';

  const [row] = await tx.update(schema.sessions)
    .set({ [key]: updated, status: newStatus })
    .where(eq(schema.sessions.id, id))
    .returning();

  logger.session(allSigned ? 'completed' : `signed-${role}`, id, role);
  return { session: rowToSession(row as SessionRow), bothSigned: allSigned };
  }); // end transaction
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SAVE PDF URL
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export async function savePdfUrl(id: string, url: string): Promise<void> {
  await db.update(schema.sessions)
    .set({ pdfUrl: url })
    .where(eq(schema.sessions.id, id));
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// QR URL helper
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export function getQRUrl(sessionId: string, tokenB: string, baseUrl: string): string {
  // baseUrl = CLIENT_URL (ex: https://www.boom.contact ou http://localhost:5173)
  // On ajoute /join pour la page de jonction du conducteur B
  const origin = baseUrl && baseUrl.startsWith('http')
    ? baseUrl.replace(/\/+$/, '')
    : 'https://www.boom.contact';
  return `${origin}/join?session=${sessionId}&tokenB=${encodeURIComponent(tokenB)}`;
}


