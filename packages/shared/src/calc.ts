import { Decimal } from 'decimal.js';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from './enums.js';

export { Decimal };

/**
 * Anything a caller might reasonably hold a number in. Prisma hands back
 * `Decimal`, JSON hands back strings, and form previews hand back numbers.
 */
export type Numeric = Decimal | string | number;

/** Scales that mirror the database columns exactly. */
export const SCALE = {
  money: 2,
  litres: 3,
  distance: 2,
  /** Odometer readings are numeric(10,1) — whole-tenths of a kilometre. */
  odometer: 1,
  mileage: 2,
} as const;

export function toDecimal(value: Numeric): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

/** Rounds half-up, the way a person reading a receipt expects. */
function round(value: Decimal, decimalPlaces: number): Decimal {
  return value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
}

export const roundMoney = (value: Numeric): Decimal => round(toDecimal(value), SCALE.money);
export const roundLitres = (value: Numeric): Decimal => round(toDecimal(value), SCALE.litres);
export const roundDistance = (value: Numeric): Decimal => round(toDecimal(value), SCALE.distance);
export const roundOdometer = (value: Numeric): Decimal => round(toDecimal(value), SCALE.odometer);
export const roundMileage = (value: Numeric): Decimal => round(toDecimal(value), SCALE.mileage);

/** Serialise for JSON. Decimals travel as strings so they never pass through a float. */
export const money = (value: Numeric): string => roundMoney(value).toFixed(SCALE.money);
export const litres = (value: Numeric): string => roundLitres(value).toFixed(SCALE.litres);

// ---------------------------------------------------------------------------
// Fuel estimation
// ---------------------------------------------------------------------------

/**
 * Litres a trip is expected to need. Deliberately unrounded — 1000 / 30 stays
 * 33.333… so the cost multiplication below starts from the exact value.
 */
export function estimatedFuelLitres(distanceKm: Numeric, mileageKmpl: Numeric): Decimal {
  const mileage = toDecimal(mileageKmpl);
  if (mileage.lte(0)) {
    throw new RangeError('mileageKmpl must be greater than zero');
  }
  return toDecimal(distanceKm).dividedBy(mileage);
}

export function estimatedFuelCost(fuelLitres: Numeric, pricePerLitre: Numeric): Decimal {
  return toDecimal(fuelLitres).times(toDecimal(pricePerLitre));
}

export interface FuelEstimate {
  /** Exact, unrounded — use for further maths. */
  litres: Decimal;
  cost: Decimal;
}

export function estimateTripFuel(input: {
  distanceKm: Numeric;
  mileageKmpl: Numeric;
  pricePerLitre: Numeric;
}): FuelEstimate {
  const fuelLitres = estimatedFuelLitres(input.distanceKm, input.mileageKmpl);
  return { litres: fuelLitres, cost: estimatedFuelCost(fuelLitres, input.pricePerLitre) };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface ExpenseLike {
  category: ExpenseCategory;
  amount: Numeric;
}

export interface ExpenseTotals {
  total: Decimal;
  fuel: Decimal;
  nonFuel: Decimal;
  byCategory: Record<ExpenseCategory, Decimal>;
  count: number;
}

export function expenseTotals(expenses: readonly ExpenseLike[]): ExpenseTotals {
  const byCategory = Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [category, new Decimal(0)]),
  ) as Record<ExpenseCategory, Decimal>;

  let total = new Decimal(0);
  for (const expense of expenses) {
    const amount = toDecimal(expense.amount);
    total = total.plus(amount);
    byCategory[expense.category] = byCategory[expense.category].plus(amount);
  }

  const fuel = byCategory.fuel;
  return { total, fuel, nonFuel: total.minus(fuel), byCategory, count: expenses.length };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetSummary {
  estimated: Decimal;
  spent: Decimal;
  /** Never negative — going over budget is reported by `exceededBy`, not a minus sign. */
  remaining: Decimal;
  exceededBy: Decimal;
  isOverBudget: boolean;
  /** Percentage of the budget used. Null when no budget was set, rather than a division by zero. */
  utilisationPercent: Decimal | null;
}

export function budgetSummary(estimatedBudget: Numeric, totalSpent: Numeric): BudgetSummary {
  const estimated = toDecimal(estimatedBudget);
  const spent = toDecimal(totalSpent);
  const difference = estimated.minus(spent);

  return {
    estimated,
    spent,
    remaining: Decimal.max(0, difference),
    exceededBy: Decimal.max(0, difference.negated()),
    isOverBudget: spent.gt(estimated),
    utilisationPercent: estimated.gt(0) ? spent.dividedBy(estimated).times(100) : null,
  };
}

