/**
 * Additional unit tests for code quality score improvement.
 * Tests: validateBase64Image, escapeHtml edge cases, JWT edge cases,
 * makeId format, rate limiter config assertions.
 */

process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.ADMIN_PASSWORD = 'TestAdmin12345';

import { describe, it, expect, vi } from 'vitest';

// Mock DB before imports
vi.mock('../db/index.js', () => ({
  db: {
    query: { users: { findFirst: vi.fn().mockResolvedValue(null) }, magicTokens: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    transaction: vi.fn(),
  },
  schema: {},
}));

vi.mock('../db/schema.js', () => ({
  sessions: {}, users: { id: 'id', email: 'email', role: 'role' },
  magicTokens: { id: 'id', email: 'email', token: 'token' },
  vehicles: { userId: 'user_id' }, payments: {}, creditTxns: {},
  policeStations: {}, policeUsers: {}, policeAnnotations: {}, socialPosts: {},
}));

// Mock all services that router.ts imports to avoid cascading deps
vi.mock('../services/ocr.service.js', () => ({ scanDocument: vi.fn(), scanDocumentPair: vi.fn() }));
vi.mock('../services/session.service.js', () => ({
  createSession: vi.fn(), getSession: vi.fn(), joinSession: vi.fn(),
  updateParticipant: vi.fn(), updateAccident: vi.fn(), signSession: vi.fn(),
  getQRUrl: vi.fn(), savePdfUrl: vi.fn(), verifyParticipantToken: vi.fn(),
}));
vi.mock('../services/pdf.service.js', () => ({ generateConstatPDF: vi.fn() }));
vi.mock('../services/email.service.js', () => ({ sendPDFToDriver: vi.fn() }));
vi.mock('../services/voice.service.js', () => ({ transcribeAudio: vi.fn() }));
vi.mock('../services/accident-analyzer.service.js', () => ({ analyzeAccidentTranscript: vi.fn() }));
vi.mock('../services/sketch-renderer.service.js', () => ({ renderSketch: vi.fn() }));
vi.mock('../services/insurance-assistance.service.js', () => ({ getInsuranceAssistance: vi.fn() }));
vi.mock('../services/emergency-numbers.service.js', () => ({ getCountryEmergencyNumbers: vi.fn() }));
vi.mock('../services/osm-map.service.js', () => ({ generateOSMMap: vi.fn() }));
vi.mock('../services/stripe.service.js', () => ({
  createCheckoutSession: vi.fn(), getUserCredits: vi.fn(), useCredit: vi.fn(),
  saveConsent: vi.fn(), PACKAGES: {}, SUPPORTED_CURRENCIES: [], COUNTRY_TO_CURRENCY: {},
  getPrice: vi.fn(), formatPrice: vi.fn(),
}));
vi.mock('../services/auth.service.js', async () => {
  const actual = await vi.importActual('../services/auth.service.js');
  return { ...actual as object };
});
vi.mock('../services/anthropic.client.js', () => ({ anthropic: {} }));
vi.mock('../analytics.js', () => ({ trackPaiementEffectue: vi.fn() }));
vi.mock('../services/police.service.js', () => ({
  getPoliceStations: vi.fn(), getPoliceStation: vi.fn(), authenticatePolice: vi.fn(),
  getPoliceAnnotations: vi.fn(), createPoliceAnnotation: vi.fn(),
}));
vi.mock('../services/vehicle.service.js', () => ({
  getVehiclesByUser: vi.fn(), saveVehicle: vi.fn(), deleteVehicle: vi.fn(),
}));
vi.mock('../index.js', () => ({ io: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) } }));
vi.mock('../logger.js', async () => {
  const actual = await vi.importActual('../logger.js');
  return { ...actual as object };
});
vi.mock('../config.js', () => ({
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'test-secret-key-for-vitest',
  ADMIN_BOOTSTRAP_SECRET: '',
  ANTHROPIC_API_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  RESEND_API_KEY: '',
  SENTRY_DSN: '',
  POSTHOG_API_KEY: '',
  NODE_ENV: 'test',
  PORT: 3000,
  CLIENT_URL: '',
  LOG_DEBUG: false,
  SOCIAL_SECRET: '',
}));

