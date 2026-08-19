import { Pipe, type PipeTransform } from '@angular/core';
import { Decimal } from '@ridesync/shared';

/**
 * Formats an API decimal string for display. Values arrive as strings on
 * purpose, so parsing happens here and nowhere else.
 */
@Pipe({ name: 'rsNumber' })
export class DecimalFormatPipe implements PipeTransform {
  transform(value: string | number | null | undefined, decimalPlaces = 2): string {
    if (value === null || value === undefined || value === '') return '—';
    try {
      const parsed = new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
      return parsed.toNumber().toLocaleString('en-IN', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    } catch {
      return '—';
    }
  }
}

/** Indian-format rupees, e.g. ₹1,23,456.78. */
@Pipe({ name: 'rsRupees' })
export class RupeesPipe implements PipeTransform {
  transform(value: string | number | null | undefined, decimalPlaces = 2): string {
    if (value === null || value === undefined || value === '') return '—';
    try {
      return new Decimal(value)
        .toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP)
        .toNumber()
        .toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
    } catch {
      return '—';
    }
  }
}
