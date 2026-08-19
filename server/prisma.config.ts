import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer reads .env implicitly. Node 22 can load it natively.
process.loadEnvFile(new URL('.env', import.meta.url).pathname);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
