/**
 * Zod output schemas for critical tRPC endpoints.
 * Ensures API contract validation on responses.
 */
import { z } from 'zod';

// ── Shared sub-schemas ──────────────────────────────────────
const vehicleDataSchema = z.object({
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
  plate: z.string().optional(),
  brand: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
  category: z.string().optional(),
  bodyStyle: z.string().optional(),
  type: z.string().optional(),
}).optional();

const driverDataSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  name: z.string().optional(),
}).optional();

const insuranceDataSchema = z.object({
  company: z.string().optional(),
  policyNumber: z.string().optional(),
  agentName: z.string().optional(),
  agentPhone: z.string().optional(),
  agentEmail: z.string().optional(),
  address: z.string().optional(),
  greenCardNumber: z.string().optional(),
  greenCardExpiry: z.string().optional(),
}).optional();

const accidentDataSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    postalCode: z.string().optional(),
    canton: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  faultDeclaration: z.string().optional(),
  witnesses: z.string().optional(),
  policeReport: z.boolean().optional(),
  policeRef: z.string().optional(),
  injuries: z.boolean().optional(),
  sketchImage: z.string().optional(),
  vehicleAPos: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    rotation: z.number().optional(),
    direction: z.string().optional(),
  }).optional(),
  vehicleCount: z.number().optional(),
  partyBStatus: z.object({
    status: z.string().optional(),
    reason: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
  }).optional(),
  photos: z.array(z.object({
    id: z.string(),
    category: z.string(),
    base64: z.string(),
    caption: z.string().optional(),
    takenAt: z.string(),
  })).optional(),
}).catchall(z.unknown());

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
  vehicle: vehicleDataSchema,
  driver: driverDataSchema,
  insurance: insuranceDataSchema,
  damagedZones: z.array(z.string()).optional(),
  circumstances: z.array(z.string()).optional(),
  signature: z.string().optional(),
  signedAt: z.unknown().optional(),
  language: z.string().optional(),
  isPedestrian: z.boolean().optional(),
  name: z.string().optional(),
}).catchall(z.unknown()).optional();

export const sessionGetOutput = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.unknown(),
  expiresAt: z.unknown(),
  accident: accidentDataSchema,
  participantA: participantSchema,
  participantB: participantSchema,
  participantC: participantSchema,
  participantD: participantSchema,
  participantE: participantSchema,
  vehicleCount: z.number().optional(),
  pdfUrl: z.string().optional(),
}).catchall(z.unknown());

// ── session.join ─────────────────────────────────────────────
export const sessionJoinOutput = sessionGetOutput;

// ── pdf.generate ─────────────────────────────────────────────
export const pdfGenerateOutput = z.object({
  pdfBase64: z.string(),
  filename: z.string(),
});

// ── session.sign ─────────────────────────────────────────────
export const sessionSignOutput = z.object({
  ok: z.boolean(),
  bothSigned: z.boolean(),
  status: z.string(),
});

// ── session.updateParticipant ────────────────────────────────
export const sessionUpdateParticipantOutput = z.object({
  ok: z.boolean(),
});

// ── session.updateAccident ───────────────────────────────────
export const sessionUpdateAccidentOutput = z.object({
  ok: z.boolean(),
});

// ── payment.createCheckout ───────────────────────────────────
export const paymentCreateCheckoutOutput = z.object({
  url: z.string(),
  sessionId: z.string().optional(),
});

// ── police.login ─────────────────────────────────────────────
export const policeLoginOutput = z.object({
  token: z.string(),
  agent: z.object({
    userId: z.string(),
    stationId: z.string(),
    canton: z.string().optional(),
    name: z.string().optional(),
  }),
});

// ── police.dashboard ─────────────────────────────────────────
const dashboardSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.unknown(),
  ownerEmail: z.string().nullable().optional(),
  vehicleCount: z.number().nullable().optional(),
}).catchall(z.unknown());

export const policeDashboardOutput = z.object({
  sessions: z.array(dashboardSessionSchema),
  agent: z.object({
    stationId: z.string(),
    canton: z.string().optional(),
  }),
});

// ── vehicle.list ─────────────────────────────────────────────
const vehicleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nickname: z.string().nullable().optional(),
  plate: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  licenseData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  insuranceData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});

export const vehicleListOutput = z.array(vehicleSchema);

// ── vehicle.save ─────────────────────────────────────────────
export const vehicleSaveOutput = vehicleSchema;

// ── vehicle.delete ───────────────────────────────────────────
export const vehicleDeleteOutput = z.object({
  ok: z.boolean(),
});

// ── police.joinSession ──────────────────────────────────────
export const policeJoinSessionOutput = z.object({
  session: sessionGetOutput,
  policeAgent: z.object({
    stationId: z.string(),
    canton: z.string().optional(),
  }),
});

// ── police.getFullSession ───────────────────────────────────
export const policeGetFullSessionOutput = z.object({
  session: sessionGetOutput,
  policeAgent: z.object({
    userId: z.string(),
    stationId: z.string(),
    canton: z.string().optional(),
    country: z.string().optional(),
    name: z.string().optional(),
  }).catchall(z.unknown()),
});

// ── admin.stats — large analytics payload ────────────────────
const recentSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.unknown(),
}).catchall(z.unknown());

const revenueEntrySchema = z.object({
  id: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  createdAt: z.unknown().optional(),
}).catchall(z.unknown());

const packageBreakdownSchema = z.object({
  packageId: z.string().optional(),
  count: z.number().optional(),
  totalCents: z.number().optional(),
}).catchall(z.unknown());

export const adminStatsOutput = z.object({
  sessions: z.object({
    total: z.number(),
    completed: z.number(),
    active: z.number(),
    last24h: z.number(),
    last7d: z.number(),
    recent: z.array(recentSessionSchema),
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
    byPackage: z.array(packageBreakdownSchema),
    recent: z.array(revenueEntrySchema),
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