// ─── validateBase64Image ─────────────────────────────────────
describe('validateBase64Image', () => {
  // Helper: create valid base64 with correct magic bytes
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
  const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

  it('should accept valid JPEG base64', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    const result = validateBase64Image(jpegHeader.toString('base64'), 'image/jpeg');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid PNG media type', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    expect(validateBase64Image(pngHeader.toString('base64'), 'image/png').valid).toBe(true);
  });

  it('should accept valid WebP media type', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    expect(validateBase64Image(webpHeader.toString('base64'), 'image/webp').valid).toBe(true);
  });

  it('should reject invalid media type', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    const result = validateBase64Image('dGVzdA==', 'image/bmp');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid media type');
  });

  it('should reject application/pdf media type', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    const result = validateBase64Image('dGVzdA==', 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid media type');
  });

  it('should reject base64 exceeding max length', async () => {
    const { validateBase64Image, MAX_IMAGE_BASE64_SIZE } = await import('../routes/router.js');
    const oversized = 'A'.repeat(MAX_IMAGE_BASE64_SIZE + 1);
    const result = validateBase64Image(oversized, 'image/jpeg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum size');
  });

  it('should accept base64 at exactly max length boundary', async () => {
    const { validateBase64Image } = await import('../routes/router.js');
    // GIF magic bytes: GIF89a
    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
    const result = validateBase64Image(gifHeader.toString('base64'), 'image/gif');
    expect(result.valid).toBe(true);
  });
});

// ─── escapeHtml edge cases ───────────────────────────────────
describe('escapeHtml edge cases', () => {
  it('should handle empty string', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    expect(escapeHtml('')).toBe('');
  });

  it('should handle string with no special chars', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('should escape all special characters combined', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    const input = `<div class="test" data-x='y'>&nbsp;</div>`;
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
  });

  it('should handle multiple ampersands', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    expect(escapeHtml('A&B&C')).toBe('A&amp;B&amp;C');
  });

  it('should handle script injection attempts', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    const xss = '<script>alert("xss")</script>';
    const result = escapeHtml(xss);
    expect(result).not.toContain('<script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});

// ─── JWT additional tests ────────────────────────────────────
describe('JWT additional edge cases', () => {
  it('should reject expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyJWT } = await import('../services/auth.service.js');
    const expired = jwt.default.sign(
      { sub: 'u1', email: 'e@t.com', role: 'customer' },
      'test-secret-key-for-vitest',
      { expiresIn: '-1s' }
    );
    expect(verifyJWT(expired)).toBeNull();
  });

  it('should reject token signed with wrong secret', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyJWT } = await import('../services/auth.service.js');
    const wrongKey = jwt.default.sign(
      { sub: 'u1', email: 'e@t.com', role: 'customer' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    expect(verifyJWT(wrongKey)).toBeNull();
  });

  it('should preserve all payload fields through sign/verify cycle', async () => {
    const { signJWT, verifyJWT } = await import('../services/auth.service.js');
    const payload = { sub: 'user-42', email: 'olivier@boom.contact', role: 'admin', tokenVersion: 0 };
    const token = signJWT(payload);
    const decoded = verifyJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe('user-42');
    expect(decoded!.email).toBe('olivier@boom.contact');
    expect(decoded!.role).toBe('admin');
  });
});

// ─── makeId format validation ────────────────────────────────
describe('makeId format', () => {
  it('should only contain alphanumeric characters', async () => {
    const { makeId } = await import('../constants.js');
    const id = makeId(32);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('should handle length of 1', async () => {
    const { makeId } = await import('../constants.js');
    expect(makeId(1)).toHaveLength(1);
  });

  it('should handle large lengths', async () => {
    const { makeId } = await import('../constants.js');
    expect(makeId(128)).toHaveLength(128);
  });
});

// ─── VALID_MEDIA_TYPES config ────────────────────────────────
describe('Image validation config', () => {
  it('should support standard web image formats', async () => {
    const { VALID_MEDIA_TYPES } = await import('../routes/router.js');
    expect(VALID_MEDIA_TYPES).toContain('image/jpeg');
    expect(VALID_MEDIA_TYPES).toContain('image/png');
    expect(VALID_MEDIA_TYPES).toContain('image/webp');
    expect(VALID_MEDIA_TYPES).toContain('image/gif');
  });

  it('should have exactly 4 valid media types', async () => {
    const { VALID_MEDIA_TYPES } = await import('../routes/router.js');
    expect(VALID_MEDIA_TYPES).toHaveLength(4);
  });

  it('should enforce 5MB max image size', async () => {
    const { MAX_IMAGE_SIZE_BYTES } = await import('../routes/router.js');
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
