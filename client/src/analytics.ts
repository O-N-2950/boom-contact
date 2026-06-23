// boom.contact — Client-side analytics
// Sentry (errors) + PostHog (UX events) + GA4 (traffic)
// Loaded async — never blocks render, never breaks app

import { sanitizeProps } from './analytics-events';

const IS_PROD = window.location.hostname === 'www.boom.contact' || window.location.hostname === 'boom.contact';

// Consentement analytics : PostHog + GA4 ne s'activent QUE si l'utilisateur a accepté "all".
// (Le CookieBanner stocke 'all' | 'essential' dans localStorage 'boom_cookie_consent'.)
export function hasAnalyticsConsent(): boolean {
  try { return localStorage.getItem('boom_cookie_consent') === 'all'; } catch { return false; }
}

// État interne (debug dev-only — aucune clé exposée)
const _state = { posthog: false, ga4: false, sentry: false, recent: [] as string[] };


// Vite import.meta.env typing
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

// ── Sentry Frontend ───────────────────────────────────────────
export async function initSentryFrontend() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !IS_PROD) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: 'production',
      release: import.meta.env.VITE_RELEASE || `boom-contact@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`,
      tracesSampleRate: 0.05,    // 5% traces frontend
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,   // pas de capture d'écran (privacy)
      integrations: [],
    });
    _state.sentry = true;
  } catch (e) {
    console.warn('[Analytics] Sentry init failed', e);
  }
}

// ── PostHog Frontend ──────────────────────────────────────────
let _ph: { capture: (event: string, props?: Record<string, unknown>) => void; identify: (id: string, props?: Record<string, unknown>) => void; init: (...args: unknown[]) => void } | null = null;

export async function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const host   = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
  if (!apiKey || !IS_PROD || !hasAnalyticsConsent()) return;
  try {
    const posthog = (await import('posthog-js')).default;
    posthog.init(apiKey, {
      api_host: host,
      autocapture: false,          // manual events only — respect privacy
      capture_pageview: true,
      persistence: 'localStorage',
      disable_session_recording: true,
    });
    _ph = posthog as typeof _ph;
    _state.posthog = true;
  } catch (e) {
    console.warn('[Analytics] PostHog init failed', e);
  }
}

export function phCapture(event: string, props: Record<string, unknown> = {}) {
  try { _ph?.capture(event, props); } catch (e) { console.warn('[Analytics] PostHog capture failed', e); }
}

export async function phIdentify(email: string, props: Record<string, unknown> = {}) {
  try {
    const hash = await hashEmail(email);
    _ph?.identify(hash, props);
  } catch (e) { console.warn('[Analytics] PostHog identify failed', e); }
}

async function hashEmail(email: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(email.toLowerCase().trim()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── GA4 ──────────────────────────────────────────────────────
export async function initGA4() {
  const id = import.meta.env.VITE_GA4_ID;
  if (!id || !IS_PROD || !hasAnalyticsConsent()) return;
  try {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) { window.dataLayer.push(args); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true, cookie_flags: 'SameSite=None;Secure' });
    _state.ga4 = true;
  } catch (e) {
    console.warn('[Analytics] GA4 init failed', e);
  }
}

function gtag(...args: unknown[]) {
  try {
    if (typeof window.gtag === 'function') window.gtag(...args);
  } catch (e) { console.warn('[Analytics] gtag call failed', e); }
}

export function ga4Event(name: string, params: Record<string, unknown> = {}) {
  gtag('event', name, params);
}

// ── Unified track function ────────────────────────────────────
export function track(event: string, props: Record<string, unknown> = {}) {
  // Filtrage privacy systématique : aucune donnée personnelle/sensible ne sort.
  const safe = sanitizeProps(props);
  _state.recent.push(event);
  if (_state.recent.length > 20) _state.recent.shift();
  if (!IS_PROD) console.debug('[analytics]', event, safe);  // dev only — jamais en prod
  phCapture(event, safe);
  ga4Event(event, safe);
}

// Helper debug SAFE (statut booléen + derniers events ; AUCUNE clé). Exposé sur window pour
// vérifier l'activation sans panneau utilisateur. Ne révèle jamais de secret.
export function analyticsStatus() {
  return {
    prod: IS_PROD,
    consent: hasAnalyticsConsent(),
    posthog: _state.posthog,
    ga4: _state.ga4,
    sentry: _state.sentry,
    recent: [..._state.recent],
  };
}
if (typeof window !== 'undefined') {
  (window as unknown as { __boomAnalytics?: unknown }).__boomAnalytics = { status: analyticsStatus };
}

// Active PostHog + GA4 après consentement "all" (appelé par le CookieBanner).
export async function enableAnalyticsAfterConsent() {
  await Promise.all([initPostHog(), initGA4()]).catch(() => {});
}
