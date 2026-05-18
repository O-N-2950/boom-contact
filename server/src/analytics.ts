// boom.contact — Server-side analytics
// Sentry (error tracking) + PostHog (product events)
// All config via env vars — no hardcoded keys

import { logger } from './logger.js';
import crypto from 'crypto';

// M9 — Pseudonymise tout identifiant ressemblant à un email avant envoi
// à PostHog (privacy : pas d'email en clair chez l'outil d'analytics).
function pseudonymize(id: string): string {
  if (id && id.includes('@')) {
    return 'u_' + crypto.createHash('sha256').update(id.toLowerCase()).digest('hex').slice(0, 24);
  }
  return id;
}

// ── Sentry Backend ────────────────────────────────────────────
let sentryInitialized = false;

export async function initSentry() {
  const dsn = process.env.SENTRY_DSN_BACKEND;
  if (!dsn) {
    logger.warn('[Analytics] SENTRY_DSN_BACKEND not set — Sentry disabled');
    return;
  }
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      release: process.env.npm_package_version || '0.1.0',
      tracesSampleRate: 0.1,          // 10% traces — keep costs low
      integrations: [],
    });
    sentryInitialized = true;
    logger.info('[Analytics] Sentry backend initialized');
  } catch (e) {
    logger.warn('[Analytics] Sentry init failed', { error: String(e) });
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!sentryInitialized) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(err);
    });
  } catch (e) {
    logger.warn('[Analytics] captureException failed', { error: String(e) });
  }
}

// ── PostHog Backend ───────────────────────────────────────────
// Server-side events for accurate payment/conversion tracking
// Uses HTTP API directly — no client-side JS needed for these events

const PH_API_KEY = process.env.POSTHOG_API_KEY;
const PH_HOST = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';

async function phCapture(distinctId: string, event: string, properties: Record<string, unknown> = {}) {
  if (!PH_API_KEY) return;
  const safeId = pseudonymize(distinctId);
  try {
    const body = JSON.stringify({
      api_key: PH_API_KEY,
      event,
      distinct_id: safeId,
      properties: {
        ...properties,
        $lib: 'boom-server',
        environment: process.env.NODE_ENV || 'production',
      },
      timestamp: new Date().toISOString(),
    });
    await fetch(`${PH_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    // Analytics must never break the app — but log for debugging
    logger.debug('[Analytics] PostHog capture failed', { error: String(e) });
  }
}

// ── Product events ────────────────────────────────────────────

export async function trackRapportCree(props: {
  sessionId: string;
  email?: string;
  language?: string;
  role?: string;
}) {
  await phCapture(props.email || props.sessionId, 'rapport_créé', {
    session_id: props.sessionId,
    language: props.language || 'fr',
    role: props.role || 'A',
  });
  logger.info('[Analytics] rapport_créé', { sessionId: props.sessionId });
}

export async function trackPdfGenere(props: {
  sessionId: string;
  email?: string;
  role?: string;
  durationMs?: number;
}) {
  await phCapture(props.email || props.sessionId, 'pdf_généré', {
    session_id: props.sessionId,
    role: props.role || 'A',
    duration_ms: props.durationMs,
  });
  logger.info('[Analytics] pdf_généré', { sessionId: props.sessionId });
}

export async function trackPaiementEffectue(props: {
  email: string;
  packageId: string;
  amount: number;
  currency: string;
  stripeSessionId?: string;
}) {
  await phCapture(props.email, 'paiement_effectué', {
    package_id: props.packageId,
    amount: props.amount,
    currency: props.currency,
    stripe_session_id: props.stripeSessionId,
  });
  logger.info('[Analytics] paiement_effectué', {
    email: props.email, package: props.packageId, currency: props.currency,
  });
}
