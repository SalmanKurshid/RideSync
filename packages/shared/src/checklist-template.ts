import type { ChecklistCategory } from './enums.js';

export interface ChecklistTemplateItem {
  category: ChecklistCategory;
  title: string;
}

/**
 * Seeded onto every new trip unless the rider opts out. Kept on the server so
 * the same starting point applies however the trip was created.
 */
export const DEFAULT_CHECKLIST: readonly ChecklistTemplateItem[] = [
  { category: 'documents', title: 'Driving License' },
  { category: 'documents', title: 'Registration Certificate (RC)' },
  { category: 'documents', title: 'Insurance' },
  { category: 'documents', title: 'PUC Certificate' },

  { category: 'riding_gear', title: 'Helmet' },
  { category: 'riding_gear', title: 'Riding Gloves' },
  { category: 'riding_gear', title: 'Riding Jacket' },
  { category: 'riding_gear', title: 'Riding Boots' },
  { category: 'riding_gear', title: 'Rain Gear' },

  { category: 'bike_preparation', title: 'Chain Cleaned & Lubed' },
  { category: 'bike_preparation', title: 'Tyre Pressure Checked' },
  { category: 'bike_preparation', title: 'Engine Oil Level' },
  { category: 'bike_preparation', title: 'Brakes Checked' },
  { category: 'bike_preparation', title: 'Lights & Indicators' },
  { category: 'bike_preparation', title: 'Tool Kit & Puncture Repair' },

  { category: 'electronics', title: 'Phone Mount' },
  { category: 'electronics', title: 'Charger & Cable' },
  { category: 'electronics', title: 'Power Bank' },
  { category: 'electronics', title: 'Action Camera' },
  { category: 'electronics', title: 'Memory Card' },
] as const;
