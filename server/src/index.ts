import * as express from 'express';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

const app = express();
const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/router';
import { createContext } from './middleware/context';
import * as path from 'path';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist/client')));
}

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

io.on('connection', (socket) => {
  socket.on('join-session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('participant-joined');
  });
  socket.on('update-data', ({ sessionId, role, data }: any) => {
    socket.to(`session:${sessionId}`).emit('data-updated', { role, data });
  });
  socket.on('signing-ready', ({ sessionId, role }: any) => {
    socket.to(`session:${sessionId}`).emit('other-ready-to-sign', { role });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`💥 boom.contact server running on port ${PORT}`);
});
