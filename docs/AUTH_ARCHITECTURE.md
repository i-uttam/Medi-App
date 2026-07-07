# Authentication Architecture — MediGo Customer App

## Overview

The customer mobile application uses **Supabase Auth** (phone OTP via SMS) as the sole authentication system. Supabase Auth is the single source of truth for the session. The Express API server is a separate service; it does not participate in mobile auth.

---

## Credentials Used

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

The service role key, database password, and Supabase access token are never used in the mobile runtime.

---

## Auth State Machine

```
cold start
    │
    ▼
[initializing]
    │
    ├── no session ──────────────────────────────► [unauthenticated]
    │                                                     │ login + OTP
    └── session restored                                  │
            │                                             │
            ▼                                             │
[authenticated_profile_loading] ◄────────────────────────┘
            │
            ├── profile.status = active ──────► [authenticated_active]
            ├── profile.status = blocked ─────► [authenticated_blocked]
            ├── profile not found (timeout) ──► [authenticated_profile_error]
            └── query error ─────────────────► [authenticated_profile_error]
```

States:

| Status | Meaning |
|---|---|
| `initializing` | Cold start; restoring persisted session |
| `unauthenticated` | No valid session present |
| `authenticated_profile_loading` | Session present; profile fetch in-flight |
| `authenticated_active` | Session + active profile ready |
| `authenticated_blocked` | Session present; profile.status = 'blocked' |
| `authenticated_profile_error` | Session present; profile could not be loaded |

---

## Supabase Session Ownership

- The Supabase client is configured with `persistSession: true` using AsyncStorage.
- `autoRefreshToken: true` handles silent token renewal.
- `detectSessionInUrl: false` (not applicable for React Native deep-links in this context).
- AppState integration pauses auto-refresh when the app is backgrounded and resumes it when active.
- **Never manually write Supabase session tokens to storage.**
- **Never manually decode JWTs to decide authentication status.**

---

## Supabase Client Configuration

```typescript
createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

One shared singleton instance: `lib/supabase.ts`.

---

## Route Protection Strategy

Route protection is centralized in `app/_layout.tsx` via `useRouteProtection()`:

| Auth Status | Routing Behaviour |
|---|---|
| `initializing` / `profile_loading` | Show `InitializingScreen` overlay; no redirect |
| `unauthenticated` | Redirect to `/(auth)/login` if not already there |
| `authenticated_active` | Redirect away from auth screens to `/(tabs)` |
| `authenticated_blocked` | Redirect to `/(auth)/blocked` (replace — no Back) |
| `authenticated_profile_error` | Redirect to `/(auth)/login` for clean retry |

All navigations during auth transitions use `router.replace()` so auth screens are not in the back stack after login, and commerce screens are not reachable after logout via the Back button.

---

## OTP Flow

```
User enters 10-digit number (UI shows +91 prefix)
    │
    ▼
normalizeIndianPhone(raw) → "+91XXXXXXXXXX"
    │
    ▼
supabase.auth.signInWithOtp({ phone: normalized })
    │
    ├── error ──► remain on login, show mapped error
    │
    └── success ──► navigate to /(auth)/verify-otp
                        │
                        ▼
                    User enters 6-digit OTP
                        │
                        ▼
                    supabase.auth.verifyOtp({ phone, token, type: 'sms' })
                        │
                        ├── error ──► show mapped error; resend if expired
                        │
                        └── success ──► onAuthStateChange fires SIGNED_IN
                                            → fetchAndApplyProfile()
                                            → route protection navigates to /(tabs)
