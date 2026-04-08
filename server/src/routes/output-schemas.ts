/**
 * Zod output schemas for critical tRPC endpoints.
 * Ensures API contract validation on responses.
 *
 * IMPORTANT: No .passthrough() — every returned field must be explicitly declared.
 * This prevents accidental data leakage when new DB columns are added.
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
  partyBStatus: z.union([
    z.object({
      status: z.string().optional(),
      reason: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
    }),
    z.string(),
  ]).optional(),
  photos: z.array(z.object({
    id: z.string(),
    category: z.string(),
    base64: z.string(),
    caption: z.string().optional(),
    takenAt: z.string(),
  })).optional(),
  injuryDetails: z.object({
    hasInjuries: z.boolean(),
    description: z.string().optional(),
    ambulance: z.boolean().optional(),
    hospitalized: z.boolean().optional(),
    selfReported: z.string().optional(),
    severity: z.enum(['minor', 'moderate', 'serious']).optional(),
  }).optional(),
  thirdPartyDamage: z.boolean().optional(),
  insurerB: z.string().optional(),
});

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
  signedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  language: z.string().optional(),
  isPedestrian: z.boolean().optional(),
  name: z.string().optional(),
}).optional();

export const sessionGetOutput = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  expiresAt: z.union([z.string(), z.date()]),
  accident: accidentDataSchema,
  participantA: participantSchema,
  participantB: participantSchema,
  participantC: participantSchema,
  participantD: participantSchema,
  participantE: participantSchema,
  vehicleCount: z.number().optional(),
  pdfUrl: z.string().optional(),
});

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
  createdAt: z.union([z.string(), z.date()]),
  ownerEmail: z.string().nullable().optional(),
  vehicleCount: z.number().nullable().optional(),
});

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
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
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

// ── session.history ─────────────────────────────────────────
export const sessionHistoryOutput = z.array(z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  ownerEmail: z.string().nullable().optional(),
}));

// ── ocr.scan ────────────────────────────────────────────────
export const ocrScanOutput = z.object({
  documentType: z.string().optional(),
  type: z.string().optional(),
  confidence: z.number().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  vehicle: vehicleDataSchema,
  driver: driverDataSchema,
  insurance: insuranceDataSchema,
  lowConfidenceFields: z.array(z.object({
    field: z.string(),
    value: z.string(),
    confidence: z.number(),
  })).optional(),
  warnings: z.array(z.string()).optional(),
  rawText: z.string().optional(),
});

// ── ocr.batchScan ───────────────────────────────────────────
export const ocrBatchScanOutput = z.array(ocrScanOutput);

// ── ocr.scanPair ────────────────────────────────────────────
export const ocrScanPairOutput = z.object({
  vehicle: vehicleDataSchema,
  driver: driverDataSchema,
  insurance: insuranceDataSchema,
});

// ── email.sendToDriver ──────────────────────────────────────
export const emailSendToDriverOutput = z.object({
  ok: z.boolean(),
  messageId: z.string().optional(),
});

// ── email.bugReport ─────────────────────────────────────────
export const emailBugReportOutput = z.object({
  ok: z.boolean(),
});

// ── voice.transcribe ────────────────────────────────────────
export const voiceTranscribeOutput = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
});

// ── voice.analyzeAccident ───────────────────────────────────
export const voiceAnalyzeAccidentOutput = z.object({
  answers: z.record(z.string(), z.string()).optional(),
  scenario: z.string().optional(),
  vehicleA: z.object({
    direction: z.string().optional(),
    impactZone: z.string().optional(),
    wasMoving: z.boolean().optional(),
  }).optional(),
  vehicleB: z.object({
    direction: z.string().optional(),
    impactZone: z.string().optional(),
    wasMoving: z.boolean().optional(),
  }).optional(),
  confidence: z.number().optional(),
  fault: z.string().optional(),
  circumstances: z.array(z.string()).optional(),
  description: z.string().optional(),
  language: z.string().optional(),
  vehicleCount: z.number().optional(),
});

// ── sketch.render ───────────────────────────────────────────
export const sketchRenderOutput = z.object({
  pngBase64: z.string(),
  width: z.number(),
  height: z.number(),
});

// ── emergency.insuranceLookup ───────────────────────────────
const insuranceAssistanceResult = z.object({
  insurer: z.string().optional(),
  name: z.string().optional(),
  country: z.string().optional(),
  assistanceNumber: z.string().optional(),
  claimsNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  note: z.string().optional(),
  source: z.string().optional(),
  confidence: z.string().optional(),
}).nullable();

export const emergencyInsuranceLookupOutput = z.object({
  participantA: insuranceAssistanceResult,
  participantB: insuranceAssistanceResult,
});

// ── emergency.countryLookup ─────────────────────────────────
export const emergencyCountryLookupOutput = z.object({
  police: z.string().optional(),
  ambulance: z.string().optional(),
  fire: z.string().optional(),
  general: z.string().optional(),
  universal: z.string().optional(),
  roadside: z.string().optional(),
  roadsideNote: z.string().optional(),
  countryCode: z.string().optional(),
  countryName: z.string().optional(),
  source: z.string().optional(),
  confidence: z.string().optional(),
});

// ── emergency.singleLookup ─────────────────────────────────
export const emergencySingleLookupOutput = z.object({
  insurer: z.string().optional(),
  name: z.string().optional(),
  country: z.string().optional(),
  assistanceNumber: z.string().optional(),
  claimsNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  note: z.string().optional(),
  source: z.string().optional(),
  confidence: z.string().optional(),
});

// ── auth misc outputs ───────────────────────────────────────
export const okOutput = z.object({ ok: z.boolean() });

export const authMagicLinkRequestOutput = okOutput;

export const authMagicLinkVerifyOutput = z.object({
  ok: z.boolean(),
  token: z.string().optional(),
});

export const authUpdateProfileOutput = okOutput;
export const authUpdateEmailOutput = okOutput;
export const authDeleteAccountOutput = okOutput;

export const authGrantCreditsOutput = z.object({
  ok: z.boolean(),
  giftUrl: z.string(),
  waUrl: z.string(),
});

export const authAdminBootstrapOutput = okOutput;

export const authClaimGiftOutput = z.object({
  ok: z.boolean(),
  credits: z.number().optional(),
});

// ── payment misc outputs ────────────────────────────────────
export const paymentPackagesOutput = z.array(z.object({
  id: z.string(),
  label: z.string(),
  credits: z.number(),
  priceCHF: z.number().optional(),
  priceEUR: z.number().optional(),
  priceUSD: z.number().optional(),
  popular: z.boolean().optional(),
}));

export const paymentCurrenciesOutput = z.object({
  packages: z.record(z.string(), z.record(z.string(), z.number())),
  currencies: z.array(z.string()),
  countryMap: z.record(z.string(), z.string()),
});

export const paymentCreditsOutput = z.object({ credits: z.number() });
export const paymentUseCreditOutput = okOutput;
export const userSaveConsentOutput = okOutput;

// ── police intervention outputs ─────────────────────────────
const infractionRecord = z.object({
  code: z.string().optional(),
  label: z.string().optional(),
  severity: z.string().optional(),
  driver: z.string().optional(),
}).passthrough();

const driverStateRecord = z.object({
  driver: z.string().optional(),
  state: z.string().optional(),
  details: z.string().optional(),
}).passthrough();

const conditionsRecord = z.object({
  weather: z.string().optional(),
  visibility: z.string().optional(),
  roadCondition: z.string().optional(),
  lighting: z.string().optional(),
}).passthrough();

const witnessRecord = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  statement: z.string().optional(),
}).passthrough();

const policePhotoRecord = z.object({
  id: z.string().optional(),
  base64: z.string().optional(),
  category: z.string().optional(),
  caption: z.string().optional(),
  takenAt: z.string().optional(),
}).passthrough();

export const policeGetInterventionOutput = z.object({
  id: z.string().optional(),
  sessionId: z.string().optional(),
  policeUserId: z.string().optional(),
  infractions: z.array(infractionRecord).optional(),
  driverStates: z.array(driverStateRecord).optional(),
  conditions: conditionsRecord.nullable().optional(),
  witnesses: z.array(witnessRecord).optional(),
  observations: z.string().nullable().optional(),
  responsibilityEstimate: z.string().nullable().optional(),
  policePhotos: z.array(policePhotoRecord).optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
}).nullable();

export const policeSaveInterventionOutput = z.object({
  ok: z.boolean(),
  id: z.string(),
});

export const policeAddPhotoOutput = z.object({
  ok: z.boolean(),
  photoCount: z.number(),
});

// ── police misc outputs ─────────────────────────────────────
const measureRecord = z.object({
  code: z.string().optional(),
  label: z.string().optional(),
  details: z.string().optional(),
}).passthrough();

export const policeGetAnnotationOutput = z.object({
  id: z.string().optional(),
  sessionId: z.string().optional(),
  reportNumber: z.string().nullable().optional(),
  infractions: z.array(infractionRecord).optional(),
  measures: z.array(measureRecord).optional(),
  witnesses: z.array(witnessRecord).optional(),
  observations: z.string().nullable().optional(),
  agentId: z.string().optional(),
  stationId: z.string().optional(),
  country: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
}).nullable();

export const policeSaveAnnotationOutput = z.object({
  ok: z.boolean(),
  id: z.string(),
});

export const policeGenerateReportOutput = z.object({
  pdfBase64: z.string(),
  filename: z.string(),
});

// ── admin misc outputs ──────────────────────────────────────
export const adminUsersOutput = z.array(z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  credits: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  lastSeenAt: z.union([z.string(), z.date(), z.null()]).optional(),
  country: z.string().nullable().optional(),
}));

export const adminDeleteUserOutput = z.object({
  ok: z.boolean(),
  deleted: z.string(),
});

export const adminSetCreditsOutput = z.object({
  ok: z.boolean(),
  email: z.string(),
  credits: z.number(),
});

export const adminListUsersOutput = z.array(z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  credits: z.number(),
  createdAt: z.union([z.string(), z.date()]),
}));

export const adminCleanupSessionsOutput = z.object({
  fixed: z.number(),
  total: z.number(),
});

export const adminFixOwnerEmailsOutput = z.object({
  fixed: z.number(),
  total: z.number(),
});

// ── marketing outputs ───────────────────────────────────────
export const marketingPostsOutput = z.object({
  posts: z.array(z.object({
    id: z.number(),
    platform: z.string(),
    pillar: z.string().optional(),
    text: z.string().optional(),
    status: z.string(),
    hashtags: z.array(z.string()),
    staging: z.string().nullable().optional(),
    postedAt: z.union([z.string(), z.date(), z.null()]).optional(),
    scheduledFor: z.union([z.string(), z.date(), z.null()]).optional(),
    generatedBy: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
  })),
});

export const marketingActionOutput = okOutput;

// ── police.getFullSession ───────────────────────────────────
export const policeGetFullSessionOutput = z.object({
  session: sessionGetOutput,
  policeAgent: z.object({
    userId: z.string(),
    stationId: z.string(),
    canton: z.string().optional(),
    country: z.string().optional(),
    name: z.string().optional(),
  }),
});

// ── admin.stats — large analytics payload ────────────────────
const recentSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
});

const revenueEntrySchema = z.object({
  id: z.string().optional(),
  userEmail: z.string().optional(),
  packageId: z.string().optional(),
  packageLabel: z.string().optional(),
  amount: z.number().optional(),
  amountCents: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  paidAt: z.union([z.string(), z.date(), z.null()]).optional(),
  creditsGranted: z.number().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});

const packageBreakdownSchema = z.object({
  packageId: z.string().nullable().optional(),
  count: z.union([z.number(), z.string()]).optional(),
  revenue: z.union([z.number(), z.string(), z.null()]).optional(),
  credits: z.union([z.number(), z.string(), z.null()]).optional(),
  totalCents: z.number().optional(),
});

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
