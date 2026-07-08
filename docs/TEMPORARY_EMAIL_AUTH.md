# Temporary Email + Password Authentication

> ⚠️ **DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.**
>
> This is a convenience login path for development and testing only.  
> It is completely separate from the user-facing Phone OTP flow and will be removed before launch.

---

## Overview

The temporary email auth feature adds a real Supabase Email + Password login option alongside the primary Phone OTP login. It uses `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()` — no fake sessions, no auth bypass, no mock data. The resulting session is handled by the existing `AuthProvider` and is identical in every way to a Phone OTP session.

---

## How to Enable

Set the following environment variable to `true`:

```
EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true
```

**In this Replit project:** set it in the Secrets panel (or as a plain env var if it is non-sensitive).

Once set, restart the Expo workflow. The **"Continue with Email"** button will appear on the Login screen beneath the Phone OTP button.

---

## How to Disable

Set the variable to `false`, or remove it entirely:

```
EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=false
```

When the value is anything other than the exact string `"true"`, the email option is hidden. The flag is read at bundle time — restart the Expo workflow after changing it.

---

## Behaviour When Enabled

| Feature | Behaviour |
|---|---|
| Login screen | Shows "Continue with Email" button below an OR divider |
| Email Auth screen | Sign In tab and Create Account tab on one screen |
| Sign In | `supabase.auth.signInWithPassword()` — real Supabase auth |
| Sign Up | `supabase.auth.signUp()` — real Supabase auth; shows email confirmation notice if enabled |
| Forgot Password | `supabase.auth.resetPasswordForEmail()` — sends a real reset link |
| Show / Hide password | Toggle on every password field |
| Session | Shared with Phone OTP — same `AuthProvider`, same protected routes, same logout |
| Profile creation | Handled by the existing `handle_new_auth_user` trigger in migration 002; it captures `NEW.email` for email sign-ups |
| Blocked account | Detected and redirected to `/(auth)/blocked` exactly as for Phone OTP users |

---

## How to Remove Later

1. Delete `artifacts/customer-app/app/(auth)/email-auth.tsx`
2. Delete `artifacts/customer-app/features/auth/schemas/email.ts`
3. Remove from `artifacts/customer-app/features/auth/api/auth.ts`:
   - `signInWithEmailPassword()`
   - `signUpWithEmailPassword()`
   - `sendPasswordResetEmail()`
   - Their result types (`EmailSignInResult`, `EmailSignUpResult`, `ForgotPasswordResult`)
4. Remove the `ENABLE_TEMPORARY_EMAIL_AUTH` constant from `artifacts/customer-app/constants/features.ts`
5. Remove the `ENABLE_TEMPORARY_EMAIL_AUTH` import and the `{ENABLE_TEMPORARY_EMAIL_AUTH && …}` block from `artifacts/customer-app/app/(auth)/login.tsx`
6. Delete the `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH` secret / env var
7. Delete this file

No database migrations need to be reversed. The profile trigger handles both phone and email users in production regardless.

---

## Architecture Notes

- **Feature flag only:** the flag is a UI gate, not a security boundary. RLS, Supabase Auth verification, and the blocked-customer check apply to all sessions regardless of how the user authenticated.
- **No second auth state:** `email-auth.tsx` never calls `setUser`, `setSession`, or any AuthProvider setter. It delegates entirely to `onAuthStateChange` in `AuthProvider`.
- **Password safety:** password values live only in React Hook Form state. They are cleared from form memory immediately after submission (success or error).

---

## Files Involved

| File | Role |
|---|---|
| `artifacts/customer-app/app/(auth)/login.tsx` | Renders "Continue with Email" when flag is `true` |
| `artifacts/customer-app/app/(auth)/email-auth.tsx` | Email auth screen (Sign In / Create Account / Forgot Password) |
| `artifacts/customer-app/features/auth/api/auth.ts` | `signInWithEmailPassword`, `signUpWithEmailPassword`, `sendPasswordResetEmail` |
| `artifacts/customer-app/features/auth/schemas/email.ts` | Zod validation schemas for email auth forms |
| `artifacts/customer-app/constants/features.ts` | `ENABLE_TEMPORARY_EMAIL_AUTH` flag definition |
| `supabase/migrations/002_profiles_and_admin.sql` | Profile trigger — already handles `NEW.email`; no change needed |

---

## Final Status

| Area | Status |
|---|---|
| Phone OTP | ✅ Unchanged — primary production login |
| Email Sign In | ✅ Real `supabase.auth.signInWithPassword()` |
| Email Sign Up | ✅ Real `supabase.auth.signUp()` with email confirmation handling |
| Forgot Password | ✅ Real `supabase.auth.resetPasswordForEmail()` |
| Show / Hide Password | ✅ Built into `AppTextInput` |
| Shared Session | ✅ Same `AuthProvider` / `onAuthStateChange` as Phone OTP |
| Profile Loading | ✅ `handle_new_auth_user` trigger handles email sign-ups |
| Protected Routes | ✅ Unchanged — `useRouteProtection` in `_layout.tsx` |
| Logout | ✅ Unchanged — `signOut()` in `AuthProvider` |
| Feature Flag Gate | ✅ `EXPO_PUBLIC_ENABLE_TEMPORARY_EMAIL_AUTH=true` to enable |
