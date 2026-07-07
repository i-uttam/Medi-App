/**
 * Centralized Supabase Auth error mapping.
 *
 * Maps known error codes and message patterns to user-safe strings.
 * Never exposes JWT details, SQL errors, table names, or stack traces.
 *
 * Strategy:
 *  1. Check structured error codes/status first (preferred — stable across locales).
 *  2. Fall back to normalized message substring matching.
 *  3. Fall back to a safe generic message.
 */

import type { AuthError } from '@supabase/supabase-js';
import type { MappedAuthError } from '../types';

// ── Known error patterns ───────────────────────────────────────────────────────

interface ErrorPattern {
  test: (err: AuthError) => boolean;
  result: MappedAuthError;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Rate limited — OTP request
  {
    test: (e) =>
      e.status === 429 ||
      /rate.limit|too many/i.test(e.message),
    result: {
      message: 'Too many requests. Please wait a moment before trying again.',
      canRetry: false,
      shouldResend: false,
    },
  },

  // Invalid / expired OTP
  {
    test: (e) =>
      /invalid.*token|token.*invalid|invalid.*otp|otp.*invalid/i.test(e.message) ||
      e.status === 422,
    result: {
      message: 'Incorrect verification code. Please check and try again.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // OTP expired
  {
    test: (e) => /otp.*(expired|invalid)|expired.*otp/i.test(e.message),
    result: {
      message: 'Your verification code has expired. Please request a new one.',
      canRetry: false,
      shouldResend: true,
    },
  },

  // Phone number invalid / not supported
  {
    test: (e) =>
      /invalid.*phone|phone.*invalid|phone.*not.*supported/i.test(e.message),
    result: {
      message: 'This phone number is not valid. Please check and try again.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // SMS send failure (carrier / provider issue)
  {
    test: (e) =>
      /sms.*fail|fail.*sms|unable.*send|send.*fail/i.test(e.message),
    result: {
      message: 'Unable to send verification code. Please try again shortly.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // Session expired / refresh failed
  {
    test: (e) =>
      /session.*expired|refresh.*token|token.*refresh|invalid.*refresh/i.test(e.message),
    result: {
      message: 'Your session has expired. Please sign in again.',
      canRetry: false,
      shouldResend: false,
    },
  },

  // Network errors
  {
    test: (e) =>
      /network|fetch|connect|offline|internet/i.test(e.message),
    result: {
      message: 'Network error. Please check your connection and try again.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // User not found
  {
    test: (e) =>
      /user.*not.*found|not.*found.*user/i.test(e.message) ||
      e.status === 404,
    result: {
      message: 'Account not found. Please check your phone number.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // ── Email + Password error patterns (temporary dev feature) ────────────────

  // Invalid login credentials (wrong email or password)
  {
    test: (e) =>
      /invalid.*login.*credential|invalid.*credential|invalid.*password|wrong.*password/i.test(e.message) ||
      /email.*not.*found|user.*not.*found|no.*user.*found/i.test(e.message),
    result: {
      message: 'Incorrect email or password.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // Email not confirmed
  {
    test: (e) =>
      /email.*not.*confirm|confirm.*email|email.*confirm/i.test(e.message),
    result: {
      message: 'Please confirm your email address before signing in.',
      canRetry: false,
      shouldResend: false,
    },
  },

  // Email already registered
  {
    test: (e) =>
      /user.*already.*register|already.*register|email.*already|duplicate.*user/i.test(e.message),
    result: {
      message: 'An account with this email already exists. Try signing in instead.',
      canRetry: false,
      shouldResend: false,
    },
  },

  // Invalid email format (server-side)
  {
    test: (e) =>
      /invalid.*email|email.*invalid|unable.*validate.*email/i.test(e.message),
    result: {
      message: 'Enter a valid email address.',
      canRetry: true,
      shouldResend: false,
    },
  },

  // Weak password (server-side)
  {
    test: (e) =>
      /password.*weak|weak.*password|password.*too.*short|password.*length/i.test(e.message),
    result: {
      message: 'Password is too weak. Use at least 8 characters.',
      canRetry: true,
      shouldResend: false,
    },
  },
];

// ── Public API ─────────────────────────────────────────────────────────────────

/** Generic fallback — safe for any unknown error. */
const GENERIC_ERROR: MappedAuthError = {
  message: 'Something went wrong. Please try again.',
  canRetry: true,
  shouldResend: false,
};

/**
 * Map a Supabase AuthError to a user-safe MappedAuthError.
 */
export function mapAuthError(error: AuthError): MappedAuthError {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(error)) return pattern.result;
  }
  return GENERIC_ERROR;
}

/**
 * Map any unknown thrown value to a user-safe message string.
 * Use this as a catch-all in try/catch blocks.
 */
export function mapUnknownError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: string; status?: number };
    const mapped = mapAuthError(err as AuthError);
    return mapped.message;
  }
  return GENERIC_ERROR.message;
}
