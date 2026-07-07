# Project State — MediGo Online Pharmacy Platform

**Last updated:** July 7, 2026
**Purpose:** Human-readable source of truth for current development progress. Read this before starting any new development step.

---

## Identity

| Item | Value |
|---|---|
| Project name | MediGo Online Pharmacy |
| Supabase project | See `SUPABASE_PROJECT_ID` in Replit Secrets |
| Database types path | `lib/database.types.ts` (workspace root) |
| Migration count | 26 |
| Last migration | `026_fix_admin_update_app_setting_signature.sql` |
| Mobile stack | Expo SDK 54 · Expo Router v6 · React Native 0.81.5 |
| Auth | Supabase Phone OTP (India +91) |

---

## Step 1 — Product Documentation ✅ COMPLETE

- `docs/PRD.md` — Product Requirements Document
- `docs/FEATURE_BEHAVIOUR.md` — Feature behaviour specification
- `docs/USER_FLOWS.md` — User flow documentation
- `docs/EDGE_CASES.md` — Edge case handling
- `docs/MOBILE_UI_ARCHITECTURE.md` — Mobile UI architecture
- `docs/DESIGN_SYSTEM.md` — Design system documentation
- `docs/MOBILE_ROUTE_MAP.md` — Route map
- `docs/DATABASE_ARCHITECTURE.md` — Database design
- `docs/SECURITY_ARCHITECTURE.md` — Security model
- `docs/RLS_SECURITY_PLAN.md` — Row Level Security plan
- `docs/FUNCTION_PRIVILEGES.md` — Function privilege documentation
- `docs/ADMIN_FLOWS.md` — Admin flow documentation

---

## Step 2 — Database Architecture ✅ COMPLETE

- 26 SQL migrations in `supabase/migrations/`
- All migrations applied to the remote Supabase project
- Database types generated at `lib/database.types.ts`
- Supabase project linked

---

## Step 3 — RLS / RBAC / Security ✅ COMPLETE

- RLS enabled on all application tables
- FORCE RLS enabled
- Supabase RLS policies deployed (migrations 014–025)
- Admin RBAC deployed
- SECURITY DEFINER RPCs deployed
- Super Admin bootstrapped — **do not rerun**

---

## Step 4 — Mobile UI Foundation ✅ COMPLETE

**Verified by code inspection:**

- Design system: `artifacts/customer-app/constants/` (colors, theme, typography tokens)
- 25+ reusable UI components: `artifacts/customer-app/components/`
- Expo Router layout: `artifacts/customer-app/app/_layout.tsx`
- Bottom tab navigation with iOS liquid glass / classic fallback
- Screens implemented:
  - Auth group: login, verify-otp, blocked
  - Tabs: home (index), categories, orders, profile
  - Commerce: product detail, category detail, cart, checkout
  - Order: success, order detail
  - Account: addresses (list/create/edit), notifications, profile edit, support
  - Search
- Zustand stores: cart (persisted), toast
- TanStack Query client configured

---

## Step 5 — Customer Authentication ✅ COMPLETE

**Verified by code inspection:**

### Auth state machine
Six states implemented in `providers/AuthProvider.tsx`:
- `initializing` → cold start, session restoration
- `unauthenticated` → no session
- `authenticated_profile_loading` → session present, profile fetch in-flight
- `authenticated_active` → session + active profile ready
- `authenticated_blocked` → session present, profile.status = 'blocked'
- `authenticated_profile_error` → session present, profile load failed

### Features implemented
- Real Supabase phone OTP request (`signInWithOtp`)
- Real Supabase OTP verification (`verifyOtp`)
- Indian phone normalization to E.164 (`+91XXXXXXXXXX`)
- Centralized auth error mapping (user-safe messages)
- Session persistence via AsyncStorage
- AppState-aware token auto-refresh
- `onAuthStateChange` subscription with proper cleanup
- Profile loading from `public.profiles` with retry on first sign-in
- Blocked customer routing (cannot access commerce routes)
- Route protection in root layout — no screen flash
- Login → OTP via `replace` navigation (Android Back cannot return to login)
- Logout: Supabase signOut + TanStack Query cache clear + Zustand cart clear
- Profile screen shows real `full_name`, `phone`, `email`
- Account deletion boundary (unavailable state message — secure server-side deletion not yet implemented)

### Key files
- `artifacts/customer-app/lib/supabase.ts` — Supabase client
- `artifacts/customer-app/features/auth/` — types, utils, api
- `artifacts/customer-app/providers/AuthProvider.tsx` — state machine
- `artifacts/customer-app/app/_layout.tsx` — route protection

### Prerequisite for end-to-end testing
Supabase phone auth provider and SMS provider (Twilio) must be configured in the Supabase Dashboard. See `docs/PHONE_AUTH_SETUP.md`.

---

## Step 6 — Real Supabase Product Catalog Integration ✅ COMPLETE

**Completed:** 2026-07-07

**What was built:**
- `artifacts/customer-app/features/catalog/` — catalog.types.ts, catalog.keys.ts, catalog.service.ts, catalog.hooks.ts
- `artifacts/customer-app/hooks/` — useRecentSearches.ts, useRecentlyViewed.ts
- `artifacts/customer-app/components/ui/BannerCarousel.tsx`
- All screens connected to real Supabase data: Home, Categories, Category products, Product detail, Search

**Key decisions:**
- All catalog reads go through `catalog.service.ts` — screens never call Supabase directly.
- Availability via `get_product_availability()` SECURITY DEFINER RPC — never queries `inventory_transactions`.
- Full-text search via `products.search_vector` (websearch_to_tsquery, 400ms debounce).
- Pagination: useInfiniteQuery + range-based offset (20/page) for category products and search.
- Empty database → professional empty states, no fake content.
- Cart mutations remain local Zustand only (backend is Step 7+).

**Not in Step 6 (deferred to Step 7+):**
- Cart backend mutations, checkout, order placement, admin panel, prescription, billing.

---

## Step 7 — Admin Web Panel 🔲 NOT STARTED

**Scope:** Next.js admin interface for catalogue management, inventory, orders, promotions.

---

## Step 8 — Drizzle Schema (API Server) ⚠️ PARTIALLY STARTED

`lib/db/src/schema/index.ts` exists but is empty. The API server routes are shells. The Replit PostgreSQL database has all 26 migrations applied directly via SQL.

**Pending task (Task #3):** Fill in the Drizzle schema so API routes can safely read and write.

---

## Known Incomplete Features

| Feature | Status | Notes |
|---|---|---|
| Account deletion | UI boundary only | Requires secure server-side API + re-verification |
| Profile name edit | Route exists (`/profile/edit`) | Screen is a shell |
| Admin panel | Not started | Future step |
| Prescription system | **Excluded** | Out of scope by product decision |
| Billing/POS | **Excluded** | Out of scope by product decision |
| Google login | **Excluded** | Not in product scope |

---

## Current Active Tasks

| # | Title | Status |
|---|---|---|
| #2 | Connect customer login and registration | PROPOSED |
| #3 | Fill in the Drizzle schema | PROPOSED |
| #4 | Build the customer mobile app screens | PROPOSED |

---

## Recommended Next Step

**Task #3 — Drizzle Schema**

Populate `lib/db/src/schema/index.ts` to match the 26 applied migrations. This unblocks API routes returning real data, which unblocks Task #4 (customer commerce screens).

Alternatively, if auth end-to-end testing is the priority, configure the Supabase phone auth SMS provider as described in `docs/PHONE_AUTH_SETUP.md` and test the complete OTP flow.
