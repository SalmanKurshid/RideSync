import { z } from 'zod';
import { decimalField, textField } from '../../lib/validators.js';

/**
 * Bounds are set by what the columns can hold and by what is physically
 * plausible for a motorcycle, so obvious typos are caught at the edge rather
 * than becoming a 3,000 km/l trip estimate.
 */
export const bikeInputSchema = z.object({
  name: textField('Name', 60),
  brand: textField('Brand', 40),
  model: textField('Model', 60),
  engineCc: z
    .number({ error: 'Engine capacity is required.' })
    .int('Engine capacity must be a whole number.')
    .min(1, 'Engine capacity must be greater than 0.')
    .max(5000, 'Engine capacity cannot be more than 5000cc.'),
  mileageKmpl: decimalField({ label: 'Mileage', min: 0, max: 999.99, scale: 2, exclusiveMin: true }),
  tankLitres: decimalField({ label: 'Tank capacity', min: 0, max: 999.99, scale: 2, exclusiveMin: true }),
  odometerKm: decimalField({ label: 'Odometer', min: 0, max: 9_999_999.9, scale: 1 }),
  isDefault: z.boolean().optional(),
});

/** Edits replace the whole bike, matching the PUT semantics of the route. */
export const bikeUpdateSchema = bikeInputSchema;

export type BikeInputBody = z.infer<typeof bikeInputSchema>;
