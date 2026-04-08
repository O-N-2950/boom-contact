// ── Logger MUST be first — before any other import ──────────
import './logger.js';
import { logger } from './logger.js';
import { startupCheck, startMonitoring, runHealthCheck, getMonitorStatus } from './monitoring/neo-monitor.js';
import { initSentry, captureException } from './analytics.js';

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

// Init Sentry ASAP (called once here, not duplicated below)
initSentry().catch((e) => { logger.debug('Sentry init skipped', { error: String(e) }); });

const app = express();
// Trust first proxy (Railway) — required for rate limiters to see real client IP
app.set('trust proxy', 1);
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'https://boom-contact-production.up.railway.app',
  'https://boom.contact',
  'https://www.boom.contact',
  'https://police.boom.contact',
  // Only allow localhost in development
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
].filter(Boolean) as string[];

// Socket.io
export const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// ── Security ──────────────────────────────────────────────────
async function setupSecurity() {
  try {
    const helmet = (await import('helmet')).default;
    const crypto = await import('crypto');

    // Generate a unique CSP nonce per request
    app.use((_req: any, res: any, next: any) => {
      res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
      next();
    });

    // CSRF: SPA uses Authorization header (not cookies) for JWT, so CSRF tokens are less critical.
    // Helmet's default settings mitigate XSS, clickjacking, and other header-based attacks.
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      xContentTypeOptions: true, // Prevent MIME sniffing by setting X-Content-Type-Options: nosniff
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.cspNonce}'`, 'https://js.stripe.com', 'https://www.googletagmanager.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org',
                   'https://a.tile.openstreetmap.org', 'https://b.tile.openstreetmap.org', 'https://c.tile.openstreetmap.org',
                   'https://server.arcgisonline.com', 'https://api.qrserver.com'],
          connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.anthropic.com',
                       'https://nominatim.openstreetmap.org', 'https://ip-api.io',
                       'https://eu.i.posthog.com', 'https://app.posthog.com',
                       'https://sentry.io', 'https://*.sentry.io',
                       'https://www.google-analytics.com', 'https://www.googletagmanager.com',
                       'https://region1.google-analytics.com',
                       'wss:'],
          frameSrc: ["'self'", 'https://js.stripe.com'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }));
    // HSTS — force HTTPS for 1 year
    app.use((_req: any, res: any, next: any) => {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    });
    logger.info('🛡️  Helmet active');
  } catch (e) {
    logger.warn('Helmet not available', { error: String(e) });
  }
}

