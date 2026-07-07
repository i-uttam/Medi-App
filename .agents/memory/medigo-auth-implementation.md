---
name: MediGo Auth Implementation (Step 5)
description: Decisions, patterns, and constraints from implementing Supabase phone OTP auth in the customer mobile app.
---

## Architecture decisions

- **AuthProvider** (React Context, not Zustand) owns the session. Supabase Auth is the single source of truth. Zustand is only for non-sensitive UI state (cart).
- **queryClient** extracted to `lib/queryClient.ts` singleton so AuthProvider can call `queryClient.clear()` on logout without prop-drilling.
- **CustomerProfile** is typed as `Database['public']['Tables']['profiles']['Row']` — not a manual interface — so schema drift is caught at compile time.

## Navigation security

- Login → OTP uses `router.replace` (not push) so Android Back cannot return to login from OTP.
- "Change phone number" on OTP uses `router.replace('/(auth)/login')` (not back).
- BackButton removed from verify-otp.tsx (replace-based nav means no history to go back to).
- After auth success, route protection in `_layout.tsx` uses `router.replace('/(tabs)')`.

## Route protection pattern

- Centralized in `useRouteProtection()` hook in `_layout.tsx`, watching `status` + `segments`.
- `authenticated_profile_error` always redirects to login regardless of current segment (prevents stuck-on-OTP state).
- `InitializingScreen` is an `absoluteFill` overlay on top of the Stack — prevents flash of wrong screen during cold start.

## AppState auto-refresh

- `supabase.auth.startAutoRefresh()` called immediately on AuthProvider mount if `AppState.currentState === 'active'` (catches app-already-foreground case).
- AppState listener pauses/resumes refresh on background/foreground.

## Supabase client path

- `lib/supabase.ts` at `artifacts/customer-app/lib/` imports Database from `'../../../lib/database.types'` (3 levels up = workspace root).
- `supabase.ts` re-exports `Database` type so feature files import from `@/lib/supabase`.

## Profile retry logic

- First sign-in: `loadProfileWithRetry()` with 4 attempts + backoff (trigger propagation lag).
- Session restore: `loadProfile()` with no retry (profile should already exist).

## Blocked users

- Blocked screen at `app/(auth)/blocked.tsx` (in auth group, gestureEnabled:false).
- Route protection uses `segs.includes('blocked')` (not `segs[1]`) — avoids TS tuple length error from Expo Router v6 useSegments typing.

**Why:**
- `useSegments()` in Expo Router v6 types as a short tuple, not `string[]`. Index access beyond inferred length is a TS error. `.includes()` or cast to `string[]` is the fix.
