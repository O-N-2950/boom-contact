/**
 * NEO MONITOR — boom.contact
 * server/src/monitoring/neo-monitor.ts
 */
import { logger } from '../logger.js';

const APP_NAME  = 'boom-contact';
const APP_URL   = process.env.NEO_APP_URL   || 'https://www.boom.contact';
const COCKPIT   = process.env.NEO_COCKPIT_URL    || '';
const SECRET    = process.env.NEO_COCKPIT_SECRET || '';
const PHONE     = process.env.NEO_ALERT_PHONE    || '';
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID  || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN   || '';
const TWILIO_FROM  = process.env.TWILIO_FROM         || '';

const state = {
  consecutiveFailures: 0,
  isDegraded: false,
  startupTime: new Date(),
  intervalId: null as ReturnType<typeof setInterval> | null,
};

// ── DB check ─────────────────────────────────────────────────
async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { db } = await import('../db/index.js');
    const result = await db.execute('SELECT 1 as ping' as any);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Stripe check ─────────────────────────────────────────────
async function checkStripe(): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: 'STRIPE_SECRET_KEY manquant' };
  try {
    const res = await fetch('https://api.stripe.com/v1/charges?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Alerts ───────────────────────────────────────────────────
async function sendSMS(msg: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !PHONE) return;
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: PHONE, Body: msg }),
      signal: AbortSignal.timeout(8000),
    });
    logger.info('[NEO-MONITOR] 📱 SMS envoyé');
  } catch (e: any) { logger.error('[NEO-MONITOR] SMS error', { error: e.message }); }
}

async function sendWhatsApp(msg: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !PHONE) return;
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: `whatsapp:${TWILIO_FROM}`, To: `whatsapp:${PHONE}`, Body: msg }),
      signal: AbortSignal.timeout(8000),
    });
    logger.info('[NEO-MONITOR] 💬 WhatsApp envoyé');
  } catch (e: any) { logger.error('[NEO-MONITOR] WhatsApp error', { error: e.message }); }
}

async function reportToCockpit(status: string, failures: string[]) {
  if (!COCKPIT || !SECRET) return;
  try {
    await fetch(`${COCKPIT}/api/monitor?action=report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cockpit-secret': SECRET },
      body: JSON.stringify({
        appName: APP_NAME, appUrl: APP_URL, status, failures,
        uptime: Math.round((Date.now() - state.startupTime.getTime()) / 60000),
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-critique */ }
}

// ── Health check principal ────────────────────────────────────
export async function runHealthCheck() {
  const checks: Record<string, { ok: boolean; error?: string }> = {};
  const failures: string[] = [];

  checks.database = await checkDatabase();
  if (!checks.database.ok) failures.push(`DB: ${checks.database.error}`);

  checks.stripe = await checkStripe();
  if (!checks.stripe.ok) failures.push(`Stripe: ${checks.stripe.error}`);

  const status = !checks.database.ok ? 'down' : failures.length > 0 ? 'degraded' : 'ok';
  const timestamp = new Date().toISOString();

  await reportToCockpit(status, failures);

  if (failures.length > 0) {
    state.consecutiveFailures++;
    logger.warn(`[NEO-MONITOR] ⚠️ ${failures.length} échec(s) — consécutifs: ${state.consecutiveFailures}`);

    if (state.consecutiveFailures >= 2 && !state.isDegraded) {
      state.isDegraded = true;
      const nowCH = new Date().toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' });
      const msg = `🚨 boom.contact ${status.toUpperCase()}\n${failures.join('\n')}\n${nowCH}`;
      await Promise.all([sendSMS(msg), sendWhatsApp(msg)]);
      logger.error('[NEO-MONITOR] 🚨 ALERTE envoyée');
    }
  } else {
    if (state.isDegraded) {
      const downtime = state.consecutiveFailures * 5;
      const msg = `✅ boom.contact rétabli après ${downtime} min`;
      state.isDegraded = false;
      await Promise.all([sendSMS(msg), sendWhatsApp(msg)]);
    }
    state.consecutiveFailures = 0;
    logger.info(`[NEO-MONITOR] ✅ boom.contact OK — ${timestamp}`);
  }

  return { status, checks, timestamp };
}

// ── Startup ───────────────────────────────────────────────────
export async function startupCheck() {
  logger.info('[NEO-MONITOR] 🔄 Startup boom.contact');
  await runHealthCheck();
  logger.info('[NEO-MONITOR] ✅ Startup terminé');
}

// ── Scheduler ────────────────────────────────────────────────
export function startMonitoring(intervalMinutes = 5) {
  if (state.intervalId) return;
  const ms = intervalMinutes * 60 * 1000;
  state.intervalId = setInterval(async () => {
    try { await runHealthCheck(); }
    catch (e: any) { logger.error('[NEO-MONITOR] Periodic crash', { error: e.message }); }
  }, ms);
  logger.info(`[NEO-MONITOR] 🔁 Monitoring démarré (${intervalMinutes} min)`);
}

export function getMonitorStatus() {
  return {
    appName: APP_NAME,
    consecutiveFailures: state.consecutiveFailures,
    isDegraded: state.isDegraded,
    uptimeMinutes: Math.round((Date.now() - state.startupTime.getTime()) / 60000),
  };
}
