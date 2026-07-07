/**
 * Centralized development feature flags.
 *
 * Each flag is controlled by an Expo public environment variable and defaults
 * to the safest value (disabled) when the variable is absent or unparseable.
 *
 * IMPORTANT: These are UI/product availability flags, NOT security boundaries.
 * They do not weaken RLS, bypass Supabase Auth, or bypass blocked-customer handling.
 * Real Supabase Auth is used for all authentication paths regardless of these flags.
 */

/**
 * TEMPORARY DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.
 *
 * When true, a "Continue with Email" option appears on the Login screen,
 * routing to a real Supabase Email + Password auth flow. Intended solely for
 * development and testing without requiring SMS OTP on every session.
 *
 * Controlled by: EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH
 * Safe default:  false (disabled when variable is absent or not exactly "true")
 *
 * To enable for development: set EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true
 * To disable:                set EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=false (or remove it)
 */
export const ENABLE_TEMPORARY_EMAIL_AUTH: boolean =
  process.env.EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH === 'true';
