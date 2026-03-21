/**
 * boom.contact — Logger centralisé
 * 
 * CRITICAL: Force stdout/stderr to blocking mode
 * In Docker (non-TTY), Node.js buffers stdout → logs never appear in Railway
 * setBlocking(true) forces synchronous writes = logs appear immediately
 */

// ── Force synchronous stdout/stderr (MUST be first) ──────────
function forceUnbuffered() {
  try {
    if ((process.stdout as any)._handle?.setBlocking) {
      (process.stdout as any)._handle.setBlocking(true);
    }
    if ((process.stderr as any)._handle?.setBlocking) {
      (process.stderr as any)._handle.setBlocking(true);
    }
    // Also set encoding to prevent any encoding-related buffering
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  } catch {}
}

forceUnbuffered();

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0
    ? ' | ' + JSON.stringify(data)
    : '';
  const line = `[${level}] ${ts} | ${message}${dataStr}\n`;

  // process.stdout.write is now synchronous (setBlocking above)
  process.stdout.write(line);

  // Errors also to stderr
  if (level === 'ERROR') {
    process.stderr.write(line);
  }
}

export const logger = {
  info:  (msg: string, data?: Record<string, unknown>) => log('INFO',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => log('WARN',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('ERROR', msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.LOG_DEBUG === 'true') log('DEBUG', msg, data);
  },

  request: (method: string, path: string, status: number, ms: number, ip?: string) => {
    const level: LogLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    log(level, `${method} ${path} ${status} ${ms}ms`, ip ? { ip } : undefined);
  },
  trpcError: (path: string, code: string, message: string) =>
    log('ERROR', `tRPC ${path} → ${code}`, { message: message.slice(0, 200) }),
  payment: (event: string, email: string, pkg?: string, amount?: number) =>
    log('INFO', `💳 PAYMENT ${event}`, { email: email.slice(0, 30), pkg, amount }),
  ocr: (action: string, country?: string, confidence?: number, durationMs?: number) =>
    log('INFO', `🔍 OCR ${action}`, { country, confidence, durationMs }),
  session: (action: string, sessionId: string, role?: string) =>
    log('INFO', `📋 SESSION ${action}`, { sessionId: sessionId.slice(0, 12), role }),
  email: (action: string, to: string, subject?: string) =>
    log('INFO', `📧 EMAIL ${action}`, { to: to.slice(0, 30), subject }),
};

// ── Override console — filter PG noise, force sync output ────
const PG_NOISE = ['42P07','42701','already exists, skipping','severity_local','routine:','file: \'','line: \'','PL/pgSQL'];

console.log = (...args: unknown[]) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (PG_NOISE.some(n => msg.includes(n))) return;
  process.stdout.write(`[INFO] ${new Date().toISOString()} | ${msg}\n`);
};

console.error = (...args: unknown[]) => {
  const msg = args.map(a => a instanceof Error
    ? `${a.message}\n${a.stack || ''}` : typeof a === 'object'
    ? JSON.stringify(a) : String(a)).join(' ');
  const line = `[ERROR] ${new Date().toISOString()} | ${msg}\n`;
  process.stdout.write(line);
  process.stderr.write(line);
};

console.warn = (...args: unknown[]) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  process.stdout.write(`[WARN] ${new Date().toISOString()} | ${msg}\n`);
};

console.info = console.log;
