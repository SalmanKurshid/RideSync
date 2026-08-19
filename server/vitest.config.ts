import { defineConfig } from 'vitest/config';

// Tests run against a real Postgres database, not a mock. Ownership rules and
// database constraints are precisely what needs proving, and only the real
// thing proves them.
process.loadEnvFile(new URL('.env', import.meta.url).pathname);
process.env['NODE_ENV'] = 'test';

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    // One shared database: files must not race each other.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
