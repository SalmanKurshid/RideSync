import { describe, expect, it } from 'vitest';
import { api, createRider, type TestRider } from './helpers.js';
import { prisma } from '../src/db/prisma.js';

const HUNTER = {
  name: 'Hunter',
  brand: 'Royal Enfield',
  model: 'Hunter 350',
  engineCc: 349,
  mileageKmpl: 30,
  tankLitres: 13,
  odometerKm: 1200,
};

const addBike = async (rider: TestRider, overrides: Record<string, unknown> = {}) => {
  const response = await api()
    .post('/api/bikes')
    .set('Cookie', rider.cookie)
    .send({ ...HUNTER, ...overrides })
    .expect(201);
  return response.body.data;
};

describe('POST /api/bikes', () => {
  it('adds a bike and returns fixed-scale decimals', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    expect(bike).toMatchObject({
      name: 'Hunter',
      brand: 'Royal Enfield',
      engineCc: 349,
      mileageKmpl: '30.00',
      tankLitres: '13.00',
      odometerKm: '1200.0',
    });
  });

  it('makes the very first bike the default automatically', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);
    expect(bike.isDefault).toBe(true);
  });

  it('leaves later bikes non-default unless asked', async () => {
    const rider = await createRider();
    await addBike(rider);
    const second = await addBike(rider, { name: 'Classic' });
    expect(second.isDefault).toBe(false);
  });

  it('moves the default when a new bike claims it', async () => {
    const rider = await createRider();
    const first = await addBike(rider);
    const second = await addBike(rider, { name: 'Classic', isDefault: true });

    expect(second.isDefault).toBe(true);
    const refreshed = await api().get(`/api/bikes/${first.id}`).set('Cookie', rider.cookie).expect(200);
    expect(refreshed.body.data.isDefault).toBe(false);
  });

  it('accepts decimal mileage as a string or a number', async () => {
    const rider = await createRider();
    const bike = await addBike(rider, { mileageKmpl: '35.456', tankLitres: 12.5 });
    // Rounded to the column scale at the persistence boundary.
    expect(bike.mileageKmpl).toBe('35.46');
    expect(bike.tankLitres).toBe('12.50');
  });

  it('rejects impossible values', async () => {
    const rider = await createRider();
    const response = await api()
      .post('/api/bikes')
      .set('Cookie', rider.cookie)
      .send({ ...HUNTER, mileageKmpl: 0, tankLitres: -5, engineCc: 0, odometerKm: -1 })
      .expect(400);

    expect(Object.keys(response.body.error.details).sort()).toEqual([
      'engineCc',
      'mileageKmpl',
      'odometerKm',
      'tankLitres',
    ]);
  });

  it('rejects text where a number belongs', async () => {
    const rider = await createRider();
    await api()
      .post('/api/bikes')
      .set('Cookie', rider.cookie)
      .send({ ...HUNTER, mileageKmpl: 'thirty' })
      .expect(400);
  });

  it('rejects a blank name', async () => {
    const rider = await createRider();
    const response = await api()
      .post('/api/bikes')
      .set('Cookie', rider.cookie)
      .send({ ...HUNTER, name: '   ' })
      .expect(400);
    expect(response.body.error.details.name).toBeDefined();
  });

  it('refuses anonymous requests', async () => {
    await api().post('/api/bikes').send(HUNTER).expect(401);
  });
});

describe('GET /api/bikes', () => {
  it('lists only the signed-in rider’s bikes, default first', async () => {
    const rider = await createRider();
    const stranger = await createRider();

    await addBike(rider, { name: 'Hunter' });
    await addBike(rider, { name: 'Himalayan', isDefault: true });
    await addBike(stranger, { name: 'Not Yours' });

    const response = await api().get('/api/bikes').set('Cookie', rider.cookie).expect(200);
    expect(response.body.data.map((b: { name: string }) => b.name)).toEqual(['Himalayan', 'Hunter']);
  });

  it('returns an empty list for a new rider', async () => {
    const rider = await createRider();
    const response = await api().get('/api/bikes').set('Cookie', rider.cookie).expect(200);
    expect(response.body.data).toEqual([]);
  });
});

describe('ownership', () => {
  it('hides another rider’s bike behind a 404 on every route', async () => {
    const owner = await createRider();
    const stranger = await createRider();
    const bike = await addBike(owner);

    await api().get(`/api/bikes/${bike.id}`).set('Cookie', stranger.cookie).expect(404);
    await api().put(`/api/bikes/${bike.id}`).set('Cookie', stranger.cookie).send(HUNTER).expect(404);
    await api().patch(`/api/bikes/${bike.id}/default`).set('Cookie', stranger.cookie).expect(404);
    await api().delete(`/api/bikes/${bike.id}`).set('Cookie', stranger.cookie).expect(404);
  });

  it('leaves the bike untouched after a stranger’s failed edit', async () => {
    const owner = await createRider();
    const stranger = await createRider();
    const bike = await addBike(owner);

    await api()
      .put(`/api/bikes/${bike.id}`)
      .set('Cookie', stranger.cookie)
      .send({ ...HUNTER, name: 'Stolen' })
      .expect(404);

    const row = await prisma.bike.findUnique({ where: { id: bike.id } });
    expect(row?.name).toBe('Hunter');
  });

  it('rejects a malformed id before touching the database', async () => {
    const rider = await createRider();
    await api().get('/api/bikes/not-a-uuid').set('Cookie', rider.cookie).expect(400);
  });

  it('404s an id that belongs to nobody', async () => {
    const rider = await createRider();
    await api()
      .get('/api/bikes/00000000-0000-4000-8000-000000000000')
      .set('Cookie', rider.cookie)
      .expect(404);
  });
});