// ── Rate limiting ─────────────────────────────────────────────
async function setupRateLimiting() {
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

    // Rate limiting on auth endpoints (brute force protection)
    app.use('/trpc/auth.login', rateLimit({
      windowMs: 15 * 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit auth.login', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
      },
    }));
    app.use('/trpc/auth.register', rateLimit({
      windowMs: 60 * 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit auth.register', { ip: req.ip });
        res.status(429).json({ error: 'Trop de créations de compte. Réessayez dans 1 heure.' });
      },
    }));
    app.use('/trpc/auth.magicLinkRequest', rateLimit({
      windowMs: 60 * 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit magicLink', { ip: req.ip });
        res.status(429).json({ error: 'Trop de demandes de lien. Réessayez dans 1 heure.' });
      },
    }));
    app.use('/trpc/police.login', rateLimit({
      windowMs: 15 * 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit police.login', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
      },
    }));

    // email.sendToDriver — 5/hour per IP (anti-spam)
    app.use('/trpc/email.sendToDriver', rateLimit({
      windowMs: 60 * 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit email.sendToDriver', { ip: req.ip });
        res.status(429).json({ error: 'Trop d\'emails envoyés. Réessayez dans 1 heure.' });
      },
    }));

    // email.bugReport — 5/min per IP
    app.use('/trpc/email.bugReport', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit bugReport', { ip: req.ip });
        res.status(429).json({ error: 'Trop de rapports. Réessayez dans 1 minute.' });
      },
    }));

    // voice.transcribe — 10/min per IP
    app.use('/trpc/voice.transcribe', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit voice.transcribe', { ip: req.ip });
        res.status(429).json({ error: 'Trop de transcriptions. Réessayez dans 1 minute.' });
      },
    }));

    // sketch.render — 10/min per IP (Puppeteer rendering is expensive)
    app.use('/trpc/sketch.render', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit sketch.render', { ip: req.ip });
        res.status(429).json({ error: 'Trop de rendus. Réessayez dans 1 minute.' });
      },
    }));

    // emergency.insuranceLookup — 5/min per IP
    app.use('/trpc/emergency.insuranceLookup', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit emergency.insuranceLookup', { ip: req.ip });
        res.status(429).json({ error: 'Trop de recherches. Réessayez dans 1 minute.' });
      },
    }));

    // emergency.singleLookup — 5/min per IP
    app.use('/trpc/emergency.singleLookup', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit emergency.singleLookup', { ip: req.ip });
        res.status(429).json({ error: 'Trop de recherches. Réessayez dans 1 minute.' });
      },
    }));

    // emergency.countryLookup — 5/min per IP
    app.use('/trpc/emergency.countryLookup', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit emergency.countryLookup', { ip: req.ip });
        res.status(429).json({ error: 'Trop de recherches. Réessayez dans 1 minute.' });
      },
    }));

    // session.updateParticipant — 30/min per IP (frequent during form fill)
    app.use('/trpc/session.updateParticipant', rateLimit({
      windowMs: 60 * 1000, max: 30,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.updateParticipant', { ip: req.ip });
        res.status(429).json({ error: 'Trop de mises à jour. Réessayez dans 1 minute.' });
      },
    }));

    // session.updateAccident — 30/min per IP
    app.use('/trpc/session.updateAccident', rateLimit({
      windowMs: 60 * 1000, max: 30,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.updateAccident', { ip: req.ip });
        res.status(429).json({ error: 'Trop de mises à jour. Réessayez dans 1 minute.' });
      },
    }));

    // session.sign — 5/min per IP
    app.use('/trpc/session.sign', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.sign', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives de signature. Réessayez dans 1 minute.' });
      },
    }));

    // auth.magicLinkVerify — 10/15min per IP (brute force token guessing)
    app.use('/trpc/auth.magicLinkVerify', rateLimit({
      windowMs: 15 * 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit auth.magicLinkVerify', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives de vérification. Réessayez dans 15 minutes.' });
      },
    }));

    // auth.claimGift — 5/h per IP (abuse prevention)
    app.use('/trpc/auth.claimGift', rateLimit({
      windowMs: 60 * 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit auth.claimGift', { ip: req.ip });
        res.status(429).json({ error: 'Trop de réclamations. Réessayez dans 1 heure.' });
      },
    }));

    // auth.adminBootstrap — 3/h per IP (critical endpoint)
    app.use('/trpc/auth.adminBootstrap', rateLimit({
      windowMs: 60 * 60 * 1000, max: 3,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit auth.adminBootstrap', { ip: req.ip });
        res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
      },
    }));

    // police.generateReport — 5/min per IP (expensive PDF rendering)
    app.use('/trpc/police.generateReport', rateLimit({
      windowMs: 60 * 1000, max: 5,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit police.generateReport', { ip: req.ip });
        res.status(429).json({ error: 'Trop de générations de rapport. Réessayez dans 1 minute.' });
      },
    }));

    // voice.analyzeAccident — 10/min per IP (AI cost)
    app.use('/trpc/voice.analyzeAccident', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit voice.analyzeAccident', { ip: req.ip });
        res.status(429).json({ error: 'Trop d\'analyses. Réessayez dans 1 minute.' });
      },
    }));

    // pdf.generate — 10/min per IP (expensive rendering)
    app.use('/trpc/pdf.generate', rateLimit({
      windowMs: 60 * 1000, max: 10,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit pdf.generate', { ip: req.ip });
        res.status(429).json({ error: 'Trop de générations PDF. Réessayez dans 1 minute.' });
      },
    }));

    // session.get — 60/min per IP (frequent polling)
    app.use('/trpc/session.get', rateLimit({
      windowMs: 60 * 1000, max: 60,
      standardHeaders: true, legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit hit session.get', { ip: req.ip });
        res.status(429).json({ error: 'Trop de requêtes. Réessayez dans 1 minute.' });
      },
    }));

    logger.info('🚦 Rate limiting active: OCR(10/min) session.create(5/min) session.join(10/min) session.get(60/min) session.updateParticipant(30/min) session.updateAccident(30/min) session.sign(5/min) payment(3/min) auth(15min) magicLinkVerify(10/15min) claimGift(5/h) adminBootstrap(3/h) police(15min) email(5/h) bugReport(5/min) voice(10/min) analyzeAccident(10/min) pdf(10/min) sketch(10/min) emergency(5/min)');
  } catch (e) {
    logger.warn('Rate limit not available', { error: String(e) });
  }
}

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

