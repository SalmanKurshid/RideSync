import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * A single demo rider, so a fresh clone has something to sign in with.
 * Idempotent: running it twice leaves one account, not two.
 */
const DEMO = {
  name: 'Demo Rider',
  email: 'demo@ridesync.app',
  password: 'hunter350',
};

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const rider = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: {},
    create: {
      name: DEMO.name,
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 12),
    },
    select: { id: true, email: true },
  });

  console.log(`Seeded rider ${rider.email} (password: ${DEMO.password})`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
