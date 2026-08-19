import { describe, expect, it } from 'vitest';
import {
  actualMileage,
  budgetSummary,
  checklistProgress,
  estimateTripFuel,
  estimatedFuelLitres,
  expenseTotals,
  fuelTotals,
  money,
  roundMoney,
} from './calc.js';

describe('fuel estimation', () => {
  it('matches the worked example from the brief', () => {
    const estimate = estimateTripFuel({
      distanceKm: 1000,
      mileageKmpl: 30,
      pricePerLitre: 100,
    });

    expect(estimate.litres.toFixed(3)).toBe('33.333');
    expect(money(estimate.cost)).toBe('3333.33');
  });

  it('does not round the litres before multiplying by price', () => {
    const exact = estimateTripFuel({ distanceKm: 1000, mileageKmpl: 30, pricePerLitre: 100 });
    // Rounding litres to 2dp first would give 33.33 x 100 = 3333.00 — a 33 paise drift.
    const prematurelyRounded = roundMoney(33.33).times(100);

    expect(money(exact.cost)).toBe('3333.33');
    expect(money(prematurelyRounded)).toBe('3333.00');
  });

  it('handles repeating decimals without float drift', () => {
    const estimate = estimateTripFuel({ distanceKm: 100, mileageKmpl: 3, pricePerLitre: 3 });
    expect(money(estimate.cost)).toBe('100.00');
  });

  it('refuses a mileage of zero rather than returning Infinity', () => {
    expect(() => estimatedFuelLitres(100, 0)).toThrow(RangeError);
  });

  it('copes with very large trips', () => {
    const estimate = estimateTripFuel({
      distanceKm: 999_999,
      mileageKmpl: 30,
      pricePerLitre: 120.55,
    });
    expect(money(estimate.cost)).toBe('4018329.32'); // 33333.3 x 120.55 = 4018329.315
  });
});

describe('expense totals', () => {
  const expenses = [
    { category: 'fuel' as const, amount: '800.50' },
    { category: 'food' as const, amount: '250.25' },
    { category: 'hotel' as const, amount: '1500' },
    { category: 'toll' as const, amount: '75.75' },
  ];

  it('splits fuel from everything else', () => {
    const totals = expenseTotals(expenses);
    expect(money(totals.total)).toBe('2626.50');
    expect(money(totals.fuel)).toBe('800.50');
    expect(money(totals.nonFuel)).toBe('1826.00');
  });

  it('adds decimals exactly', () => {
    const totals = expenseTotals([
      { category: 'food' as const, amount: '0.1' },
      { category: 'food' as const, amount: '0.2' },
    ]);
    // 0.1 + 0.2 !== 0.3 in floating point. It does here.
    expect(totals.total.toString()).toBe('0.3');
  });

  it('returns zeroed categories for an empty trip', () => {
    const totals = expenseTotals([]);
    expect(money(totals.total)).toBe('0.00');
    expect(money(totals.byCategory.hotel)).toBe('0.00');
    expect(totals.count).toBe(0);
  });
});

describe('budget summary', () => {
  it('reports headroom when under budget', () => {
    const summary = budgetSummary(5000, 3000);
    expect(money(summary.remaining)).toBe('2000.00');
    expect(money(summary.exceededBy)).toBe('0.00');
    expect(summary.isOverBudget).toBe(false);
  });

  it('never reports a negative remaining balance', () => {
    const summary = budgetSummary(5000, 5500);
    expect(money(summary.remaining)).toBe('0.00');
    expect(money(summary.exceededBy)).toBe('500.00');
    expect(summary.isOverBudget).toBe(true);
  });

  it('treats spending exactly the budget as not exceeded', () => {
    const summary = budgetSummary(5000, 5000);
    expect(summary.isOverBudget).toBe(false);
    expect(money(summary.remaining)).toBe('0.00');
    expect(money(summary.exceededBy)).toBe('0.00');
  });

  it('returns null utilisation instead of dividing by zero', () => {
    expect(budgetSummary(0, 100).utilisationPercent).toBeNull();
  });
});

describe('fuel totals', () => {
  it('sums litres and cost and derives an average price', () => {
    const totals = fuelTotals([
      { filledOn: '2026-03-01', litres: '10.5', totalCost: '1050' },
      { filledOn: '2026-03-02', litres: '9.5', totalCost: '950' },
    ]);
    expect(totals.totalLitres.toString()).toBe('20');
    expect(money(totals.totalCost)).toBe('2000.00');
    expect(money(totals.averagePricePerLitre!)).toBe('100.00');
  });

  it('has no average price with no fills', () => {
    expect(fuelTotals([]).averagePricePerLitre).toBeNull();
  });
});

describe('actual mileage', () => {
  it('measures tank to tank, excluding the first fill', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '1000' },
      { filledOn: '2026-03-02', litres: '10', totalCost: '1000', odometerKm: '1300' },
      { filledOn: '2026-03-03', litres: '10', totalCost: '1000', odometerKm: '1600' },
    ]);
    // 600 km covered on the 20 litres poured in after the opening fill.
    expect(result.value!.toFixed(2)).toBe('30.00');
    expect(result.distanceKm!.toString()).toBe('600');
    expect(result.litresUsed!.toString()).toBe('20');
    expect(result.reason).toBeNull();
  });

  it('declines to guess from a single reading', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '1000' },
    ]);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('needs_two_odometer_readings');
  });

  it('ignores fills with no odometer reading', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: null },
      { filledOn: '2026-03-02', litres: '10', totalCost: '1000' },
    ]);
    expect(result.reason).toBe('needs_two_odometer_readings');
    expect(result.sampleSize).toBe(0);
  });

  it('refuses to compute when any fill was partial', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '1000' },
      { filledOn: '2026-03-02', litres: '5', totalCost: '500', odometerKm: '1300', isFullTank: false },
    ]);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('partial_fills_present');
  });

  it('flags an odometer that goes backwards', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '2000' },
      { filledOn: '2026-03-02', litres: '10', totalCost: '1000', odometerKm: '1500' },
    ]);
    expect(result.reason).toBe('odometer_decreased');
  });

  it('rejects two fills at the same odometer reading', () => {
    const result = actualMileage([
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '1000' },
      { filledOn: '2026-03-02', litres: '10', totalCost: '1000', odometerKm: '1000' },
    ]);
    expect(result.reason).toBe('no_distance_covered');
  });

  it('orders by fill date, not by input order', () => {
    const result = actualMileage([
      { filledOn: '2026-03-03', litres: '10', totalCost: '1000', odometerKm: '1600' },
      { filledOn: '2026-03-01', litres: '13', totalCost: '1300', odometerKm: '1000' },
    ]);
    expect(result.distanceKm!.toString()).toBe('600');
    expect(result.litresUsed!.toString()).toBe('10');
  });
});

describe('checklist progress', () => {
  it('counts completed items', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({ isCompleted: index < 18 }));
    const progress = checklistProgress(items);
    expect(progress.completed).toBe(18);
    expect(progress.total).toBe(25);
    expect(progress.percent).toBe(72);
    expect(progress.isComplete).toBe(false);
  });

  it('treats an empty checklist as nothing packed, not everything', () => {
    const progress = checklistProgress([]);
    expect(progress.percent).toBe(0);
    expect(progress.isComplete).toBe(false);
  });

  it('marks a fully ticked list complete', () => {
    const progress = checklistProgress([{ isCompleted: true }, { isCompleted: true }]);
    expect(progress.percent).toBe(100);
    expect(progress.isComplete).toBe(true);
  });
});
