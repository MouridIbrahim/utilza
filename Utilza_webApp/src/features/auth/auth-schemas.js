import { z } from 'zod';

// Mirrors backend auth.service schemas exactly. Client validation is
// assistance only — server errors are authoritative.
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email.').max(255),
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email.').max(255),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Use at most 128 characters.'),
});
