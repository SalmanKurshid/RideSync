/** Lifecycle of a trip, from idea to history. */
export const TRIP_STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

/** Spend categories a rider can record against a trip. */
export const EXPENSE_CATEGORIES = [
  'fuel',
  'food',
  'hotel',
  'parking',
  'toll',
  'bike_service',
  'emergency',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Fuel spend is owned by the fuel log, not entered by hand. The API creates the
 * matching `fuel` expense when a fill is logged, so `SUM(expenses.amount)` stays
 * the one true trip total and nothing is counted twice.
 */
export const MANUAL_EXPENSE_CATEGORIES = EXPENSE_CATEGORIES.filter(
  (category): category is Exclude<ExpenseCategory, 'fuel'> => category !== 'fuel',
);

export const CHECKLIST_CATEGORIES = [
  'documents',
  'riding_gear',
  'bike_preparation',
  'electronics',
  'other',
] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

/** Human-facing labels. Kept beside the values so both apps read the same words. */
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Fuel',
  food: 'Food',
  hotel: 'Hotel',
  parking: 'Parking',
  toll: 'Toll',
  bike_service: 'Bike Service',
  emergency: 'Emergency',
  other: 'Other',
};

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documents: 'Documents',
  riding_gear: 'Riding Gear',
  bike_preparation: 'Bike Preparation',
  electronics: 'Electronics',
  other: 'Other',
};

/**
 * Which status changes are allowed. A cancelled or completed trip is history and
 * does not move on its own; reopening is deliberate and goes back to `ongoing`.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  planned: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  completed: ['ongoing'],
  cancelled: ['planned'],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return from === to || ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
