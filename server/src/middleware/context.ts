import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyJWTWithRevocationCheck, type JWTPayload } from '../services/auth.service.js';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract JWT: 1) httpOnly cookie (secure), 2) Authorization header (backward compat)
  let authUser: JWTPayload | null = null;
  const cookieToken = req.cookies?.boom_token;
  const authHeader = req.headers.authorization;
  const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  if (token) {
    authUser = await verifyJWTWithRevocationCheck(token);
  }
  return { req, res, authUser };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
