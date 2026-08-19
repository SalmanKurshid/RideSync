import type { User } from '@ridesync/shared';
import { prisma } from '../../db/prisma.js';
import { conflict, unauthenticated } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { asDateTime } from '../../lib/serialize.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: asDateTime(row.createdAt),
});

export async function register(input: RegisterInput): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw conflict('An account with that email already exists.', {
      email: ['An account with that email already exists.'],
    });
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return toUser(user);
}

export async function login(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // One message for both "no such account" and "wrong password", so the
  // response cannot be used to discover which emails are registered.
  const invalid = unauthenticated('That email or password is not right.');

  if (!user) {
    // Still spend the hashing time, so a missing account is not detectably faster.
    await verifyPassword(input.password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw invalid;
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw invalid;
  }

  return toUser(user);
}
