import type { Bike } from '@ridesync/shared';
import { prisma } from '../../db/prisma.js';
import { conflict, notFound } from '../../lib/errors.js';
import { asDateTime, asMileage, asOdometer } from '../../lib/serialize.js';
import type { BikeInputBody } from './bikes.schema.js';

interface BikeRow {
  id: string;
  name: string;
  brand: string;
  model: string;
  engineCc: number;
  mileageKmpl: { toString(): string };
  tankLitres: { toString(): string };
  odometerKm: { toString(): string };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toBike = (row: BikeRow): Bike => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  model: row.model,
  engineCc: row.engineCc,
  mileageKmpl: asMileage(row.mileageKmpl),
  tankLitres: asMileage(row.tankLitres),
  odometerKm: asOdometer(row.odometerKm),
  isDefault: row.isDefault,
  createdAt: asDateTime(row.createdAt),
  updatedAt: asDateTime(row.updatedAt),
});

/**
 * Every read is scoped to the owner. A bike belonging to somebody else is
 * reported as missing, so the API never confirms that it exists.
 */
async function requireOwnedBike(userId: string, bikeId: string): Promise<BikeRow> {
  const bike = await prisma.bike.findFirst({ where: { id: bikeId, userId } });
  if (!bike) throw notFound('Bike');
  return bike;
}

export async function list(userId: string): Promise<Bike[]> {
  const bikes = await prisma.bike.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return bikes.map(toBike);
}

export async function getById(userId: string, bikeId: string): Promise<Bike> {
  return toBike(await requireOwnedBike(userId, bikeId));
}

/**
 * Invariant maintained here and in `remove`: a rider with at least one bike
 * always has exactly one default. The first bike added becomes the default
 * automatically, so the trip form always has something sensible to pre-fill.
 */
export async function create(userId: string, input: BikeInputBody): Promise<Bike> {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.bike.count({ where: { userId } });
    const shouldBeDefault = input.isDefault === true || existingCount === 0;

    if (shouldBeDefault && existingCount > 0) {
      await tx.bike.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const bike = await tx.bike.create({
      data: {
        userId,
        name: input.name,
        brand: input.brand,
        model: input.model,
        engineCc: input.engineCc,
        mileageKmpl: input.mileageKmpl,
        tankLitres: input.tankLitres,
        odometerKm: input.odometerKm,
        isDefault: shouldBeDefault,
      },
    });

    return toBike(bike);
  });
}

export async function update(userId: string, bikeId: string, input: BikeInputBody): Promise<Bike> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bike.findFirst({ where: { id: bikeId, userId } });
    if (!existing) throw notFound('Bike');

    // A rider cannot un-default their only bike by editing it; the invariant wins.
    const total = await tx.bike.count({ where: { userId } });
    const shouldBeDefault = input.isDefault ?? existing.isDefault;
    const isDefault = total === 1 ? true : shouldBeDefault;

    if (isDefault && !existing.isDefault) {
      await tx.bike.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const bike = await tx.bike.update({
      where: { id: bikeId },
      data: {
        name: input.name,
        brand: input.brand,
        model: input.model,
        engineCc: input.engineCc,
        mileageKmpl: input.mileageKmpl,
        tankLitres: input.tankLitres,
        odometerKm: input.odometerKm,
        isDefault,
      },
    });

    return toBike(bike);
  });
}

export async function setDefault(userId: string, bikeId: string): Promise<Bike> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bike.findFirst({ where: { id: bikeId, userId } });
    if (!existing) throw notFound('Bike');

    if (existing.isDefault) return toBike(existing);

    // Clearing first keeps the partial unique index satisfied at every statement.
    await tx.bike.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    const bike = await tx.bike.update({ where: { id: bikeId }, data: { isDefault: true } });
    return toBike(bike);
  });
}

export async function remove(userId: string, bikeId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.bike.findFirst({ where: { id: bikeId, userId } });
    if (!existing) throw notFound('Bike');

    // A finished trip must keep the bike that rode it. Rather than a bare
    // constraint error, name the trips so the UI can offer a way forward.
    const blockingTrips = await tx.trip.findMany({
      where: { bikeId },
      select: { name: true },
      orderBy: { startDate: 'asc' },
      take: 5,
    });

    if (blockingTrips.length > 0) {
      const names = blockingTrips.map((trip) => trip.name);
      throw conflict(
        `This bike is used by ${names.length === 1 ? 'a trip' : 'trips'}: ${names.join(', ')}. Reassign or delete ${names.length === 1 ? 'it' : 'them'} first.`,
        { trips: names },
      );
    }

    await tx.bike.delete({ where: { id: bikeId } });

    // Keep the "exactly one default" invariant when the default bike goes.
    if (existing.isDefault) {
      const next = await tx.bike.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (next) {
        await tx.bike.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });
}
