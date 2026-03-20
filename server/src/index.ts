import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router';
import { createContext } from './middleware/context';

const app = express();
const httpServer = createServer(app);

// Socket.io — realtime QR sessions
export const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' })); // For base64 images
app.use(cookieParser());

// tRPC
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

// Socket.io — session rooms
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
