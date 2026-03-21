/**
 * boom.contact — Logger centralisé
 * Tous les logs passent par ici → visible dans Railway dashboard
 * Format: [LEVEL] timestamp | message | data
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const prefix = `[${level}] ${ts}`;
  
  if (data && Object.keys(data).length > 0) {
    // Railway captures stdout — use console.log for all levels so they appear
    const dataStr = JSON.stringify(data, null, 0);
    process.stdout.write(`${prefix} | ${message} | ${dataStr}\n`);
  } else {
    process.stdout.write(`${prefix} | ${message}\n`);
  }

  // Errors also go to stderr so Railway flags them
  if (level === 'ERROR') {
    process.stderr.write(`${prefix} | ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`);
  }
}

export const logger = {
  info:  (msg: string, data?: Record<string, unknown>) => log('INFO',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => log('WARN',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('ERROR', msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.LOG_DEBUG === 'true') log('DEBUG', msg, data);
  },

  // Specialized loggers
  request: (method: string, path: string, status: number, ms: number, ip?: string) => {
    const level: LogLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    log(level, `${method} ${path} ${status} ${ms}ms`, ip ? { ip } : undefined);
  },

  trpcError: (path: string, code: string, message: string) => {
    log('ERROR', `tRPC ${path} → ${code}`, { message: message.slice(0, 200) });
  },

  payment: (event: string, email: string, pkg?: string, amount?: number) => {
    log('INFO', `💳 PAYMENT ${event}`, { email: email.slice(0, 30), pkg, amount });
  },

  ocr: (action: string, country?: string, confidence?: number, durationMs?: number) => {
    log('INFO', `🔍 OCR ${action}`, { country, confidence, durationMs });
  },

  session: (action: string, sessionId: string, role?: string) => {
    log('INFO', `📋 SESSION ${action}`, { sessionId: sessionId.slice(0, 12), role });
  },

  email: (action: string, to: string, subject?: string) => {
    log('INFO', `📧 EMAIL ${action}`, { to: to.slice(0, 30), subject });
  },
};

// Override global console to use our logger (catches all console.log/error)
const originalLog   = console.log.bind(console);
const originalError = console.error.bind(console);
const originalWarn  = console.warn.bind(console);

console.log   = (...args: unknown[]) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  // Skip noisy PG NOTICE messages
  if (msg.includes('42P07') || msg.includes('already exists, skipping') ||
      msg.includes('severity_local') || msg.includes('routine:') ||
      msg.includes('file: \'') || msg.includes('line: \'')) return;
  process.stdout.write(`[INFO] ${new Date().toISOString()} | ${msg}\n`);
};

console.error = (...args: unknown[]) => {
  const msg = args.map(a => {
    if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
    return typeof a === 'object' ? JSON.stringify(a) : String(a);
  }).join(' ');
  process.stdout.write(`[ERROR] ${new Date().toISOString()} | ${msg}\n`);
  process.stderr.write(`[ERROR] ${new Date().toISOString()} | ${msg}\n`);
};

console.warn  = (...args: unknown[]) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  process.stdout.write(`[WARN] ${new Date().toISOString()} | ${msg}\n`);
};
