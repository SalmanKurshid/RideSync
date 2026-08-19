import { describe, expect, it } from 'vitest';
import { api, createRider } from './helpers.js';

describe('POST /api/auth/register', () => {
  it('creates an account and issues an httpOnly session cookie', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({ name: 'Salman', email: 'salman@example.com', password: 'hunter350' })
      .expect(201);

    expect(response.body.data).toMatchObject({ email: 'salman@example.com', name: 'Salman' });
    expect(response.body.data).not.toHaveProperty('passwordHash');

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('ridesync_session=');
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
  });

  it('normalises email casing and surrounding space', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({ name: 'Salman', email: '  Rider@Example.COM ', password: 'hunter350' })
      .expect(201);

    expect(response.body.data.email).toBe('rider@example.com');
  });

  it('rejects a duplicate email regardless of casing', async () => {
    await createRider({ email: 'dup@example.com' });

    const response = await api()
      .post('/api/auth/register')
      .send({ name: 'Impostor', email: 'DUP@Example.com', password: 'hunter350' })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.details.email).toBeDefined();
  });

  it('reports every invalid field at once', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'abc' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.details).sort()).toEqual(['email', 'name', 'password']);
  });

  it('never stores the password in readable form', async () => {
    const { prisma } = await import('../src/db/prisma.js');
    await createRider({ email: 'hash@example.com', password: 'hunter350' });

    const row = await prisma.user.findUnique({ where: { email: 'hash@example.com' } });
    expect(row?.passwordHash).not.toBe('hunter350');
    expect(row?.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe('POST /api/auth/login', () => {
  it('signs a rider in with the right password', async () => {
    await createRider({ email: 'login@example.com', password: 'hunter350' });

    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'hunter350' })
      .expect(200);

    expect(response.body.data.email).toBe('login@example.com');
  });

  it('accepts a differently-cased email', async () => {
    await createRider({ email: 'case@example.com', password: 'hunter350' });

    await api()
      .post('/api/auth/login')
      .send({ email: 'CASE@Example.com', password: 'hunter350' })
      .expect(200);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    await createRider({ email: 'known@example.com', password: 'hunter350' });

    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'not-the-password' })
      .expect(401);

    const unknownAccount = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'not-the-password' })
      .expect(401);

    // Identical responses, so the endpoint cannot be used to discover which
    // email addresses have accounts.
    expect(wrongPassword.body).toEqual(unknownAccount.body);
  });

  it('does not issue a session on a failed attempt', async () => {
    await createRider({ email: 'nosession@example.com' });

    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'nosession@example.com', password: 'wrong' })
      .expect(401);

    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in rider', async () => {
    const rider = await createRider();

    const response = await api().get('/api/auth/me').set('Cookie', rider.cookie).expect(200);
    expect(response.body.data).toEqual({ id: rider.id, email: rider.email, name: rider.name });
  });

  it('refuses a request with no session', async () => {
    const response = await api().get('/api/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a tampered token', async () => {
    await api()
      .get('/api/auth/me')
      .set('Cookie', 'ridesync_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.bogus')
      .expect(401);
  });

  it('refuses a valid token whose account no longer exists', async () => {
    const { prisma } = await import('../src/db/prisma.js');
    const rider = await createRider();
    await prisma.user.delete({ where: { id: rider.id } });

    // The token is still cryptographically valid; the account behind it is gone.
    await api().get('/api/auth/me').set('Cookie', rider.cookie).expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session', async () => {
    const rider = await createRider();

    const response = await api().post('/api/auth/logout').set('Cookie', rider.cookie).expect(204);
    const cleared = (response.headers['set-cookie'] as unknown as string[])[0];
    expect(cleared).toContain('ridesync_session=;');
  });

  it('is harmless when nobody is signed in', async () => {
    await api().post('/api/auth/logout').expect(204);
  });
});

describe('request handling', () => {
  it('rejects unreadable JSON as a client error, not a server fault', async () => {
    const response = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized body', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(120_000) })
      .expect(400);
  });

  it('404s an unknown route', async () => {
    const response = await api().get('/api/nope').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('leaks no stack trace or internals on an error response', async () => {
    const response = await api().get('/api/auth/me').expect(401);
    expect(JSON.stringify(response.body)).not.toContain('at ');
  });
});
