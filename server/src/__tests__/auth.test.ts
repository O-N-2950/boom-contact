process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.ADMIN_PASSWORD = 'TestAdmin12345';

import { describe, it, expect, vi } from 'vitest';

vi.mock('../db/index.js', () => ({
  db: {
    query: { users: { findFirst: vi.fn().mockResolvedValue(null) }, magicTokens: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'test1', email: 'test@test.com' }]) }) }),
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

describe('Password Utilities', () => {
  it('should hash a password with bcrypt', async () => {
    const { hashPassword } = await import('../services/auth.service.js');
    const hash = await hashPassword('TestPass1234');
    expect(hash).toMatch(/^\$2[ab]\$/);
    expect(hash.length).toBeGreaterThan(50);
  });
  it('should verify a correct password', async () => {
    const { hashPassword, verifyPassword } = await import('../services/auth.service.js');
    const hash = await hashPassword('CorrectPass');
    expect(await verifyPassword('CorrectPass', hash)).toBe(true);
  });
  it('should reject a wrong password', async () => {
    const { hashPassword, verifyPassword } = await import('../services/auth.service.js');
    const hash = await hashPassword('CorrectPass');
    expect(await verifyPassword('WrongPass', hash)).toBe(false);
  });
  it('should enforce min 8 chars via Zod', async () => {
    const { z } = await import('zod');
    const schema = z.string().min(8);
    expect(() => schema.parse('short')).toThrow();
    expect(() => schema.parse('longEnough')).not.toThrow();
  });
});

describe('JWT Utilities', () => {
  it('should sign and verify a JWT', async () => {
    const { signJWT, verifyJWT } = await import('../services/auth.service.js');
    const payload = { sub: 'u123', email: 'test@t.com', role: 'customer', tokenVersion: 0 };
    const token = signJWT(payload);
    expect(token.split('.')).toHaveLength(3);
    const v = verifyJWT(token);
    expect(v?.sub).toBe('u123');
  });
  it('should return null for invalid JWT', async () => {
    const { verifyJWT } = await import('../services/auth.service.js');
    expect(verifyJWT('invalid')).toBeNull();
  });
});
