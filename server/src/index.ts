import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// Socket.io — realtime QR sessions (must be created BEFORE router import)
export const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router';
import { createContext } from './middleware/context';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve built frontend in production
import path from 'path';
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist/client')));
}

// tRPC
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

// Serve index.html for all non-API routes (SPA)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

// Socket.io sessions
io.on('connection', (socket) => {
  socket.on('join-session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('participant-joined');
  });
  socket.on('update-data', ({ sessionId, role, data }: { sessionId: string; role: 'A'|'B'; data: unknown }) => {
    socket.to(`session:${sessionId}`).emit('data-updated', { role, data });
  });
  socket.on('signing-ready', ({ sessionId, role }: { sessionId: string; role: 'A'|'B' }) => {
    socket.to(`session:${sessionId}`).emit('other-ready-to-sign', { role });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`💥 boom.contact server running on port ${PORT}`);
});
