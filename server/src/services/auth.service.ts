import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, magicTokens } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { logger } from '../logger.js';

const JWT_SECRET  = process.env.JWT_SECRET || 'boom-dev-secret-change-in-prod';
const JWT_EXPIRES = '30d';
const MAGIC_TTL   = 15 * 60 * 1000;  // 15 min
const GIFT_TTL    = 7  * 24 * 60 * 60 * 1000; // 7 days

const ADMIN_EMAIL    = 'contact@boom.contact';
const ADMIN_PASSWORD = 'Cristal4you11++';

// ── Nano ID (alphanum 20 chars) ───────────────────────────────
function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── Password hashing (Node crypto.scrypt) ─────────────────────
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(`${salt}:${key.toString('hex')}`);
    });
  });
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
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

// ── JWT ───────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string;   // user id
  email: string;
  role: string;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Register ──────────────────────────────────────────────────
export async function registerUser(email: string, password: string): Promise<{ id: string; token: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) throw new Error('EMAIL_EXISTS');

  const passwordHash = await hashPassword(password);
  const id = nanoid();

  await db.insert(users).values({
    id,
    email: email.toLowerCase(),
    passwordHash,
    role: 'customer',
    credits: 0,
    consentCGU: true,
    consentCGUAt: new Date(),
  });

  logger.info('User registered', { email });
  return { id, token: signJWT({ sub: id, email: email.toLowerCase(), role: 'customer' }) };
}

// ── Login with password ───────────────────────────────────────
export async function loginWithPassword(email: string, password: string): Promise<{ token: string; user: any }> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!user.passwordHash) throw new Error('NO_PASSWORD');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  const token = signJWT({ sub: user.id, email: user.email, role: user.role || 'customer' });
  logger.info('User login', { email });
  return { token, user: { id: user.id, email: user.email, role: user.role, credits: user.credits } };
}

// ── Magic link ────────────────────────────────────────────────
export async function createMagicToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const id = nanoid(30);
  const expiresAt = new Date(Date.now() + MAGIC_TTL);

  await db.insert(magicTokens).values({ id, email: email.toLowerCase(), token, type: 'login', expiresAt });
  logger.info('Magic token created', { email });
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

  const jwtToken = signJWT({ sub: user!.id, email: user!.email, role: user!.role || 'customer' });
  logger.info('Magic token verified', { email });
  return { token: jwtToken, user: { id: user!.id, email: user!.email, role: user!.role, credits: user!.credits } };
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
  const record = await db.query.magicTokens.findFirst({
    where: and(
      eq(magicTokens.token, token),
      eq(magicTokens.type, 'gift'),
      isNull(magicTokens.usedAt),
      gt(magicTokens.expiresAt, new Date())
    ),
  });
  if (!record || !record.giftCredits) throw new Error('GIFT_INVALID');

  await db.update(magicTokens).set({ usedAt: new Date() }).where(eq(magicTokens.id, record.id));

  // Upsert recipient
  let user = await db.query.users.findFirst({ where: eq(users.email, claimerEmail) });
  if (!user) {
    const id = nanoid();
    await db.insert(users).values({ id, email: claimerEmail, role: 'customer', credits: record.giftCredits, consentCGU: true, consentCGUAt: new Date() });
  } else {
    await db.update(users).set({ credits: (user.credits || 0) + record.giftCredits }).where(eq(users.id, user.id));
  }

  logger.info('Gift claimed', { email: claimerEmail, credits: record.giftCredits });
  return { credits: record.giftCredits };
}

// ── Get user by JWT (from request header) ─────────────────────
export async function getUserFromToken(authHeader?: string): Promise<any | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  return user || null;
}

// ── Admin seed (called from migrate) ─────────────────────────
export async function seedAdminUser(): Promise<void> {
  try {
    const existing = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    if (!existing) {
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
    } else if (existing.role !== 'admin' || existing.credits < 999999) {
      await db.update(users).set({
        passwordHash,
        role: 'admin',
        credits: 999999,
      }).where(eq(users.id, existing.id));
      logger.info('Admin user updated', { email: ADMIN_EMAIL });
    }
  } catch (err) {
    logger.warn('Admin seed skipped', { error: String(err) });
  }
}