```

OTP is held **only in component state**. It is never:
- Stored in AsyncStorage, SecureStore, or Zustand persisted store
- Written to a database
- Passed in route state
- Logged or sent to analytics

---

## Profile Synchronization

The database has a trigger (`handle_new_user`) that creates a `profiles` row when a new user is created in `auth.users`. This trigger is the source of the initial profile row.

| Field | Source of Truth |
|---|---|
| `id` | `auth.users.id` (set by trigger) |
| `phone` | `auth.users.phone` (mirrored by trigger) |
| `email` | `profiles.email` (optional, independent) |
| `full_name` | `profiles.full_name` (user-editable) |
| `status` | Admin-managed; default `active` |

The mobile client does **not** create profile rows. It does **not** change the phone field through a normal profile update. Phone changes require a secure re-verification flow (not yet implemented).

On first sign-in, the trigger may not have propagated by the time the client queries. `loadProfileWithRetry()` retries up to 4 times with backoff.

---

## Blocked Customer Behaviour

When `profile.status = 'blocked'`:

1. Auth status transitions to `authenticated_blocked`.
2. Route protection redirects to `/(auth)/blocked` (replace — no Back).
3. The blocked screen shows a human-readable restriction message.
4. Only the blocked screen and logout are accessible.
5. The Back button cannot reach commerce routes.

The UI layer is an additional defence. The backend (RLS + SECURITY DEFINER RPCs) already prevents blocked users from performing commerce mutations.

---

## Logout Flow

```
User taps Log Out → confirmation dialog
    │
    ▼
signOut() → supabase.auth.signOut()
    │
    ▼
onAuthStateChange fires SIGNED_OUT
    │
    ▼
clearUserScopedState():
  - queryClient.clear()    (removes all cached query data — prevents User A data leaking to User B)
  - clearCart()            (clears Zustand-persisted cart)
  - session = null
  - user = null
  - profile = null
    │
    ▼
status → 'unauthenticated'
    │
    ▼
Route protection → router.replace('/(auth)/login')
```

`supabase.auth.signOut()` also removes the persisted session from AsyncStorage.

---

## Session Expiration

If token refresh fails (network failure after long background, token revoked):

- Supabase fires `SIGNED_OUT` on the auth state change listener.
- `clearUserScopedState()` runs identically to a manual logout.
- Status transitions to `unauthenticated`.
- Route protection navigates to login.
- The user sees the login screen without an infinite loading state.

---

## TanStack Query Auth Integration

- All authenticated queries must use `enabled: !!user` to prevent execution before auth is ready.
- On logout, `queryClient.clear()` removes all cached entries.
- On user change (different user on same device), the cache is also cleared — User A's data does not reappear for User B.
- Query keys should include the user id to namespace per-user cache entries.

---

## AppState Token Refresh

```typescript
AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

- One listener registered in `AuthProvider` on mount.
- Cleaned up on unmount.
- Prevents redundant token refresh calls when the app is backgrounded.

---

## Account Deletion Boundary

Account deletion is **not implemented** in this version.

- The Delete Account UI is visible.
- Tapping it shows a clear unavailable-state message.
- It does **not** call DELETE on the profiles table.
- It does **not** expose service_role.
- It does **not** fake deletion.

A future implementation must:
1. Re-verify user identity (OTP confirmation).
2. Call a server-side API (Express or Supabase Edge Function) using service_role.
3. Soft-delete the profile, revoke all sessions, schedule data purge.

---

## Temporary Email + Password Authentication (Development Only)

> **TEMPORARY DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.**
>
> See `docs/TEMPORARY_EMAIL_AUTH.md` for the full specification, removal checklist, and Supabase Dashboard configuration requirements.

When `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true`, a "Continue with Email" option appears on the Login screen. This routes to `/(auth)/email-auth`, which uses real `supabase.auth.signInWithPassword` / `supabase.auth.signUp`.

Email + Password sessions share **all** existing architecture:
- Same `AuthProvider` state machine and `onAuthStateChange` listener.
- Same `AsyncStorage`-backed session persistence and `autoRefreshToken`.
- Same `useRouteProtection` hook — no special bypass for email users.
- Same blocked-customer detection, profile loading, logout, and cache clearing.

The `handle_new_auth_user` DB trigger handles email-only users correctly (`profiles.phone` is nullable; `NULL` is stored for email users — no migration required).

When the flag is `false` (the default), the email-auth route redirects to Login automatically. Phone OTP authentication is unaffected by this flag.

---

## Security Constraints

- No service_role key in mobile runtime.
- No SUPABASE_ACCESS_TOKEN in mobile runtime.
- No hardcoded OTPs, user IDs, or sessions.
- No manual JWT decoding for auth decisions.
- No auth bypass routes.
- RLS enforces data ownership server-side independent of client-side checks.
- Blocked users cannot perform commerce mutations even if UI is bypassed (RLS + SECURITY DEFINER RPCs).
