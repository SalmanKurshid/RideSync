import type { ChecklistCategory, ExpenseCategory, TripStatus } from './enums.js';

/**
 * Wire types — what the API actually sends.
 *
 * Every decimal crosses the network as a string. JSON numbers are IEEE doubles,
 * and pushing money through one is how totals start disagreeing with their own
 * line items. The client parses these for display.
 */
export type DecimalString = string;
/** Calendar date, `YYYY-MM-DD`. A trip starts on a day, not at an instant. */
export type DateString = string;
export type IsoDateTime = string;

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: IsoDateTime;
}

export interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  engineCc: number;
  mileageKmpl: DecimalString;
  tankLitres: DecimalString;
  odometerKm: DecimalString;
  isDefault: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Trip {
  id: string;
  bikeId: string;
  bike?: Pick<Bike, 'id' | 'name' | 'brand' | 'model'>;
  name: string;
  startLocation: string;
  destination: string;
  startDate: DateString;
  endDate: DateString | null;
  status: TripStatus;
  estDistanceKm: DecimalString;
  /** Snapshot taken from the bike at creation, then editable. See estimate below. */
  estMileageKmpl: DecimalString;
  estFuelPrice: DecimalString;
  estBudget: DecimalString;
  estimate: TripEstimate;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TripEstimate {
  fuelLitres: DecimalString;
  fuelCost: DecimalString;
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  amount: DecimalString;
  spentOn: DateString;
  description: string | null;
  location: string | null;
  /** Set when this row was created by a fuel fill; such rows are not hand-editable. */
  fuelLogId: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface FuelLog {
  id: string;
  tripId: string;
  filledOn: DateString;
  litres: DecimalString;
  pricePerLitre: DecimalString;
  totalCost: DecimalString;
  odometerKm: DecimalString | null;
  isFullTank: boolean;
  location: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ChecklistItem {
  id: string;
  tripId: string;
  category: ChecklistCategory;
  title: string;
  isCompleted: boolean;
  completedAt: IsoDateTime | null;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface TripDashboard {
  trip: Trip;
  budget: {
    estimated: DecimalString;
    spent: DecimalString;
    remaining: DecimalString;
    exceededBy: DecimalString;
    isOverBudget: boolean;
    utilisationPercent: number | null;
  };
  fuel: {
    estimatedLitres: DecimalString;
    estimatedCost: DecimalString;
    actualLitres: DecimalString;
    actualCost: DecimalString;
    fillCount: number;
    averagePricePerLitre: DecimalString | null;
    /** Null when the data cannot support an honest figure — `mileageNote` says why. */
    actualMileageKmpl: DecimalString | null;
    mileageNote: string | null;
  };
  expenses: {
    total: DecimalString;
    fuel: DecimalString;
    nonFuel: DecimalString;
    count: number;
    byCategory: Array<{
      category: ExpenseCategory;
      amount: DecimalString;
      percentOfTotal: number;
    }>;
  };
  checklist: {
    total: number;
    completed: number;
    remaining: number;
    percent: number;
    byCategory: Array<{
      category: ChecklistCategory;
      total: number;
      completed: number;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface BikeInput {
  name: string;
  brand: string;
  model: string;
  engineCc: number;
  mileageKmpl: number | string;
  tankLitres: number | string;
  odometerKm: number | string;
  isDefault?: boolean;
}

export interface TripInput {
  bikeId: string;
  name: string;
  startLocation: string;
  destination: string;
  startDate: DateString;
  endDate?: DateString | null;
  estDistanceKm: number | string;
  /** Optional — defaults to the selected bike's mileage at the moment of creation. */
  estMileageKmpl?: number | string;
  estFuelPrice: number | string;
  estBudget: number | string;
  seedDefaultChecklist?: boolean;
}

export interface ExpenseInput {
  category: Exclude<ExpenseCategory, 'fuel'>;
  amount: number | string;
  spentOn: DateString;
  description?: string | null;
  location?: string | null;
}

export interface FuelLogInput {
  filledOn: DateString;
  litres: number | string;
  pricePerLitre: number | string;
  /** Optional — defaults to litres × pricePerLitre when the rider does not override it. */
  totalCost?: number | string | null;
  odometerKm?: number | string | null;
  isFullTank?: boolean;
  location?: string | null;
}

export interface ChecklistItemInput {
  category: ChecklistCategory;
  title: string;
  sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'INTERNAL';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level messages, keyed by form control path. */
    details?: Record<string, string[]>;
  };
}
