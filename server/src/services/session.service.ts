import { randomBytes } from 'crypto';
const nanoid = (size = 12) => randomBytes(size).toString('base64url').slice(0, size);
import type { ConstatSession, ParticipantData, AccidentData } from '../../../shared/types';

// ─────────────────────────────────────────────────────────────
// In-memory store (replace with PostgreSQL in production)
// ─────────────────────────────────────────────────────────────
const sessions = new Map<string, ConstatSession>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─────────────────────────────────────────────────────────────
// Create a new session (called by driver A)
// ─────────────────────────────────────────────────────────────
export function createSession(): ConstatSession {
  const id = nanoid(12); // e.g. "V1StGXR8_Z5j"
  const now = new Date();
  const session: ConstatSession = {
    id,
    status: 'waiting',
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    accident: {},
    participantA: { role: 'A', vehicle: {}, driver: {}, insurance: {}, damagedZones: [], circumstances: [], language: 'fr' },
  };
  sessions.set(id, session);

  // Auto-expire
  setTimeout(() => {
    const s = sessions.get(id);
    if (s && s.status !== 'completed') {
      sessions.set(id, { ...s, status: 'expired' });
      setTimeout(() => sessions.delete(id), 30_000);
    }
  }, SESSION_TTL_MS);

  return session;
}

// ─────────────────────────────────────────────────────────────
// Get session
// ─────────────────────────────────────────────────────────────
export function getSession(id: string): ConstatSession | null {
  return sessions.get(id) ?? null;
}

// ─────────────────────────────────────────────────────────────
// Join session (called by driver B via QR scan)
// ─────────────────────────────────────────────────────────────
export function joinSession(id: string, lang: string = 'fr'): ConstatSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.status === 'expired' || session.status === 'completed') return null;

  const updated: ConstatSession = {
    ...session,
    status: 'active',
    participantB: {
      role: 'B',
      vehicle: {}, driver: {}, insurance: {},
      damagedZones: [], circumstances: [], language: lang,
    },
  };
  sessions.set(id, updated);
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Update participant data (A or B)
// ─────────────────────────────────────────────────────────────
export function updateParticipant(
  id: string,
  role: 'A' | 'B',
  data: Partial<ParticipantData>
): ConstatSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  const key = role === 'A' ? 'participantA' : 'participantB';
  const updated = {
    ...session,
    [key]: { ...(session[key] ?? {}), ...data },
  };
  sessions.set(id, updated);
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Update accident data
// ─────────────────────────────────────────────────────────────
export function updateAccident(
  id: string,
  data: Partial<AccidentData>
): ConstatSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  const updated = { ...session, accident: { ...session.accident, ...data } };
  sessions.set(id, updated);
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Mark participant as signed
// ─────────────────────────────────────────────────────────────
export function signSession(
  id: string,
  role: 'A' | 'B',
  signatureBase64: string
): { session: ConstatSession; bothSigned: boolean } | null {
  const session = sessions.get(id);
  if (!session) return null;

  const key = role === 'A' ? 'participantA' : 'participantB';
  const updated = {
    ...session,
    [key]: {
      ...(session[key] ?? {}),
      signature: signatureBase64,
      signedAt: new Date(),
    },
  };

  const bothSigned = !!(updated.participantA?.signature && updated.participantB?.signature);
  if (bothSigned) updated.status = 'completed';
  else updated.status = 'signing';

  sessions.set(id, updated);
  return { session: updated, bothSigned };
}

// ─────────────────────────────────────────────────────────────
// Generate QR URL
// ─────────────────────────────────────────────────────────────
export function getQRUrl(sessionId: string, baseUrl: string): string {
  return `${baseUrl}?session=${sessionId}`;
}
