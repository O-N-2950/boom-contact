import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyJWTWithRevocationCheck, type JWTPayload } from '../services/auth.service.js';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract JWT from Authorization header and verify with revocation check
  let authUser: JWTPayload | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    authUser = await verifyJWTWithRevocationCheck(authHeader.slice(7));
  }
  return { req, res, authUser };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
