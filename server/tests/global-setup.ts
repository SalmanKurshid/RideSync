import { execFileSync } from 'node:child_process';

/** Brings the test database up to the current migration state, once per run. */
export default function setup(): void {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set — see .env.example');
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
