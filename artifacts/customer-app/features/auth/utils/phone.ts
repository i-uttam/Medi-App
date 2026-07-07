/**
 * Indian phone number normalization.
 *
 * The login UI shows a fixed +91 prefix; the user enters only the 10-digit
 * mobile number. This utility normalizes raw input to E.164 (+91XXXXXXXXXX)
 * before sending to Supabase Auth.
 *
 * Rules:
 *  - Strips whitespace, hyphens, and visual separators.
 *  - Handles an already-entered +91 or 91 prefix safely.
 *  - Rejects non-digit characters (after stripping allowed separators).
 *  - Rejects values that don't resolve to exactly 10 digits after prefix removal.
 *  - Does NOT silently transform arbitrary international numbers.
 */

import { z } from 'zod';

const INDIA_COUNTRY_CODE = '91';
const MOBILE_DIGIT_COUNT = 10;

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Strip visual separators (spaces, hyphens, parentheses) only.
 * Leaves digits and the leading + intact.
 */
function stripSeparators(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

/**
 * Strip the country prefix (+91 or 91) from a digit string, but ONLY when
 * the remaining digits form a valid 10-digit Indian mobile number.
 * Returns null if the prefix logic is ambiguous or the result is not 10 digits.
 */
function extractTenDigits(stripped: string): string | null {
  // Already 10 digits — treat as bare number.
  if (/^\d{10}$/.test(stripped)) return stripped;

  // +91XXXXXXXXXX — 13 chars, starts with +91
  if (/^\+91\d{10}$/.test(stripped)) return stripped.slice(3);

  // 91XXXXXXXXXX — 12 digits starting with 91
  if (/^91\d{10}$/.test(stripped)) return stripped.slice(2);

  return null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface PhoneNormalizationResult {
  normalized: string | null;
  /** Error message suitable for display. Null when normalization succeeded. */
  error: string | null;
}

/**
 * Normalize a raw phone input to E.164 (+91XXXXXXXXXX).
 *
 * @param raw - What the user typed (10 digits, or with +91 / 91 prefix).
 * @returns Normalized E.164 phone or an error message.
 */
export function normalizeIndianPhone(raw: string): PhoneNormalizationResult {
  if (!raw || raw.trim() === '') {
    return { normalized: null, error: 'Phone number is required.' };
  }

  const stripped = stripSeparators(raw.trim());

  // Reject non-digit characters after stripping separators (excluding leading +)
  const digitPart = stripped.startsWith('+') ? stripped.slice(1) : stripped;
  if (/[^\d]/.test(digitPart)) {
    return { normalized: null, error: 'Phone number must contain digits only.' };
  }

  const tenDigits = extractTenDigits(stripped);

  if (!tenDigits) {
    if (stripped.length < MOBILE_DIGIT_COUNT) {
      return { normalized: null, error: 'Phone number is too short. Enter a 10-digit Indian mobile number.' };
    }
    return { normalized: null, error: 'Invalid phone number. Enter a 10-digit Indian mobile number.' };
  }

  // Indian mobile numbers start with 6–9
  if (!/^[6-9]/.test(tenDigits)) {
    return { normalized: null, error: 'Enter a valid Indian mobile number (starts with 6, 7, 8, or 9).' };
  }

  return {
    normalized: `+${INDIA_COUNTRY_CODE}${tenDigits}`,
    error: null,
  };
}

// ── Zod schema for login form validation ──────────────────────────────────────

/**
 * Validates the raw 10-digit field the user types (without the +91 prefix).
 * Use this with react-hook-form + zodResolver.
 */
export const indianPhoneSchema = z
  .string()
  .min(1, 'Phone number is required.')
  .regex(/^\d+$/, 'Phone number must contain digits only.')
  .length(MOBILE_DIGIT_COUNT, 'Enter a 10-digit Indian mobile number.')
  .refine((v) => /^[6-9]/.test(v), {
    message: 'Enter a valid Indian mobile number (starts with 6, 7, 8, or 9).',
  });

// ── Formatting helpers ─────────────────────────────────────────────────────────

/**
 * Format a normalized E.164 number for masked display on the OTP screen.
 * e.g. "+919876543210" → "+91 98765XXXXX"
 */
export function maskPhone(normalized: string): string {
  if (!normalized.startsWith('+91') || normalized.length !== 13) return normalized;
  const digits = normalized.slice(3);
  return `+91 ${digits.slice(0, 5)}XXXXX`;
}
