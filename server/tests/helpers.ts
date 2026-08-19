import supertest from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';

export const app: Express = createApp();
export const api = () => supertest(app);

export interface TestRider {
  id: string;
  email: string;
  name: string;
  /** Cookie header value carrying this rider's session. */
  cookie: string;
}

let riderCount = 0;

/** Registers a rider and returns their session cookie, ready to attach. */
export async function createRider(overrides: Partial<{ name: string; email: string; password: string }> = {}): Promise<TestRider> {
  riderCount += 1;
  const payload = {
    name: overrides.name ?? `Rider ${riderCount}`,
    email: overrides.email ?? `rider${riderCount}@example.com`,
    password: overrides.password ?? 'hunter350',
  };

  const response = await api().post('/api/auth/register').send(payload).expect(201);
  const setCookie = response.headers['set-cookie'] as unknown as string[] | undefined;

  if (!setCookie?.length) {
    throw new Error('register did not issue a session cookie');
  }

  return {
    id: response.body.data.id,
    email: response.body.data.email,
    name: response.body.data.name,
    cookie: setCookie.map((c) => c.split(';')[0]).join('; '),
  };
}
