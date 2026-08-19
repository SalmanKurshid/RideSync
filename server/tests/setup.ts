import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db/prisma.js';

/**
 * Every test starts from an empty database. Truncating `users` is enough —
 * everything else cascades from it, which is itself a check that the foreign
 * keys are wired the way the schema claims.
 */
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
