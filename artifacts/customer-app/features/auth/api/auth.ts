/**
 * Auth API layer.
 *
 * All Supabase auth operations are centralized here.
 * Screens and providers import from this module — never call
 * supabase.auth directly from screen files.
 *
 * Every function returns typed results; errors are already mapped
 * to user-safe strings before returning.
 */

import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { CustomerProfile } from '../types';
import { mapAuthError, mapUnknownError } from '../utils/errors';

// ── OTP request ────────────────────────────────────────────────────────────────

export interface RequestOtpResult {
  error: string | null;
}

/**
 * Request a phone OTP via Supabase Auth.
 *
 * @param normalizedPhone - E.164 format, e.g. "+919876543210"
 */
export async function requestPhoneOtp(normalizedPhone: string): Promise<RequestOtpResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
    if (error) return { error: mapAuthError(error).message };
    return { error: null };
  } catch (err) {
    return { error: mapUnknownError(err) };
  }
}

// ── OTP verification ───────────────────────────────────────────────────────────

export interface VerifyOtpResult {
  error: string | null;
  /** Whether the error suggests the user should request a new OTP. */
  shouldResend: boolean;
}

/**
 * Verify a phone OTP token via Supabase Auth.
 * On success, the Supabase client session is set automatically —
 * the onAuthStateChange listener will receive SIGNED_IN.
 *
 * @param normalizedPhone - E.164 format
 * @param token - The 6-digit OTP from the user
 */
export async function verifyPhoneOtp(
  normalizedPhone: string,
  token: string,
): Promise<VerifyOtpResult> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: 'sms',
    });
    if (error) {
      const mapped = mapAuthError(error);
      return { error: mapped.message, shouldResend: mapped.shouldResend };
    }
    return { error: null, shouldResend: false };
  } catch (err) {
    return { error: mapUnknownError(err), shouldResend: false };
  }
}

// ── Session / user ─────────────────────────────────────────────────────────────

/**
 * Retrieve the current session from Supabase (including persisted sessions).
 * Returns null if no valid session exists.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Retrieve the currently authenticated Supabase user.
 * Returns null when not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// ── Profile ────────────────────────────────────────────────────────────────────

export interface LoadProfileResult {
  profile: CustomerProfile | null;
  error: string | null;
}

/**
 * Load the authenticated customer's profile from public.profiles.
 * RLS on the table ensures only the authenticated user's own row is returned.
 *
 * @param userId - The authenticated Supabase user id (from session).
 *
 * Retry strategy: caller must handle the case where the profile trigger
 * hasn't propagated yet (first sign-in). Use withProfileRetry() for that.
 */
export async function loadProfile(userId: string): Promise<LoadProfileResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Do not expose SQL error details
      return { profile: null, error: 'Unable to load your profile. Please try again.' };
    }

    return { profile: data as CustomerProfile | null, error: null };
  } catch (err) {
    return { profile: null, error: mapUnknownError(err) };
  }
}

/**
 * Load the customer profile with automatic retries.
 * Used immediately after OTP verification, where the database trigger
 * that creates the profile row may not have propagated yet.
 *
 * Retries up to maxAttempts times with exponential-ish backoff.
 */
export async function loadProfileWithRetry(
  userId: string,
  maxAttempts = 4,
  baseDelayMs = 300,
): Promise<LoadProfileResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await loadProfile(userId);

    // Successful load or a real query error — stop retrying.
    if (result.error) return result;
    if (result.profile) return result;

    // Profile not yet created (trigger propagation lag) — wait and retry.
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }

  return {
    profile: null,
    error: 'Account setup is taking longer than expected. Please try again.',
  };
}

// ── Sign out ───────────────────────────────────────────────────────────────────

/**
 * Sign out the current user via Supabase Auth.
 * The onAuthStateChange listener will receive SIGNED_OUT.
 * The provider handles cache and state clearing.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── Temporary Email + Password Auth ───────────────────────────────────────────
//
// TEMPORARY DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.
//
// These operations use real Supabase Auth signInWithPassword / signUp.
// Sessions are shared with the existing Phone OTP session architecture —
// no separate storage, no separate state, no auth bypasses.
//
// The onAuthStateChange listener in AuthProvider handles the resulting
// SIGNED_IN event exactly as it does for Phone OTP sign-in.

export interface EmailSignInResult {
  error: string | null;
}

/**
 * Sign in with real Supabase Email + Password.
 *
 * On success the Supabase client session is set automatically —
 * the onAuthStateChange listener will receive SIGNED_IN.
 * Do NOT manually navigate after calling this; let the existing
 * route-protection hook in _layout.tsx handle the redirect.
 *
 * @param email    - Validated, trimmed, lowercased email address.
 * @param password - User-provided password (never logged or stored).
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<EmailSignInResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error).message };
    return { error: null };
  } catch (err) {
    return { error: mapUnknownError(err) };
  }
}

export interface EmailSignUpResult {
  error: string | null;
  /**
   * True when Supabase created the user but returned no session —
   * typically because email confirmation is required.
   * The caller should prompt the user to check their inbox and switch to Sign In.
   */
  requiresEmailConfirmation: boolean;
}

/**
 * Sign up with real Supabase Email + Password.
 *
 * CASE A — Session returned: AuthProvider processes SIGNED_IN automatically.
 * CASE B — No session: email confirmation is required; caller shows prompt.
 * CASE C — Error: normalized message returned.
 *
 * @param email    - Validated, trimmed, lowercased email address.
 * @param password - User-provided password (never logged or stored).
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
): Promise<EmailSignUpResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: mapAuthError(error).message, requiresEmailConfirmation: false };
    }
    // Supabase returned a user but no session → email confirmation needed.
    if (data.user && !data.session) {
      return { error: null, requiresEmailConfirmation: true };
    }
    // Session returned — AuthProvider's onAuthStateChange handles navigation.
    return { error: null, requiresEmailConfirmation: false };
  } catch (err) {
    return { error: mapUnknownError(err), requiresEmailConfirmation: false };
  }
}

// ── Forgot Password ────────────────────────────────────────────────────────────

export interface ForgotPasswordResult {
  error: string | null;
}

/**
 * Send a password-reset email via Supabase Auth.
 *
 * Supabase always returns a 200 for this endpoint regardless of whether the
 * address is registered (prevents email enumeration). The caller should always
 * show "check your inbox" regardless of outcome.
 *
 * @param email - Validated, trimmed, lowercased email address.
 */
export async function sendPasswordResetEmail(email: string): Promise<ForgotPasswordResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: mapAuthError(error).message };
    return { error: null };
  } catch (err) {
    return { error: mapUnknownError(err) };
  }
}
