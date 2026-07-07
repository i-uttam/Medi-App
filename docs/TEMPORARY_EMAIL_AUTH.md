# Temporary Email + Password Authentication

## Status

**TEMPORARY DEVELOPMENT AUTHENTICATION — DO NOT ENABLE FOR PRODUCTION RELEASE.**

This feature adds a real Supabase Email + Password sign-in and sign-up path to the MediGo customer app. Its sole purpose is to allow development and testing without requiring SMS OTP on every session. It will be removed before the production release.

---

## Feature Flag

| Variable | `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH` |
|---|---|
| File | `artifacts/customer-app/constants/features.ts` |
| Expected values | `true` / `false` |
| Default (when absent) | `false` (disabled) |

The flag is a **UI/product availability flag only**. It is not a security boundary:
- It does not weaken RLS.
- It does not bypass Supabase Auth.
- It does not bypass blocked-customer handling.
- Removing the flag or setting it to `false` removes the UI entry point; no backend changes are needed.

### Enable for development

In `artifacts/customer-app/.env.local`:

```
EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true
```

### Disable

Set it to `false` or remove the variable. The "Continue with Email" option disappears and the email-auth route redirects to Login automatically.

---

## Supabase Email Provider Requirement

Email + Password authentication requires the **Email provider** to be enabled in the Supabase Dashboard:

> **Authentication → Providers → Email → Enable Email provider**

### Email confirmation behaviour

Supabase Email Auth may require email address confirmation before a session is issued. The app handles both cases:

| Supabase configuration | App behaviour |
|---|---|
| Confirm email: **disabled** | Sign Up returns a session immediately. AuthProvider handles navigation. |
| Confirm email: **enabled** | Sign Up returns a user but no session. App shows: *"Check your email to confirm your account, then sign in."* Switches to Sign In mode. |

**Do not disable email confirmation by manipulating `email_confirmed_at` or using `service_role`.** If immediate sign-in after sign-up is required during development, disable email confirmation intentionally in the Supabase Dashboard under **Authentication → Email → Confirm email**.

---

## Implementation

### Files specific to this feature

| File | Purpose |
|---|---|
| `artifacts/customer-app/constants/features.ts` | Feature flag definition |
| `artifacts/customer-app/features/auth/schemas/email.ts` | Zod schemas (`emailSignInSchema`, `emailSignUpSchema`) |
| `artifacts/customer-app/app/(auth)/email-auth.tsx` | Isolated email auth screen |

### Files extended (shared with Phone OTP)

| File | Change |
|---|---|
| `artifacts/customer-app/features/auth/api/auth.ts` | Added `signInWithEmailPassword`, `signUpWithEmailPassword` |
| `artifacts/customer-app/features/auth/utils/errors.ts` | Added email-specific error patterns |
| `artifacts/customer-app/app/(auth)/login.tsx` | Added "OR / Continue with Email" section (flag-gated) |
| `artifacts/customer-app/.env.example` | Added `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=false` |

---

## Auth Flow

### Sign In

1. User taps **Continue with Email** on Login screen (only visible when flag is `true`).
2. App navigates to `/(auth)/email-auth`.
3. User enters email + password.
4. Zod validates locally (`emailSignInSchema`).
5. `signInWithEmailPassword` calls `supabase.auth.signInWithPassword`.
6. On success: Supabase fires `SIGNED_IN` → `AuthProvider.onAuthStateChange` → profile loading → route protection → `/(tabs)`.
7. On failure: normalized error message displayed. No raw Supabase errors exposed.

### Sign Up

1. User switches to **Create Account** tab.
2. Enters email, password, confirm password.
3. Zod validates locally (`emailSignUpSchema`): email format, min 8-char password, passwords match.
4. `signUpWithEmailPassword` calls `supabase.auth.signUp`.
5. **Case A (session returned):** AuthProvider handles navigation automatically.
6. **Case B (no session):** Email confirmation required. App shows confirmation notice, switches to Sign In.
7. **Case C (error):** Normalized error shown.

### Profile creation

The `handle_new_auth_user` DB trigger fires on every `auth.users` INSERT, including email-only users. The trigger handles `NULL` phone correctly — the `profiles.phone` column is nullable and the trigger uses `NEW.phone` directly (NULL for email users). No migration required.

### Shared architecture

Email + Password sessions use **identical session infrastructure** to Phone OTP:
- Same `AsyncStorage`-backed Supabase session persistence.
- Same `autoRefreshToken` and `AppState` refresh architecture.
- Same `AuthProvider` state machine and `onAuthStateChange` listener.
- Same `useRouteProtection` hook — no special bypass for email users.
- Same blocked-customer detection.
- Same logout: `supabase.auth.signOut()` → `SIGNED_OUT` → cache clear → redirect to Login (Phone OTP screen, not email-auth).

---

## Security boundaries

- No hardcoded emails, passwords, UUIDs, or tokens.
- Passwords exist only in React Hook Form component memory during the active interaction; cleared on success.
- Passwords are never logged, stored in Zustand, passed through route params, or written to AsyncStorage.
- `service_role` is not used.
- `email_confirmed_at` is not manipulated.
- RLS and blocked-customer handling are unchanged.

---

## EMAIL AUTH DASHBOARD CONFIGURATION REQUIRED

Before testing real Email + Password authentication:

1. Open the Supabase Dashboard for the linked project.
2. Go to **Authentication → Providers → Email**.
3. Enable the Email provider.
4. Choose whether to require email confirmation (see table above).
5. Set `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true` in `.env.local`.

---

## Removal checklist

When this feature is removed before production release, follow these steps:

1. [ ] Set `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=false` and verify "Continue with Email" is hidden.
2. [ ] Delete `artifacts/customer-app/app/(auth)/email-auth.tsx`.
3. [ ] Delete `artifacts/customer-app/features/auth/schemas/email.ts`.
4. [ ] Remove `signInWithEmailPassword` and `signUpWithEmailPassword` from `features/auth/api/auth.ts`.
5. [ ] Remove the email-specific error patterns (clearly marked) from `features/auth/utils/errors.ts`.
6. [ ] Remove the "Continue with Email" section (clearly marked) from `app/(auth)/login.tsx`.
7. [ ] Remove the `ENABLE_TEMPORARY_EMAIL_AUTH` import from `login.tsx`.
8. [ ] Remove `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH` from `constants/features.ts` (or the whole file if no other flags remain).
9. [ ] Remove `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH` from `.env.example`.
10. [ ] Delete this file (`docs/TEMPORARY_EMAIL_AUTH.md`) or archive it.

**Do NOT remove:**
- `AuthProvider`
- Phone OTP flow (`login.tsx` phone section, `verify-otp.tsx`, `requestPhoneOtp`, `verifyPhoneOtp`)
- Supabase session persistence architecture
- Profile loading and retry logic
- Blocked-customer handling
- Protected route logic
- Logout architecture
- TanStack Query cache clearing
