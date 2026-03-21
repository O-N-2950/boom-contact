import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
  'http://localhost:5173',
].filter(Boolean) as string[];

// Socket.io — real-time sync A↔B
export const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// ── Security ──────────────────────────────────────────────────
// Dynamic import for ESM-only packages
let helmetMiddleware: any = null;
(async () => {
  try {
    const helmet = (await import('helmet')).default;
    helmetMiddleware = helmet({
      contentSecurityPolicy: false, // React inline scripts need this
      crossOriginEmbedderPolicy: false,
    });
    app.use(helmetMiddleware);
    console.log('🛡️  Helmet security headers active');
  } catch { console.warn('⚠️  Helmet not installed yet'); }
})();

// ── Rate limiting on OCR (expensive Claude Vision calls) ──────
let rateLimitMiddleware: any = null;
(async () => {
  try {
    const { rateLimit } = await import('express-rate-limit');
    rateLimitMiddleware = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Trop de requêtes OCR. Réessayez dans 1 minute.' },
    });
    app.use('/trpc/ocr', rateLimitMiddleware);
    console.log('🚦 Rate limiting active on /trpc/ocr (10 req/min)');
  } catch { console.warn('⚠️  express-rate-limit not installed yet'); }
})();

// ── Core middleware ───────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' })); // base64 images
app.use(cookieParser());

// Health check — Railway
app.get('/health', (_req, res) => res.json({ ok: true, service: 'boom.contact', env: process.env.NODE_ENV }));

// tRPC router
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router.js';
import { createContext } from './middleware/context.js';
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Socket.io — session sync ──────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join-session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('participant-joined');
  });

  socket.on('update-data', ({ sessionId, role, data }: { sessionId: string; role: 'A' | 'B'; data: unknown }) => {
    socket.to(`session:${sessionId}`).emit('data-updated', { role, data });
  });

  socket.on('signing-ready', ({ sessionId, role }: { sessionId: string; role: 'A' | 'B' }) => {
    socket.to(`session:${sessionId}`).emit('other-ready-to-sign', { role });
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  await runMigrations();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`💥 boom.contact running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB: ${process.env.DATABASE_URL ? '✅' : '❌ missing'}`);
    console.log(`   Claude: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌ missing'}`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
