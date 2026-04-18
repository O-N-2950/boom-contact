import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, magicTokens } from '../db/schema.js';
import { eq, and, gt, isNull, sql, count } from 'drizzle-orm';
import { logger, maskEmail } from '../logger.js';
import { BCRYPT_ROUNDS, MAGIC_LINK_TTL_MS, GIFT_LINK_TTL_MS, JWT_EXPIRES_DAYS } from '../constants.js';

// JWT_SECRET must be set in Railway env — crash at boot if missing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}
const JWT_EXPIRES = `${JWT_EXPIRES_DAYS}d`;
const MAGIC_TTL   = MAGIC_LINK_TTL_MS;
const GIFT_TTL    = GIFT_LINK_TTL_MS;

// Admin credentials from environment — never hardcoded
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'contact@boom.contact';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD environment variable is not set.');
  process.exit(1);
}

// ── Nano ID (alphanum 20 chars) ───────────────────────────────
function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── Password hashing (bcrypt) ─────────────────────────────────

/** Check if a stored hash is in the legacy scrypt format (salt:hash) vs bcrypt ($2b$...) */
function isLegacyScryptHash(stored: string): boolean {
  return !stored.startsWith('$2b$') && !stored.startsWith('$2a$') && stored.includes(':');
}

/** Verify a password against a legacy scrypt hash */
async function verifyLegacyScrypt(plain: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, 64, (err, key) => {
      if (err) return reject(err);
      try {
        resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), key));
      } catch {
        resolve(false);
      }
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  // Bcrypt hash → use bcrypt
  if (!isLegacyScryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy scrypt hash → verify with old algo
  return verifyLegacyScrypt(plain, stored);
}

// ── JWT ───────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string;   // user id
  email: string;
  role: string;
  tokenVersion: number;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { algorithm: 'HS256', expiresIn: JWT_EXPIRES, issuer: 'boom.contact', audience: 'boom.contact' });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!, { algorithms: ['HS256'], issuer: 'boom.contact', audience: 'boom.contact' }) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/** Verify JWT AND check tokenVersion against DB — for use in middleware */
export async function verifyJWTWithRevocationCheck(token: string): Promise<JWTPayload | null> {
  const payload = verifyJWT(token);
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user) return null;
  // Reject if tokenVersion doesn't match (token was revoked)
  if ((payload.tokenVersion ?? -1) !== (user.tokenVersion ?? 0)) return null;
  return payload;
}

/** Increment tokenVersion to revoke all existing tokens for a user */
export async function revokeUserTokens(userId: string): Promise<void> {
  await db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
  logger.info('Tokens revoked', { userId });
}

// ── Register ──────────────────────────────────────────────────
export async function registerUser(email: string, password: string): Promise<{ id: string; token: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) throw new Error('EMAIL_EXISTS');

  const passwordHash = await hashPassword(password);
  const id = nanoid();
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await db.insert(users).values({
    id,
    email: email.toLowerCase(),
    passwordHash,
    role: 'customer',
    credits: 0,
    consentCGU: true,
    consentCGUAt: new Date(),
    verified: false,
    verificationToken,
  });

  // Log verification token (email sending can be added later with Resend)
  logger.info('User registered — verification token generated', { email: maskEmail(email), verificationToken: verificationToken.slice(0, 8) + '...' });
  return { id, token: signJWT({ sub: id, email: email.toLowerCase(), role: 'customer', tokenVersion: 0 }) };
}

// ── Email verification ───────────────────────────────────────
export async function verifyEmail(token: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.verificationToken, token) });
  if (!user) return false;
  await db.update(users).set({ verified: true, verificationToken: null }).where(eq(users.id, user.id));
  logger.info('Email verified', { email: maskEmail(user.email) });
  return true;
}

// ── Login with password ───────────────────────────────────────
export async function loginWithPassword(email: string, password: string): Promise<{ token: string; user: any }> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!user.passwordHash) throw new Error('NO_PASSWORD');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  // ── Progressive migration: re-hash legacy scrypt → bcrypt on successful login
  if (isLegacyScryptHash(user.passwordHash)) {
    const newHash = await hashPassword(password);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
    logger.info('Password migrated to bcrypt', { email: maskEmail(email) });
  }

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  const token = signJWT({ sub: user.id, email: user.email, role: user.role || 'customer', tokenVersion: user.tokenVersion ?? 0 });
  logger.info('User login', { email: maskEmail(email) });
  return { token, user: { id: user.id, email: user.email, role: user.role, credits: user.credits, firstName: user.firstName, lastName: user.lastName, phone: user.phone, address: user.address } };
}

// ── Magic link ────────────────────────────────────────────────
const MAGIC_LINK_PER_EMAIL_MAX = 3;  // max 3 magic links per email per hour

