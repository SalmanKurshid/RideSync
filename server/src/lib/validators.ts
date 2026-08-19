import { z } from 'zod';
import { Decimal } from '@ridesync/shared';

interface DecimalOptions {
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound, matching what the column can actually hold. */
  max: number;
  /** Decimal places of the target column. Input is rounded to this. */
  scale: number;
  exclusiveMin?: boolean;
}

/**
 * Accepts a number or a numeric string and returns a fixed-scale string for
 * Prisma.
 *
 * Rounding to the column's scale here is deliberate, and is not the "premature
 * rounding" the calculations avoid: this is the persistence boundary, where a
 * value has to take the shape the column can hold. Derived values are still
 * computed at full precision.
 */
export function decimalField(options: DecimalOptions) {
  const { label, min, max, scale, exclusiveMin = false } = options;

  return z
    .union([z.number(), z.string().trim().min(1, `${label} is required.`)])
    .superRefine((value, ctx) => {
      let parsed: Decimal;
      try {
        parsed = new Decimal(value);
      } catch {
        ctx.addIssue({ code: 'custom', message: `${label} must be a number.` });
        return;
      }

      if (!parsed.isFinite()) {
        ctx.addIssue({ code: 'custom', message: `${label} must be a number.` });
        return;
      }
      if (exclusiveMin ? parsed.lte(min) : parsed.lt(min)) {
        ctx.addIssue({
          code: 'custom',
          message: exclusiveMin
            ? `${label} must be greater than ${min}.`
            : `${label} cannot be less than ${min}.`,
        });
        return;
      }
      if (parsed.gt(max)) {
        ctx.addIssue({ code: 'custom', message: `${label} cannot be more than ${max}.` });
      }
    })
    .transform((value) =>
      new Decimal(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP).toFixed(scale),
    );
}

/** Trimmed, length-bounded free text. */
export const textField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be under ${max} characters.`);

export const optionalTextField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be under ${max} characters.`)
    .nullish()
    .transform((value) => (value === undefined || value === null || value === '' ? null : value));

/** Route parameters are never trusted; a malformed id is rejected before any query. */
export const uuidParam = (name: string) =>
  z.object({ [name]: z.uuid(`That ${name.replace('Id', '')} id is not valid.`) });
