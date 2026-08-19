import type { Request, Response } from 'express';
import type { ApiSuccess, User } from '@ridesync/shared';
import { clearSessionCookie, setSessionCookie, signSession } from '../../lib/jwt.js';
import { currentUser } from '../../middleware/require-auth.js';
import * as authService from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

const sendUser = (res: Response, user: User, status: number): void => {
  setSessionCookie(res, signSession({ sub: user.id, email: user.email }));
  const body: ApiSuccess<User> = { data: user };
  res.status(status).json(body);
};

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.register(req.body as RegisterInput);
  sendUser(res, user, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.login(req.body as LoginInput);
  sendUser(res, user, 200);
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(204).send();
}

export function me(req: Request, res: Response): void {
  const user = currentUser(req);
  const body: ApiSuccess<Pick<User, 'id' | 'email' | 'name'>> = { data: user };
  res.json(body);
}
