// boom.contact — Client-side analytics
// Sentry (errors) + PostHog (UX events) + GA4 (traffic)
// Loaded async — never blocks render, never breaks app

const IS_PROD = window.location.hostname === 'www.boom.contact' || window.location.hostname === 'boom.contact';

// ── Sentry Frontend ───────────────────────────────────────────
export async function initSentryFrontend() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !IS_PROD) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: 'production',
      release: 'boom-contact@0.1.0',
      tracesSampleRate: 0.05,    // 5% traces frontend
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
      integrations: [],
    });
  } catch (e) {
    console.warn('[Analytics] Sentry init failed', e);
  }
}

// ── PostHog Frontend ──────────────────────────────────────────
let _ph: unknown = null;

export async function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const host   = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
  if (!apiKey || !IS_PROD) return;
  try {
    const posthog = (await import('posthog-js')).default;
    posthog.init(apiKey, {
      api_host: host,
      autocapture: false,          // manual events only — respect privacy
      capture_pageview: true,
      persistence: 'localStorage',
      disable_session_recording: true,
    });
    _ph = posthog;
  } catch (e) {
    console.warn('[Analytics] PostHog init failed', e);
  }
}

export function phCapture(event: string, props: Record<string, unknown> = {}) {
  try { _ph?.capture(event, props); } catch (e) { console.warn('[Analytics] PostHog capture failed', e); }
}

export function phIdentify(email: string, props: Record<string, unknown> = {}) {
  try { _ph?.identify(email, props); } catch (e) { console.warn('[Analytics] PostHog identify failed', e); }
}

// ── GA4 ──────────────────────────────────────────────────────
export async function initGA4() {
  const id = import.meta.env.VITE_GA4_ID;
  if (!id || !IS_PROD) return;
  try {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: unknown[]) { (window as any).dataLayer.push(args); }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true, cookie_flags: 'SameSite=None;Secure' });
  } catch (e) {
    console.warn('[Analytics] GA4 init failed', e);
  }
}

function gtag(...args: unknown[]) {
  try {
    const w = window as any;
    if (typeof w.gtag === 'function') w.gtag(...args);
  } catch (e) { console.warn('[Analytics] gtag call failed', e); }
}

export function ga4Event(name: string, params: Record<string, unknown> = {}) {
  gtag('event', name, params);
}

// ── Unified track function ────────────────────────────────────
export function track(event: string, props: Record<string, unknown> = {}) {
  phCapture(event, props);
  ga4Event(event, props);
}