export async function createMagicToken(email: string): Promise<string> {
  const emailLower = email.toLowerCase();

  // Rate limit: max 3 magic link requests per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ c: recentCount }] = await db.select({ c: count() })
    .from(magicTokens)
    .where(and(
      eq(magicTokens.email, emailLower),
      eq(magicTokens.type, 'login'),
      gt(magicTokens.createdAt, oneHourAgo),
    ));
  if (recentCount >= MAGIC_LINK_PER_EMAIL_MAX) {
    throw new Error('MAGIC_LINK_RATE_LIMITED');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const id = nanoid(30);
  const expiresAt = new Date(Date.now() + MAGIC_TTL);

  await db.insert(magicTokens).values({ id, email: emailLower, token, type: 'login', expiresAt });
  logger.info('Magic token created', { email: maskEmail(email) });
  return token;
}

export async function verifyMagicToken(token: string): Promise<{ token: string; user: any } | null> {
  const record = await db.query.magicTokens.findFirst({
    where: and(
      eq(magicTokens.token, token),
      eq(magicTokens.type, 'login'),
      isNull(magicTokens.usedAt),
      gt(magicTokens.expiresAt, new Date())
    ),
  });
  if (!record) return null;

  // Mark used
  await db.update(magicTokens).set({ usedAt: new Date() }).where(eq(magicTokens.id, record.id));

  // Upsert user
  const email = record.email;
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const id = nanoid();
    await db.insert(users).values({
      id, email, role: 'customer', credits: 0,
      consentCGU: true, consentCGUAt: new Date(),
    });
    user = await db.query.users.findFirst({ where: eq(users.email, email) });
  } else {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  }

  const jwtToken = signJWT({ sub: user!.id, email: user!.email, role: user!.role || 'customer', tokenVersion: user!.tokenVersion ?? 0 });
  logger.info('Magic token verified', { email });
  return { token: jwtToken, user: { id: user!.id, email: user!.email, role: user!.role, credits: user!.credits, firstName: user!.firstName, lastName: user!.lastName, phone: user!.phone, address: user!.address } };
}

// ── Gift credits link ─────────────────────────────────────────
export async function createGiftLink(credits: number, grantedByEmail: string): Promise<string> {
  const token = crypto.randomBytes(24).toString('hex');
  const id = nanoid(30);
  const expiresAt = new Date(Date.now() + GIFT_TTL);
  await db.insert(magicTokens).values({ id, email: grantedByEmail, token, type: 'gift', giftCredits: credits, expiresAt });
  logger.info('Gift link created', { credits, by: grantedByEmail });
  return token;
}

export async function claimGiftLink(token: string, claimerEmail: string): Promise<{ credits: number }> {
  // Wrap in transaction to prevent double-claiming race condition
  return db.transaction(async (tx) => {
    const record = await tx.query.magicTokens.findFirst({
      where: and(
        eq(magicTokens.token, token),
        eq(magicTokens.type, 'gift'),
        isNull(magicTokens.usedAt),
        gt(magicTokens.expiresAt, new Date())
      ),
    });
    if (!record || !record.giftCredits) throw new Error('GIFT_INVALID');

    await tx.update(magicTokens).set({ usedAt: new Date() }).where(eq(magicTokens.id, record.id));

    // Upsert recipient
    let user = await tx.query.users.findFirst({ where: eq(users.email, claimerEmail) });
    if (!user) {
      const id = nanoid();
      await tx.insert(users).values({ id, email: claimerEmail, role: 'customer', credits: record.giftCredits, consentCGU: true, consentCGUAt: new Date() });
    } else {
      await tx.update(users).set({ credits: (user.credits || 0) + record.giftCredits }).where(eq(users.id, user.id));
    }

    logger.info('Gift claimed', { email: claimerEmail, credits: record.giftCredits });
    return { credits: record.giftCredits };
  });
}

// ── Get user by JWT (from request header) ─────────────────────
export async function getUserFromToken(authHeader?: string): Promise<any | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user) return null;
  // Verify tokenVersion — reject revoked tokens (same check as tRPC middleware)
  if ((payload.tokenVersion ?? -1) !== (user.tokenVersion ?? 0)) return null;
  return user;
}

// ── Admin seed (called from migrate) ─────────────────────────
export async function seedAdminUser(): Promise<void> {
  try {
    const existing = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });

    if (!existing) {
      const passwordHash = await hashPassword(ADMIN_PASSWORD!);
      await db.insert(users).values({
        id: 'admin_boom_contact_01',
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        credits: 999999,
        consentCGU: true,
        consentCGUAt: new Date(),
      });
      logger.info('Admin user created', { email: ADMIN_EMAIL });
    } else {
      // Only update role/credits if needed — NEVER overwrite password
      const updates: Record<string, any> = {};
      if (existing.role !== 'admin') updates.role = 'admin';
      if ((existing.credits ?? 0) < 999999) updates.credits = 999999;
      // Only set password if user has no password hash at all
      if (!existing.passwordHash) {
        updates.passwordHash = await hashPassword(ADMIN_PASSWORD!);
      }
      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, existing.id));
        logger.info('Admin user updated (role/credits only)', { email: ADMIN_EMAIL });
      }
    }
  } catch (err) {
    logger.warn('Admin seed skipped', { error: String(err) });
  }
}
