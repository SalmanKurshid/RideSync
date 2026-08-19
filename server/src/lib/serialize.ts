import { Decimal, SCALE } from '@ridesync/shared';
import type { DecimalString } from '@ridesync/shared';

/** Prisma hands back Decimal; tests and callers may hand back strings or numbers. */
type DecimalLike = Decimal | string | number | { toString(): string };

const at = (value: DecimalLike, scale: number): DecimalString =>
  value instanceof Decimal
    ? value.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP).toFixed(scale)
    : new Decimal(value.toString()).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP).toFixed(scale);

/**
 * Decimals leave the API as fixed-scale strings. JSON numbers are doubles, and
 * a budget that round-trips through one stops agreeing with its own line items.
 */
export const asMoney = (value: DecimalLike): DecimalString => at(value, SCALE.money);
export const asLitres = (value: DecimalLike): DecimalString => at(value, SCALE.litres);
export const asDistance = (value: DecimalLike): DecimalString => at(value, SCALE.distance);
export const asOdometer = (value: DecimalLike): DecimalString => at(value, SCALE.odometer);
export const asMileage = (value: DecimalLike): DecimalString => at(value, SCALE.mileage);

export const asNullableMoney = (value: DecimalLike | null | undefined): DecimalString | null =>
  value === null || value === undefined ? null : asMoney(value);

export const asNullableDistance = (value: DecimalLike | null | undefined): DecimalString | null =>
  value === null || value === undefined ? null : asDistance(value);

export const asNullableOdometer = (value: DecimalLike | null | undefined): DecimalString | null =>
  value === null || value === undefined ? null : asOdometer(value);

export const asNullableMileage = (value: DecimalLike | null | undefined): DecimalString | null =>
  value === null || value === undefined ? null : asMileage(value);

/** `YYYY-MM-DD`. Dates are stored as DATE, so the UTC calendar day is the value. */
export const asDate = (value: Date): string => value.toISOString().slice(0, 10);

export const asNullableDate = (value: Date | null): string | null =>
  value === null ? null : asDate(value);

export const asDateTime = (value: Date): string => value.toISOString();
