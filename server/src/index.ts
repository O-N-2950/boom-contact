// ── Logger MUST be first — before any other import ──────────
import './logger.js';
import { logger } from './logger.js';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './db/migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'https://boom-contact-production.up.railway.app',
  'https://boom.contact',
  'https://www.boom.contact',
  'https://police.boom.contact',
  'http://localhost:5173',
].filter(Boolean) as string[];

// Socket.io
export const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// ── Security ──────────────────────────────────────────────────
(async () => {
  try {
    const helmet = (await import('helmet')).default;
    app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
    logger.info('🛡️  Helmet active');
  } catch (e) { logger.warn('Helmet not available', { error: String(e) }); }
})();

// ── Rate limiting ─────────────────────────────────────────────
(async () => {
  try {
    const { rateLimit } = await import('express-rate-limit');

    // OCR — 10 req/min (Claude Vision coûteux)
    app.use('/trpc/ocr', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit OCR', { ip: req.ip });
        res.status(429).json({ error: 'Trop de requêtes OCR. Réessayez dans 1 minute.' });
      },
    }));

    // session.create — 5 créations/min par IP
    app.use('/trpc/session.create', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.create', { ip: req.ip });
        res.status(429).json({ error: 'Trop de sessions créées. Réessayez dans 1 minute.' });
      },
    }));

    // session.join — 10 tentatives/min par IP
    app.use('/trpc/session.join', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.join', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 minute.' });
      },
    }));

    // payment.createCheckout — 3 tentatives/min par IP (anti-abus Stripe)
    app.use('/trpc/payment.createCheckout', rateLimit({
      windowMs: 60 * 1000, max: 3,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit payment', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives de paiement. Réessayez dans 1 minute.' });
      },
    }));

    logger.info('🚦 Rate limiting active: OCR(10/min) session.create(5/min) session.join(10/min) payment(3/min)');
  } catch (e) { logger.warn('Rate limit not available', { error: String(e) }); }
})();

// ── HTTP request logging (Morgan) ─────────────────────────────
app.use(morgan((tokens, req, res) => {
  const method  = tokens.method(req, res) || '-';
  const url     = tokens.url(req, res) || '-';
  const status  = parseInt(tokens.status(req, res) || '0', 10);
  const ms      = parseFloat(tokens['response-time'](req, res) || '0');
  const ip      = req.ip || req.headers['x-forwarded-for'] || '-';

  // Skip health checks to avoid log spam
  if (url === '/health') return null;

  const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
  process.stdout.write(`[${level}] ${new Date().toISOString()} | ${method} ${url} ${status} ${ms.toFixed(0)}ms | ip:${ip}\n`);
  if (status >= 500) {
    process.stderr.write(`[ERROR] ${new Date().toISOString()} | ${method} ${url} ${status} ${ms.toFixed(0)}ms\n`);
  }
  return null; // Morgan handles writing itself when we return string, null = we handle it
}));

// ── Core middleware ───────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Redirection apex → www ───────────────────────────────────
// boom.contact → www.boom.contact (301 permanent)
app.use((req, res, next) => {
  const host = req.hostname || req.headers.host || '';
  if (host === 'boom.contact') {
    return res.redirect(301, `https://www.boom.contact${req.originalUrl}`);
  }
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'boom.contact', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ── Blocage bots / scanners (WordPress, PHPMyAdmin, etc.) ─────
// Ces routes n'existent pas sur boom.contact — on répond 404 immédiatement
// pour éviter le bruit dans les logs et réduire la charge
const BOT_PATTERNS = [
  '/wp-admin', '/wp-login', '/wp-content', '/wordpress',
  '/phpMyAdmin', '/phpmyadmin', '/pma', '/admin/pma',
  '/.env', '/config.php', '/setup.php', '/install.php',
  '/xmlrpc.php', '/wp-cron.php', '/wp-trackback.php',
  '/shell.php', '/c99.php', '/r57.php', '/eval.php',
  '/.git', '/.svn', '/.DS_Store',
];
app.use((req, _res, next) => {
  const path = req.path.toLowerCase();
  if (BOT_PATTERNS.some(p => path.startsWith(p) || path.includes(p))) {
    _res.status(404).end();
    return;
  }
  next();
});

// ── Stripe Webhook — raw body ─────────────────────────────────
app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    try {
      const { handleStripeWebhook } = await import('./services/stripe.service.js');
      await handleStripeWebhook(req.body, sig);
      logger.info('Stripe webhook processed', { sig: sig?.slice(0, 20) });
      res.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      logger.error('Stripe webhook failed', { error: msg });
      res.status(400).json({ error: msg });
    }
  }
);

// ── tRPC router ───────────────────────────────────────────────
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router.js';
import { createContext } from './middleware/context.js';

app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ path, error }) => {
    // Log ALL tRPC errors
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(`tRPC INTERNAL_ERROR on ${path}`, {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join(' | '),
      });
    } else {
      logger.warn(`tRPC ${error.code} on ${path}`, { message: error.message.slice(0, 200) });
    }
  },
}));

// ── Serve React app ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Socket.io ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.debug('Socket connected', { id: socket.id.slice(0, 8) });

  socket.on('join-session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('participant-joined');
    logger.session('socket-join', sessionId);
  });

  socket.on('update-data', ({ sessionId, role, data }: { sessionId: string; role: 'A' | 'B'; data: unknown }) => {
    socket.to(`session:${sessionId}`).emit('data-updated', { role, data });
  });

  socket.on('signing-ready', ({ sessionId, role }: { sessionId: string; role: 'A' | 'B' }) => {
    socket.to(`session:${sessionId}`).emit('other-ready-to-sign', { role });
    logger.session('signing-ready', sessionId, role);
  });

  socket.on('disconnect', (reason) => {
    logger.debug('Socket disconnected', { id: socket.id.slice(0, 8), reason });
  });

  socket.on('error', (err) => {
    logger.error('Socket error', { error: err.message });
  });
});

// ── Catch unhandled errors ────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — server will exit', {
    error: err.message,
    stack: err.stack?.split('\n').slice(0, 8).join(' | '),
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack?.split('\n').slice(0, 5).join(' | ') : '';
  logger.error('UNHANDLED REJECTION', { reason: msg, stack });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Cron nettoyage automatique ────────────────────────────────
// Toutes les heures : expire les sessions > 7 jours en statut waiting/active/signing
setInterval(async () => {
  try {
    const { db } = await import('./db/index.js');
    const { schema } = await import('./db/schema.js');
    const { lt, inArray } = await import('drizzle-orm');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db.update(schema.sessions)
      .set({ status: 'expired' } as any)
      .where(
        inArray(schema.sessions.status, ['waiting', 'active', 'signing'])
      );
    // On ne log que si quelque chose a changé
  } catch (e) {
    // Silencieux — cron non critique
  }
}, 60 * 60 * 1000); // toutes les heures


async function start() {
  logger.info('Starting boom.contact server...');
  await runMigrations();
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`💥 boom.contact running`, {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      db: process.env.DATABASE_URL ? '✅' : '❌ MISSING',
      claude: process.env.ANTHROPIC_API_KEY ? '✅' : '❌ MISSING',
      stripe: process.env.STRIPE_SECRET_KEY ? '✅' : '❌ MISSING',
      resend: process.env.RESEND_API_KEY ? '✅' : '❌ MISSING',
    });
  });
}

start().catch((err) => {
  logger.error('FATAL startup error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join(' | ') : '',
  });
  process.exit(1);
});



