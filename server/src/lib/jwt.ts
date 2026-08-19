import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env, isProduction } from '../config/env.js';

export interface SessionPayload {
  sub: string;
  email: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) return null;
    return { sub: String(decoded.sub), email: String(decoded['email'] ?? '') };
  } catch {
    // Expired, malformed, or signed with the wrong key — all mean "no session".
    return null;
  }
}

/**
 * httpOnly so injected scripts cannot read the token; sameSite lax so it still
 * travels on top-level navigations. In development the Angular dev server
 * proxies /api, which keeps this same-origin and makes the cookie behave
 * exactly as it will in production.
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(env.COOKIE_NAME, token, cookieOptions);
};

export const clearSessionCookie = (res: Response): void => {
  const { maxAge: _maxAge, ...rest } = cookieOptions;
  res.clearCookie(env.COOKIE_NAME, rest);
};