// ── Compression (gzip + brotli via zlib) ─────────────────────
import compression from 'compression';
import zlib from 'zlib';
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
// Note: Node.js compression middleware handles gzip/deflate.
// Brotli is typically handled by the CDN/reverse proxy (Railway, Cloudflare).
// For direct brotli support, consider shrink-ray-current or a Brotli-capable proxy.

// ── Core middleware ───────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── CSRF prevention — custom header check ────────────────────
// Mutating requests (POST/PUT/PATCH/DELETE) to /trpc must include
// X-Requested-With header to prevent cross-origin form submissions.
// Browsers block custom headers on cross-origin requests unless CORS allows it.
app.use('/trpc', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const xrw = req.headers['x-requested-with'] || req.headers['x-trpc-source'];
    if (!xrw) {
      logger.warn('CSRF: missing X-Requested-With header on mutation', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(403).json({ error: 'Missing required header: X-Requested-With or X-TRPC-Source' });
      return;
    }
  }
  next();
});

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

// ── Monitor routes ─────────────────────────────────────────
app.get('/api/monitor/status', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = verifyJWT(authHeader.slice(7));
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(getMonitorStatus());
});
app.post('/api/monitor/client-error', (req, res) => {
  const { type, message, url } = req.body || {};
  logger.warn('[CLIENT-ERROR]', { type, message: message?.slice(0, 200), url });
  res.json({ ok: true });
});
app.get('/api/monitor/health', async (_req, res) => {
  const result = await runHealthCheck();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
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


// ── SEO — robots.txt + sitemap.xml ───────────────────────────
// CRITIQUE : ces routes DOIVENT être AVANT express.static
// sinon le wildcard SPA renvoie le HTML React à la place
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /

Sitemap: https://www.boom.contact/sitemap.xml`
  );
});

