/**
 * Centralized environment configuration.
 * All process.env reads happen here — the rest of the app imports typed constants.
 * Fails fast on missing required vars at startup.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string = ''): string {
  return process.env[name] || fallback;
}

// ── Database ─────────────────────────────────────────────────
export const DATABASE_URL = required('DATABASE_URL');

// ── Auth ─────────────────────────────────────────────────────
export const JWT_SECRET = required('JWT_SECRET');
export const ADMIN_BOOTSTRAP_SECRET = optional('ADMIN_BOOTSTRAP_SECRET');

// ── External APIs ────────────────────────────────────────────
export const ANTHROPIC_API_KEY = optional('ANTHROPIC_API_KEY');
export const STRIPE_SECRET_KEY = optional('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = optional('STRIPE_WEBHOOK_SECRET');
export const RESEND_API_KEY = optional('RESEND_API_KEY');

// ── Sentry / Analytics ───────────────────────────────────────
export const SENTRY_DSN = optional('SENTRY_DSN');
export const POSTHOG_API_KEY = optional('POSTHOG_API_KEY');

// ── Application ──────────────────────────────────────────────
export const NODE_ENV = optional('NODE_ENV', 'development');
export const PORT = parseInt(optional('PORT', '3000'), 10);
// Resolution robuste de l'URL de base du client.
// Priorite : CLIENT_URL explicite -> domaine public Railway -> domaine de prod.
// GARANTIE : retourne toujours une URL ABSOLUE (https://...), jamais une chaine vide
// (sinon les liens email comme le lien magique deviennent relatifs "/?magic=..." et cassent).
export function resolveClientUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.CLIENT_URL && env.CLIENT_URL.trim())
    || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : '')
    || 'https://www.boom.contact';
}

export const CLIENT_URL = resolveClientUrl();
export const LOG_DEBUG = optional('LOG_DEBUG') === 'true';

// ── Social (disabled but referenced) ─────────────────────────
export const SOCIAL_SECRET = optional('SOCIAL_SECRET');
