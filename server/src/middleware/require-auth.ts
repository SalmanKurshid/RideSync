import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { unauthenticated } from '../lib/errors.js';
import { verifySession } from '../lib/jwt.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Reads the session cookie and confirms the user still exists. The extra lookup
 * is deliberate: a token stays cryptographically valid after its account is
 * deleted, and every downstream ownership check assumes a real user.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[env.COOKIE_NAME];

  if (typeof token !== 'string' || token.length === 0) {
    next(unauthenticated());
    return;
  }

  const payload = verifySession(token);
  if (!payload) {
    next(unauthenticated('Your session has expired. Please sign in again.'));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    next(unauthenticated('Your session has expired. Please sign in again.'));
    return;
  }

  req.user = user;
  next();
}

/** Narrows the optional `req.user` after `requireAuth` has run. */
export function currentUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw unauthenticated();
  }
  return req.user;
}
