// ── Error-tracking first-party ──────────────────────────────────
// Filet d'erreurs JS global, toujours actif (complémentaire de Sentry,
// qui ne s'active que si VITE_SENTRY_DSN est défini au build).
// Envoie vers POST /api/monitor/client-error (rate-limité côté serveur),
// visible dans les logs Railway/Jelastic sous [CLIENT-ERROR].
// Privacy : message/stack/url techniques uniquement, tronqués — aucune
// donnée personnelle ni contenu de constat.
import { getApiBase } from './apiBase';

const MAX_PER_SESSION = 8;
const seen = new Set<string>();
let sent = 0;

function post(payload: Record<string, string>) {
  try {
    const url = `${getApiBase()}/api/monitor/client-error`;
    const body = JSON.stringify(payload);
    // sendBeacon survit aux fermetures de page ; repli fetch keepalive (natif inclus)
    if (navigator.sendBeacon && getApiBase() === '') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {});
    }
  } catch {
    /* jamais d'erreur secondaire */
  }
}

function report(type: string, message: string, stack: string, source = '') {
  if (sent >= MAX_PER_SESSION) return;
  const sig = `${type}|${message.slice(0, 120)}|${source}`;
  if (seen.has(sig)) return; // dédup par session
  seen.add(sig);
  sent++;
  post({
    type: type.slice(0, 60),
    message: message.slice(0, 200),
    stack: stack.slice(0, 1500),
    url: `${location.pathname}${location.search}`.slice(0, 300),
    ua: navigator.userAgent.slice(0, 160),
    lang: document.documentElement.lang || '',
  });
}

/** À appeler le plus tôt possible (avant le premier render React). */
export function installErrorTracking(): void {
  try {
    window.addEventListener('error', (e: ErrorEvent) => {
      // Erreurs de chargement de ressources (img/script) : signal faible, ignorées
      if (!e.message && !(e.error instanceof Error)) return;
      report(
        'window.onerror',
        e.message || String(e.error?.message ?? 'unknown'),
        String(e.error?.stack ?? ''),
        `${e.filename ?? ''}:${e.lineno ?? 0}`
      );
    });
    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(
        'unhandledrejection',
        r instanceof Error ? r.message : String(r).slice(0, 200),
        r instanceof Error ? String(r.stack ?? '') : ''
      );
    });
  } catch {
    /* le filet ne doit jamais casser l'app */
  }
}
