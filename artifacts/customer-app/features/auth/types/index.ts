/**
 * Auth domain types.
 *
 * AuthStatus represents the full state machine:
 *   initializing            → cold start, restoring persisted session
 *   unauthenticated         → no valid session
 *   authenticated_profile_loading → session present, profile fetch in-flight
 *   authenticated_active    → session + active customer profile ready
 *   authenticated_blocked   → session present but profile.status = 'blocked'
 *   authenticated_profile_error → session present but profile could not be loaded
 */

import type { Database } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// ── Auth state machine ─────────────────────────────────────────────────────────

export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated_profile_loading'
  | 'authenticated_active'
  | 'authenticated_blocked'
  | 'authenticated_profile_error';

// ── Profile — typed from the actual generated Database types ───────────────────
// Using the DB-generated Row type ensures schema drift is caught at compile time.

export type CustomerProfile = Database['public']['Tables']['profiles']['Row'];

// ── Context value ──────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Current state-machine state. */
  status: AuthStatus;
  /** Supabase session. Null when unauthenticated or initializing. */
  session: Session | null;
  /** Supabase Auth user. Null when unauthenticated or initializing. */
  user: User | null;
  /** Customer profile row. Null when unauthenticated, loading, or error. */
  profile: CustomerProfile | null;
  /** Human-readable profile-load error. Null when no error. */
  profileError: string | null;
  /** Sign out the current user. Clears session, profile, and query cache. */
  signOut: () => Promise<void>;
}

// ── Normalized auth error ──────────────────────────────────────────────────────

export interface MappedAuthError {
  /** User-facing message safe to display. No technical details. */
  message: string;
  /** Whether the user can retry the same operation immediately. */
  canRetry: boolean;
  /** Whether the user should be prompted to resend the OTP. */
  shouldResend: boolean;
}
