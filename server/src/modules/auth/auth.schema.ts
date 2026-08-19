import { z } from 'zod';

/**
 * Emails are lowercased and trimmed on the way in. The column is `citext`, so
 * uniqueness is case-insensitive at the database level too — normalising here
 * simply means what is stored matches what the rider typed.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'That email is too long.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.');

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80, 'That name is too long.'),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  // Deliberately not length-checked: an existing account should not be told
  // its own password is "too short" at the login screen.
  password: z.string().min(1, 'Password is required.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