// ---------------------------------------------------------------------------
// Fuel logs
// ---------------------------------------------------------------------------

export interface FuelLogLike {
  filledOn: string | Date;
  litres: Numeric;
  totalCost: Numeric;
  odometerKm?: Numeric | null;
  isFullTank?: boolean;
}

export interface FuelTotals {
  totalLitres: Decimal;
  totalCost: Decimal;
  count: number;
  averagePricePerLitre: Decimal | null;
}

export function fuelTotals(logs: readonly FuelLogLike[]): FuelTotals {
  let totalLitres = new Decimal(0);
  let totalCost = new Decimal(0);

  for (const log of logs) {
    totalLitres = totalLitres.plus(toDecimal(log.litres));
    totalCost = totalCost.plus(toDecimal(log.totalCost));
  }

  return {
    totalLitres,
    totalCost,
    count: logs.length,
    averagePricePerLitre: totalLitres.gt(0) ? totalCost.dividedBy(totalLitres) : null,
  };
}

export type MileageUnavailableReason =
  | 'needs_two_odometer_readings'
  | 'partial_fills_present'
  | 'odometer_decreased'
  | 'no_distance_covered'
  | 'no_fuel_between_readings';

export interface ActualMileage {
  /** Kilometres per litre, or null when the data cannot honestly support a figure. */
  value: Decimal | null;
  reason: MileageUnavailableReason | null;
  distanceKm: Decimal | null;
  litresUsed: Decimal | null;
  /** Number of odometer-tagged fills the figure is based on. */
  sampleSize: number;
}

const UNAVAILABLE = (reason: MileageUnavailableReason, sampleSize: number): ActualMileage => ({
  value: null,
  reason,
  distanceKm: null,
  litresUsed: null,
  sampleSize,
});

/**
 * Tank-to-tank mileage.
 *
 * LIMITATION — this is only correct if every fill topped the tank up to full.
 * The litres poured in at fill N replace exactly the fuel burned since fill N-1,
 * which is why the first fill's litres are excluded: they fuelled distance
 * covered before the measurement window opened.
 *
 * Rather than return a plausible-but-wrong number, this returns null with a
 * reason whenever the assumption cannot be checked or clearly does not hold.
 */
export function actualMileage(logs: readonly FuelLogLike[]): ActualMileage {
  const withOdometer = logs
    .filter((log) => log.odometerKm !== null && log.odometerKm !== undefined)
    .map((log) => ({
      odometer: toDecimal(log.odometerKm as Numeric),
      litres: toDecimal(log.litres),
      isFullTank: log.isFullTank !== false,
      filledOn: new Date(log.filledOn).getTime(),
    }))
    .sort((a, b) => a.filledOn - b.filledOn || a.odometer.comparedTo(b.odometer));

  const sampleSize = withOdometer.length;
  if (sampleSize < 2) return UNAVAILABLE('needs_two_odometer_readings', sampleSize);
  if (withOdometer.some((log) => !log.isFullTank)) {
    return UNAVAILABLE('partial_fills_present', sampleSize);
  }

  for (let i = 1; i < withOdometer.length; i += 1) {
    if (withOdometer[i]!.odometer.lt(withOdometer[i - 1]!.odometer)) {
      return UNAVAILABLE('odometer_decreased', sampleSize);
    }
  }

  const first = withOdometer[0]!;
  const last = withOdometer[sampleSize - 1]!;
  const distanceKm = last.odometer.minus(first.odometer);
  if (distanceKm.lte(0)) return UNAVAILABLE('no_distance_covered', sampleSize);

  // Exclude the first fill: it predates the measured distance.
  const litresUsed = withOdometer
    .slice(1)
    .reduce((sum, log) => sum.plus(log.litres), new Decimal(0));
  if (litresUsed.lte(0)) return UNAVAILABLE('no_fuel_between_readings', sampleSize);

  return {
    value: distanceKm.dividedBy(litresUsed),
    reason: null,
    distanceKm,
    litresUsed,
    sampleSize,
  };
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface ChecklistItemLike {
  isCompleted: boolean;
}

export interface ChecklistProgress {
  total: number;
  completed: number;
  remaining: number;
  /** 0–100. An empty checklist reads as 0, not 100 — nothing has been packed. */
  percent: number;
  isComplete: boolean;
}

export function checklistProgress(items: readonly ChecklistItemLike[]): ChecklistProgress {
  const total = items.length;
  const completed = items.filter((item) => item.isCompleted).length;

  return {
    total,
    completed,
    remaining: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    isComplete: total > 0 && completed === total,
  };
}