describe('PUT /api/bikes/:id', () => {
  it('updates the bike', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    const response = await api()
      .put(`/api/bikes/${bike.id}`)
      .set('Cookie', rider.cookie)
      .send({ ...HUNTER, name: 'Hunter 350', mileageKmpl: 32.5, odometerKm: 5400.5 })
      .expect(200);

    expect(response.body.data).toMatchObject({
      name: 'Hunter 350',
      mileageKmpl: '32.50',
      odometerKm: '5400.5',
    });
  });

  it('will not let a rider leave their only bike non-default', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    const response = await api()
      .put(`/api/bikes/${bike.id}`)
      .set('Cookie', rider.cookie)
      .send({ ...HUNTER, isDefault: false })
      .expect(200);

    expect(response.body.data.isDefault).toBe(true);
  });
});

describe('PATCH /api/bikes/:id/default', () => {
  it('moves the default and leaves exactly one', async () => {
    const rider = await createRider();
    const first = await addBike(rider, { name: 'Hunter' });
    const second = await addBike(rider, { name: 'Classic' });

    await api().patch(`/api/bikes/${second.id}/default`).set('Cookie', rider.cookie).expect(200);

    const defaults = await prisma.bike.findMany({ where: { userId: rider.id, isDefault: true } });
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe(second.id);
    expect(first.id).not.toBe(defaults[0]?.id);
  });

  it('is idempotent', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    await api().patch(`/api/bikes/${bike.id}/default`).set('Cookie', rider.cookie).expect(200);
    await api().patch(`/api/bikes/${bike.id}/default`).set('Cookie', rider.cookie).expect(200);

    const defaults = await prisma.bike.count({ where: { userId: rider.id, isDefault: true } });
    expect(defaults).toBe(1);
  });

  it('never leaves two defaults when requests arrive together', async () => {
    const rider = await createRider();
    const first = await addBike(rider, { name: 'Hunter' });
    const second = await addBike(rider, { name: 'Classic' });

    // Simulates an impatient double-click across two different bikes.
    await Promise.allSettled([
      api().patch(`/api/bikes/${first.id}/default`).set('Cookie', rider.cookie),
      api().patch(`/api/bikes/${second.id}/default`).set('Cookie', rider.cookie),
    ]);

    const defaults = await prisma.bike.count({ where: { userId: rider.id, isDefault: true } });
    expect(defaults).toBe(1);
  });
});

describe('DELETE /api/bikes/:id', () => {
  it('deletes a bike that no trip depends on', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    await api().delete(`/api/bikes/${bike.id}`).set('Cookie', rider.cookie).expect(204);
    await api().get(`/api/bikes/${bike.id}`).set('Cookie', rider.cookie).expect(404);
  });

  it('promotes another bike to default when the default is removed', async () => {
    const rider = await createRider();
    const first = await addBike(rider, { name: 'Hunter' });
    const second = await addBike(rider, { name: 'Classic' });

    await api().delete(`/api/bikes/${first.id}`).set('Cookie', rider.cookie).expect(204);

    const remaining = await prisma.bike.findMany({ where: { userId: rider.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(second.id);
    expect(remaining[0]?.isDefault).toBe(true);
  });

  it('refuses to delete a bike a trip depends on, and names the trip', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    await prisma.trip.create({
      data: {
        userId: rider.id,
        bikeId: bike.id,
        name: 'Ladakh 2026',
        startLocation: 'Guwahati',
        destination: 'Leh',
        startDate: new Date('2026-09-01'),
        estDistanceKm: '1000',
        estMileageKmpl: '30',
        estFuelPrice: '100',
        estBudget: '50000',
      },
    });

    const response = await api()
      .delete(`/api/bikes/${bike.id}`)
      .set('Cookie', rider.cookie)
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.message).toContain('Ladakh 2026');
    expect(response.body.error.details.trips).toEqual(['Ladakh 2026']);

    // The bike survives the refused delete.
    expect(await prisma.bike.count({ where: { id: bike.id } })).toBe(1);
  });

  it('is not fooled by a repeated delete', async () => {
    const rider = await createRider();
    const bike = await addBike(rider);

    await api().delete(`/api/bikes/${bike.id}`).set('Cookie', rider.cookie).expect(204);
    await api().delete(`/api/bikes/${bike.id}`).set('Cookie', rider.cookie).expect(404);
  });
});
