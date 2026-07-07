# Agent Context — MediGo Online Pharmacy Platform

**Read this file before making any changes to this project.**

This is a production-oriented pharmacy mobile application connected to a real Supabase project with a live database. The instructions below are strict constraints that must be respected by any agent working on this codebase.

---

## What This Project Is

- A pharmacy platform where customers order medicines via a mobile app.
- Administrators manage the catalogue, inventory, orders, and promotions via a future web panel.
- The customer mobile app is built with Expo (React Native) and authenticates via Supabase phone OTP.
- The Express API server connects to Replit's PostgreSQL for server-side operations.
- The mobile app connects directly to Supabase for auth and customer data.

---

## Mandatory — Read Before Any Development

| Before doing this... | Read this first |
|---|---|
| Any development task | `docs/PROJECT_STATE.md` |
| Any database change | `docs/DATABASE_ARCHITECTURE.md` |
| Any authorization change | `docs/SECURITY_ARCHITECTURE.md` |
| Any authentication change | `docs/AUTH_ARCHITECTURE.md` |
| Any migration | All existing files in `supabase/migrations/` |
| Any mobile screen change | `docs/MOBILE_UI_ARCHITECTURE.md`, `docs/MOBILE_ROUTE_MAP.md` |
| Any feature | `docs/FEATURE_BEHAVIOUR.md`, `docs/PRD.md` |

---

## Absolute Prohibitions

### Data integrity
- ❌ **Never use mock data in the runtime app.** No demo medicines, demo customers, demo orders, or fake products.
- ❌ **Never replace Supabase with Replit Database** for the mobile auth or customer data layer.
- ❌ **Never create a new Supabase project automatically.** The existing Supabase project must be reused.
- ❌ **Never reset the remote Supabase database** without explicit written user approval.
- ❌ **Never rerun the Super Admin bootstrap** — it was already run; running it again will create duplicates or fail.

### Migrations
- ❌ **Never edit a migration that has already been applied remotely.** Treat applied migrations as immutable history.
- ❌ **Never run `supabase db reset`** on the production/remote project.
- ❌ **Never run `supabase db push` without first running `supabase migration list`** to verify the diff is safe.
- ✅ New schema changes require a new additive migration with the next sequential number (027, 028, ...).

### Security
- ❌ **Never expose `service_role` to Expo.** Not in `EXPO_PUBLIC_*`, not in any client-bundled code.
- ❌ **Never expose `SUPABASE_ACCESS_TOKEN` to Expo.**
- ❌ **Never expose `SUPABASE_DB_PASSWORD` to Expo.**
- ❌ **Never hardcode OTPs, UUIDs, access tokens, or refresh tokens** in any runtime code.
- ❌ **Never add mock auth, bypass logic, or fake sessions.**

### Scope
- ❌ **Prescription functionality is excluded** from this project. Do not implement it.
- ❌ **Billing/POS functionality is excluded.** Do not implement it.
- ❌ **Google login is excluded.** Do not implement it.

---

## Architecture Constraints

### Database
- The remote Supabase project has 26 migrations applied.
- RLS, FORCE RLS, RBAC, and Secure RPCs are deployed and must not be modified without reading `docs/SECURITY_ARCHITECTURE.md` and `docs/RLS_SECURITY_PLAN.md`.

### Authentication (mobile)
- Supabase phone OTP (India +91) is the auth method.
- Auth architecture is in `docs/AUTH_ARCHITECTURE.md`.
- The `AuthProvider` in `artifacts/customer-app/providers/AuthProvider.tsx` is the single source of truth for auth state. Do not duplicate auth state in Zustand.
- There are six auth states: `initializing`, `unauthenticated`, `authenticated_profile_loading`, `authenticated_active`, `authenticated_blocked`, `authenticated_profile_error`.

### Design system
- All UI must use the existing design tokens in `artifacts/customer-app/constants/`.
- Never hardcode hex colors, font sizes, or spacing values in components.
- Follow the existing component patterns in `artifacts/customer-app/components/`.

### API server
- The Express server uses Replit's PostgreSQL (not Supabase) for server-side data.
- The Drizzle schema (`lib/db/src/schema/index.ts`) is currently empty — it needs to be filled to match the 26 migrations before API routes return real data.
- `auth.uid()` on Replit PostgreSQL returns NULL (compatibility stub). RLS is effectively disabled server-side; the Express server handles auth via sessions.

---

## Project Structure Reference

```
/
├── artifacts/
│   ├── customer-app/         ← Expo React Native mobile app
│   │   ├── app/              ← Expo Router screens
│   │   ├── features/auth/    ← Auth domain (types, utils, api)
│   │   ├── providers/        ← AuthProvider
│   │   ├── components/       ← UI components
│   │   ├── constants/        ← Design tokens
│   │   ├── hooks/            ← Shared hooks
│   │   ├── stores/           ← Zustand stores
│   │   └── lib/              ← Supabase client, queryClient
│   └── api-server/           ← Express 5 API server
├── lib/
│   ├── database.types.ts     ← Generated Supabase types (workspace root)
│   ├── db/                   ← Drizzle ORM
│   ├── api-spec/             ← OpenAPI spec
│   └── api-client-react/     ← Generated React hooks
├── supabase/
│   ├── migrations/           ← 26 SQL migrations (do not edit applied ones)
│   └── tests/                ← RLS and security tests
└── docs/                     ← All project documentation
```

---

## Current Development State

See `docs/PROJECT_STATE.md` for the complete current status.

**Summary as of July 2026:**
- Steps 1–5 complete (docs, DB, RLS/RBAC, mobile UI, customer auth).
- Step 6 (customer commerce screens) not started — blocked on Drizzle schema.
- Drizzle schema (`lib/db/src/schema/index.ts`) is empty.
- Admin panel not started.

**Recommended next task:** Populate the Drizzle schema to match the 26 migrations.

---

## Environment Variables Required

| Variable | Purpose | Where |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile Supabase client | Replit Secrets |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Mobile Supabase client | Replit Secrets |
| `SESSION_SECRET` | Express session middleware | Replit Secrets |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI only | Replit Secrets (optional) |
| `SUPABASE_DB_PASSWORD` | Supabase CLI only | Replit Secrets (optional) |
| `SUPABASE_PROJECT_ID` | Supabase CLI only | Replit Secrets (optional) |

See `docs/SECRET_INVENTORY_TEMPLATE.md` for retrieval instructions.
