import { io, type Socket } from 'socket.io-client';

// ── Socket.io client with resilient reconnection ──────────────
// Reconnects automatically on disconnect with exponential backoff

let socket: Socket | null = null;

export function getSocket(participantToken?: string): Socket {
  if (socket?.connected) return socket;

  socket = io({
    auth: participantToken ? { token: participantToken } : undefined,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connection error:', err.message);
  });

  socket.on('reconnect', (attempt) => {
    console.info('[socket] reconnected after', attempt, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    console.error('[socket] reconnection failed after max attempts');
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
