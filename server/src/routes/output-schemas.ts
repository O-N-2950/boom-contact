/**
 * Zod output schemas for critical tRPC endpoints.
 * Ensures API contract validation on responses.
 */
import { z } from 'zod';

// ── auth.me ──────────────────────────────────────────────────
export const authMeOutput = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  credits: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  company: z.string(),
  address: z.string(),
}).nullable();

// ── auth.login ───────────────────────────────────────────────
export const authLoginOutput = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    credits: z.number(),
  }),
});

// ── auth.register ─────────────────────────────────────────────
export const authRegisterOutput = z.object({
  ok: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    credits: z.number(),
  }),
});

// ── session.create ───────────────────────────────────────────
export const sessionCreateOutput = z.object({
  sessionId: z.string(),
  qrUrl: z.string(),
  status: z.string(),
  tokenA: z.string(),
});

// ── session.get — returns full session state ─────────────────
const participantSchema = z.object({
  role: z.string().optional(),
  vehicle: z.record(z.unknown()).optional(),
  driver: z.record(z.unknown()).optional(),
  insurance: z.record(z.unknown()).optional(),
  damagedZones: z.array(z.string()).optional(),
  circumstances: z.array(z.string()).optional(),
  signature: z.string().optional(),
  signedAt: z.unknown().optional(),
  language: z.string().optional(),
  isPedestrian: z.boolean().optional(),
  name: z.string().optional(),
}).passthrough().optional();

export const sessionGetOutput = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.unknown(),
  expiresAt: z.unknown(),
  accident: z.record(z.unknown()),
  participantA: z.record(z.unknown()),
  participantB: participantSchema,
  participantC: participantSchema,
  participantD: participantSchema,
  participantE: participantSchema,
  vehicleCount: z.number().optional(),
  pdfUrl: z.string().optional(),
}).passthrough();

// ── session.join ─────────────────────────────────────────────
export const sessionJoinOutput = sessionGetOutput;

// ── pdf.generate ─────────────────────────────────────────────
export const pdfGenerateOutput = z.object({
  pdfBase64: z.string(),
  filename: z.string(),
});

// ── payment.createCheckout ───────────────────────────────────
export const paymentCreateCheckoutOutput = z.object({
  url: z.string(),
  sessionId: z.string().optional(),
}).passthrough();

// ── police.login ─────────────────────────────────────────────
export const policeLoginOutput = z.object({
  token: z.string(),
  agent: z.object({
    userId: z.string(),
    stationId: z.string(),
    canton: z.string().optional(),
    name: z.string().optional(),
  }).passthrough(),
}).passthrough();

// ── police.dashboard ─────────────────────────────────────────
export const policeDashboardOutput = z.object({
  sessions: z.array(z.record(z.unknown())),
  agent: z.object({
    stationId: z.string(),
    canton: z.string().optional(),
  }).passthrough(),
}).passthrough();

// ── admin.stats — large analytics payload ────────────────────
export const adminStatsOutput = z.object({
  sessions: z.object({
    total: z.number(),
    completed: z.number(),
    active: z.number(),
    last24h: z.number(),
    last7d: z.number(),
    recent: z.array(z.record(z.unknown())),
  }),
  users: z.object({
    total: z.number(),
    last7d: z.number(),
    last30d: z.number(),
  }),
  revenue: z.object({
    totalCents: z.number(),
    last30dCents: z.number(),
    last7dCents: z.number(),
    totalCredits: z.number(),
    byPackage: z.array(z.record(z.unknown())),
    recent: z.array(z.record(z.unknown())),
  }),
  ai: z.object({
    estOcrScans: z.number(),
    estOcrCostEur: z.number(),
    costPerSession: z.number(),
  }),
  gifts: z.object({
    totalGiven: z.number(),
  }),
});