app.get('/sitemap.xml', (_req, res) => {
  const now = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.boom.contact/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="https://www.boom.contact/?lang=fr"/>
    <xhtml:link rel="alternate" hreflang="de" href="https://www.boom.contact/?lang=de"/>
    <xhtml:link rel="alternate" hreflang="it" href="https://www.boom.contact/?lang=it"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.boom.contact/?lang=en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.boom.contact/"/>
  </url>
  <url>
    <loc>https://www.boom.contact/?pricing=true</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.boom.contact/?privacy=true</loc>
    <lastmod>${now}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`
  );
});


// ── Serve React app ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist/client');
  // Static assets (JS, CSS, images) — cache for 1 year (Vite adds content hash)
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));
  // Other static files — short cache
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // index.html should never be cached
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const nonce = res.locals.cspNonce || '';
    const fs = require('fs');
    const htmlPath = path.join(distPath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // Inject nonce into all <script> tags
    html = html.replace(/<script/g, `<script nonce="${nonce}"`);
    res.type('html').send(html);
  });
}

// ── Socket.io — JWT authentication middleware ────────────────
import { verifyJWT } from './services/auth.service.js';
io.use((socket, next) => {
  // SECURITY: Only accept token from auth object, not query string
  // Query string tokens are visible in server logs and browser history
  if (socket.handshake.query?.token) {
    logger.warn('DEPRECATED: socket query token used — migrate to socket.handshake.auth.token', {
      id: socket.id.slice(0, 8),
      ip: socket.handshake.address,
    });
    // Reject query token — do NOT fall back to it
  }
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Allow anonymous connections for session participants (QR flow)
    (socket as any).authUser = null;
    return next();
  }
  const payload = verifyJWT(token as string);
  if (!payload) {
    logger.warn('Socket auth failed — invalid token, disconnecting', { id: socket.id.slice(0, 8) });
    socket.disconnect(true);
    return next(new Error('Authentication failed: invalid token'));
  }
  (socket as any).authUser = payload;
  next();
});

// ── Socket anonymous connection rate limiting (anti-spam QR flow) ──
const socketConnPerIP = new Map<string, { count: number; resetAt: number }>();
const SOCKET_ANON_MAX = 20;       // max 20 anonymous connections per minute per IP
const SOCKET_ANON_WINDOW = 60_000; // 1 minute window

io.use((socket, next) => {
  // Only throttle anonymous connections (no auth token)
  if (socket.handshake.auth?.token) return next();
  const ip = socket.handshake.address || 'unknown';
  const now = Date.now();
  let entry = socketConnPerIP.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + SOCKET_ANON_WINDOW };
    socketConnPerIP.set(ip, entry);
  }
  entry.count++;
  if (entry.count > SOCKET_ANON_MAX) {
    logger.warn('Socket anon rate limit hit', { ip, count: entry.count });
    return next(new Error('Too many anonymous connections — try again later'));
  }
  next();
});
// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of socketConnPerIP) {
    if (now > entry.resetAt) socketConnPerIP.delete(ip);
  }
}, 5 * 60 * 1000).unref();

// ── Throttle map for socket update-data (300ms per session) ───
const updateThrottles = new Map<string, { timer: ReturnType<typeof setTimeout>; latestData: unknown; latestRole: string }>();

// ── Session existence cache with 30s TTL ───
const sessionExistsCache = new Map<string, { exists: boolean; ts: number }>();
const SESSION_CACHE_TTL = 30_000;

function getCachedSessionExists(sessionId: string): boolean | null {
  const entry = sessionExistsCache.get(sessionId);
  if (entry && Date.now() - entry.ts < SESSION_CACHE_TTL) return entry.exists;
  sessionExistsCache.delete(sessionId);
  return null;
}

io.on('connection', (socket) => {
  logger.debug('Socket connected', { id: socket.id.slice(0, 8), authenticated: !!(socket as any).authUser });

  // SECURITY: Track which sessions this socket has joined — prevent cross-session data injection
  const joinedSessions = new Set<string>();

  socket.on('join-session', async (sessionId: string, participantToken?: string) => {
    // Validate sessionId exists in DB before joining room
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 20) {
      socket.emit('error', { message: 'Invalid session ID' });
      return;
    }
    try {
      const { getSession, verifyParticipantToken } = await import('./services/session.service.js');
      const session = await getSession(sessionId);
      if (!session || session.status === 'expired') {
        socket.emit('error', { message: 'Session not found or expired' });
        return;
      }

      // SECURITY: Verify participantToken (tokenA or tokenB) before allowing room join
      if (!participantToken || typeof participantToken !== 'string') {
        socket.emit('error', { message: 'Participant token required to join session' });
        return;
      }
      const roles = ['A', 'B', 'C', 'D', 'E'] as const;
      let tokenValid = false;
      for (const role of roles) {
        if (await verifyParticipantToken(sessionId, participantToken, role)) {
          tokenValid = true;
          break;
        }
      }
      if (!tokenValid) {
        logger.warn('Socket join-session rejected — invalid participant token', { id: socket.id.slice(0, 8), sessionId });
        socket.emit('error', { message: 'Invalid participant token' });
        return;
      }

      socket.join(`session:${sessionId}`);
      joinedSessions.add(sessionId);
      socket.to(`session:${sessionId}`).emit('participant-joined');
      logger.session('socket-join', sessionId);
    } catch (e) {
      logger.error('Socket join-session error', { error: String(e) });
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  socket.on('update-data', async (raw: unknown) => {
    // Zod validation on socket update-data payload
    const { z } = await import('zod');
    const updateDataSchema = z.object({
      sessionId: z.string().min(1).max(20),
      role: z.enum(['A', 'B', 'C', 'D', 'E']),
      data: z.unknown(),
    });
    const parsed = updateDataSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid update-data payload' });
      return;
    }
    const { sessionId, role, data } = parsed.data;

    // SECURITY: Socket must have joined this session before sending data to it
    if (!joinedSessions.has(sessionId)) {
      logger.warn('Socket tried to update-data for session it has not joined', { id: socket.id.slice(0, 8), sessionId });
      socket.emit('error', { message: 'You must join a session before sending data to it' });
      return;
    }

    // Throttle: batch rapid updates (300ms debounce per session)
    const key = `${socket.id}:${sessionId}`;
    const existing = updateThrottles.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      existing.latestData = data;
      existing.latestRole = role;
      existing.timer = setTimeout(async () => {
        updateThrottles.delete(key);
        try {
          // Check cache first
          const cachedExists = getCachedSessionExists(sessionId);
          let sessionValid = cachedExists !== null ? cachedExists : null;
          if (sessionValid === null) {
            const { getSession } = await import('./services/session.service.js');
            const session = await getSession(sessionId);
            sessionValid = !(!session || session.status === 'expired');
            sessionExistsCache.set(sessionId, { exists: sessionValid, ts: Date.now() });
          }
          if (!sessionValid) return;
          socket.to(`session:${sessionId}`).emit('data-updated', { role: existing.latestRole, data: existing.latestData });
        } catch (e) {
          logger.error('Socket update-data validation error', { error: String(e) });
        }
      }, 300);
    } else {
      // First emission: check cache before validating
      try {
        let sessionValid = false;
        const cachedExists = getCachedSessionExists(sessionId);
        if (cachedExists !== null) {
          sessionValid = cachedExists;
        } else {
          const { getSession } = await import('./services/session.service.js');
          const session = await getSession(sessionId);
          sessionValid = !(!session || session.status === 'expired');
          sessionExistsCache.set(sessionId, { exists: sessionValid, ts: Date.now() });
        }
        if (!sessionValid) {
          socket.emit('error', { message: 'Session not found or expired' });
          return;
        }
        socket.to(`session:${sessionId}`).emit('data-updated', { role, data });
        updateThrottles.set(key, {
          latestData: data,
          latestRole: role,
          timer: setTimeout(() => updateThrottles.delete(key), 300),
        });
      } catch (e) {
        logger.error('Socket update-data validation error', { error: String(e) });
        socket.emit('error', { message: 'Failed to validate session' });
      }
    }
  });

  socket.on('signing-ready', ({ sessionId, role }: { sessionId: string; role: 'A' | 'B' }) => {
    // SECURITY: Socket must have joined this session
    if (!joinedSessions.has(sessionId)) {
      socket.emit('error', { message: 'You must join a session before signaling readiness' });
      return;
    }
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
  captureException(err, { source: 'uncaughtException' }).catch((e) => { logger.debug('captureException failed', { error: String(e) }); });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack?.split('\n').slice(0, 5).join(' | ') : '';
  logger.error('UNHANDLED REJECTION', { reason: msg, stack });
  captureException(reason, { source: 'unhandledRejection' }).catch((e) => { logger.debug('captureException failed', { error: String(e) }); });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Cron nettoyage automatique ────────────────────────────────
// Toutes les heures : expire les sessions > 7 jours en statut waiting/active/signing
setInterval(async () => {
  try {
    const { db } = await import('./db/index.js');
    const { schema } = await import('./db/schema.js');
    const { lt, inArray, and } = await import('drizzle-orm');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db.update(schema.sessions)
      .set({ status: 'expired' })
      .where(
        and(
          inArray(schema.sessions.status, ['waiting', 'active', 'signing']),
          lt(schema.sessions.createdAt, sevenDaysAgo)
        )
      );
    // On ne log que si quelque chose a changé
  } catch (e) {
    logger.warn('Session expiry cron failed', { error: String(e) });
  }
}, 60 * 60 * 1000); // toutes les heures


async function start() {
  logger.info('Starting boom.contact server...');
  await setupSecurity();
  await setupRateLimiting();
  await runMigrations();
  await startupCheck();
  startMonitoring(5);
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

// ── Graceful shutdown ────────────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    io.close(() => {
      logger.info('Socket.io closed');
      process.exit(0);
    });
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch((err) => {
  logger.error('FATAL startup error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join(' | ') : '',
  });
  process.exit(1);
});
