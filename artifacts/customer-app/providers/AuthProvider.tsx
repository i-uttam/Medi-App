/**
 * AuthProvider — central authentication state machine.
 *
 * Manages:
 *  - Supabase session (source of truth for auth)
 *  - Authenticated user
 *  - Customer profile (from public.profiles)
 *  - Auth initialization sequence
 *  - Auth state change subscription (onAuthStateChange)
 *  - AppState integration for token auto-refresh
 *  - Logout coordination (Supabase + query cache + Zustand)
 *
 * Auth status machine:
 *  initializing → unauthenticated
 *                         ↑
 *  initializing → authenticated_profile_loading → authenticated_active
 *                                               → authenticated_blocked
 *                                               → authenticated_profile_error
 *
 * Supabase Auth is the single source of truth for the session.
 * Do NOT store session tokens in Zustand or any other store.
 */

import { queryClient } from '@/lib/queryClient';
import { useCartStore } from '@/stores/cart';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  loadProfileWithRetry,
  signOut as supabaseSignOut,
  loadProfile,
} from '@/features/auth/api/auth';
import type { AuthContextValue, AuthStatus, CustomerProfile } from '@/features/auth/types';

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Guard against concurrent profile fetches
  const profileFetchingRef = useRef(false);
  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  const clearCart = useCartStore((s) => s.clearCart);

  // ── Profile loading ──────────────────────────────────────────────────────────

  /**
   * Load the customer profile and transition to the appropriate status.
   * Uses retry logic for first-time sign-in (trigger propagation lag).
   */
  const fetchAndApplyProfile = useCallback(
    async (userId: string, useRetry: boolean) => {
      if (!mountedRef.current) return;
      if (profileFetchingRef.current) return;

      profileFetchingRef.current = true;
      setStatus('authenticated_profile_loading');
      setProfile(null);
      setProfileError(null);

      try {
        const result = useRetry
          ? await loadProfileWithRetry(userId)
          : await loadProfile(userId);

        if (!mountedRef.current) return;

        if (result.error) {
          setProfileError(result.error);
          setStatus('authenticated_profile_error');
          return;
        }

        if (!result.profile) {
          setProfileError('Account setup is still in progress. Please try again.');
          setStatus('authenticated_profile_error');
          return;
        }

        setProfile(result.profile);

        if (result.profile.status === 'blocked') {
          setStatus('authenticated_blocked');
        } else if (result.profile.status === 'deleted') {
          // Deleted users are signed out — treat as unauthenticated
          await supabaseSignOut();
        } else {
          setStatus('authenticated_active');
        }
      } finally {
        profileFetchingRef.current = false;
      }
    },
    [],
  );

  // ── Logout ───────────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
    // The onAuthStateChange SIGNED_OUT handler will clear state.
    // queryClient and cart are cleared there to ensure it happens
    // regardless of how sign-out was triggered (e.g. session expiry).
  }, []);

  const clearUserScopedState = useCallback(() => {
    // Clear all user-scoped TanStack Query cache entries.
    // This prevents User A's data from leaking to User B on the same device.
    queryClient.clear();
    // Clear locally persisted cart state.
    clearCart();
    // Reset auth state.
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError(null);
  }, [clearCart]);

  // ── AppState integration for token auto-refresh ───────────────────────────────

  useEffect(() => {
    // Immediately start auto-refresh if the app is already active on mount.
    // Without this, auto-refresh won't begin until the first AppState change event.
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    // Pause/resume auto-refresh as the app moves between foreground and background.
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // ── Auth state change subscription ────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to auth state changes first to avoid missing events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mountedRef.current) return;

        switch (event) {
          case 'INITIAL_SESSION':
            if (newSession?.user) {
              setSession(newSession);
              setUser(newSession.user);
              // Session restored from storage — use normal load (no retry needed).
              await fetchAndApplyProfile(newSession.user.id, false);
            } else {
              setStatus('unauthenticated');
            }
            break;

          case 'SIGNED_IN':
            if (newSession?.user) {
              setSession(newSession);
              setUser(newSession.user);
              // Fresh sign-in — profile trigger may not have propagated yet.
              await fetchAndApplyProfile(newSession.user.id, true);
            }
            break;

          case 'SIGNED_OUT':
            clearUserScopedState();
            setStatus('unauthenticated');
            break;

          case 'TOKEN_REFRESHED':
            if (newSession) {
              setSession(newSession);
              // Don't reload profile on token refresh — it hasn't changed.
            }
            break;

          case 'USER_UPDATED':
            if (newSession?.user) {
              setSession(newSession);
              setUser(newSession.user);
              // User metadata changed — reload profile to pick up any changes.
              await fetchAndApplyProfile(newSession.user.id, false);
            }
            break;

          default:
            break;
        }
      },
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchAndApplyProfile, clearUserScopedState]);

  // ── Context value ─────────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    status,
    session,
    user,
    profile,
    profileError,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * Access auth state from any screen or component.
 * Must be used within <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
