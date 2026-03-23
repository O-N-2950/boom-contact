import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyJWT, type JWTPayload } from '../services/auth.service.js';

export function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract JWT from Authorization header
  let authUser: JWTPayload | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    authUser = verifyJWT(authHeader.slice(7));
  }
  return { req, res, authUser };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
