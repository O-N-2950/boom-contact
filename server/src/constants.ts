// server/src/constants.ts
// Centralized constants — avoid magic numbers in code

import { randomBytes } from 'crypto';

// File size limits
export const MAX_IMAGE_BASE64_SIZE = 10_000_000; // ~7.5MB
export const MAX_SIGNATURE_SIZE = 10_000_000;

// Time durations (milliseconds)
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
export const CRON_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Auth
export const JWT_EXPIRES_DAYS = 7;
export const BCRYPT_ROUNDS = 12;
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const GIFT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limits
export const RATE_LIMIT_OCR_MAX = 10;
export const RATE_LIMIT_SESSION_CREATE_MAX = 5;
export const RATE_LIMIT_AUTH_MAX = 10;
export const RATE_LIMIT_PAYMENT_MAX = 3;

// Pagination defaults
export const DEFAULT_PAGE_LIMIT = 100;
export const MAX_PAGE_LIMIT = 500;

// Admin
export const ADMIN_MAX_CREDITS = 999999;

// Police dashboard
export const POLICE_DASHBOARD_SESSION_LIMIT = 50;
export const POLICE_DASHBOARD_HOURS = 24;

// Vehicle types that do not require signatures
export const NON_SIGNING_TYPES = ['pedestrian', 'bicycle', 'escooter', 'cargo_bike', 'moped'];

// Client URL for redirects and links — re-exported from config for backwards compat
export { CLIENT_URL } from './config.js';

// ID generator — uses crypto.randomBytes for cryptographically secure random IDs
export function makeId(size = 12): string {
  return randomBytes(size).toString('base64url').slice(0, size);
}
