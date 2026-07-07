/**
 * Zod schemas for temporary Email + Password authentication.
 *
 * TEMPORARY DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.
 *
 * Separate schemas for Sign In and Sign Up so Sign In never rejects a
 * valid existing password simply because it doesn't meet new Sign Up
 * strength rules.
 *
 * Rules:
 *  - Email: trimmed, lowercased, valid format. No domain invention.
 *  - Sign In password: required, non-empty. No strength check (user may
 *    have an older password that pre-dates the Sign Up policy).
 *  - Sign Up password: minimum 8 characters.
 *  - Sign Up confirm password: must match password.
 */

import { z } from 'zod';

// ── Shared email field ─────────────────────────────────────────────────────────

const emailField = z
  .string()
  .min(1, 'Email is required.')
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().email('Enter a valid email address.'));

// ── Sign In ────────────────────────────────────────────────────────────────────

export const emailSignInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required.'),
});

export type EmailSignInValues = z.infer<typeof emailSignInSchema>;

// ── Sign Up ────────────────────────────────────────────────────────────────────

export const emailSignUpSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;
