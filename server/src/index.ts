import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { runMigrations } from './db/migrate';

const app = express();
const httpServer = createServer(app);

// Socket.io — exported for use in router
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'https://boom-contact-production.up.railway.app',
  'http://localhost:5173',
].filter(Boolean) as string[];

export const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' })); // base64 images
app.use(cookieParser());

// Health check — used by Railway
app.get('/health', (_req, res) => res.json({ ok: true, service: 'boom.contact' }));

// tRPC — loaded after io is exported
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router';
import { createContext } from './middleware/context';
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Socket.io — session sync between A and B
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

// Start — run DB migrations first
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  await runMigrations();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`💥 boom.contact running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
