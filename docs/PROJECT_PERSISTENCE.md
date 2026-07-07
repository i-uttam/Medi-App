# Project Persistence — Required Files for Full Restoration

This document identifies every file and directory required to completely restore the MediGo Online Pharmacy Platform on another Replit account or development environment.

All items listed here are Git-tracked and will be present in the private GitHub repository. The only things that must be manually re-configured after account migration are **secret values** (see `docs/SECRET_INVENTORY_TEMPLATE.md`).

---

## Workspace Root (monorepo)

| File / Directory | Purpose |
|---|---|
| `pnpm-workspace.yaml` | Workspace package declarations |
| `package.json` | Root scripts and shared devDependencies |
| `pnpm-lock.yaml` | Exact dependency versions — ensures reproducible installs |
| `tsconfig.json` | Root TypeScript configuration |
| `.gitignore` | Git exclusion rules |
| `.env.example` | Variable names with empty placeholder values |
| `replit.md` | Project overview and Replit run instructions |
| `AGENTS.md` | Agent context for safe continuation after import |

---

## Supabase

| File / Directory | Purpose |
|---|---|
| `supabase/config.toml` | Supabase project configuration |
| `supabase/migrations/` | All 26 SQL migrations — complete schema, RLS, RBAC, RPCs |
| `supabase/tests/` | Security and RLS verification tests |
| `lib/database.types.ts` | TypeScript types auto-generated from the live Supabase schema |

> `lib/database.types.ts` is at the **workspace root** `lib/` directory.
> The migrations do **not** need to be re-applied — they are already deployed to the remote Supabase project.

---

## Customer Mobile App (`artifacts/customer-app/`)

### Expo / React Native configuration
| File | Purpose |
|---|---|
| `app.json` | Expo app configuration (name, slug, bundle ID) |
| `babel.config.js` | Babel transpilation configuration |
| `metro.config.js` | Metro bundler configuration |
| `tsconfig.json` | TypeScript configuration for the app |
| `package.json` | App dependencies |

### Supabase client + authentication
| File | Purpose |
|---|---|
| `lib/supabase.ts` | Singleton Supabase client (AsyncStorage session persistence) |
| `lib/queryClient.ts` | Singleton TanStack QueryClient (shared for cache clearing on logout) |
| `features/auth/types/index.ts` | Auth state machine types; `CustomerProfile` typed from Database |
| `features/auth/utils/phone.ts` | Indian phone normalization (E.164) + Zod schema |
| `features/auth/utils/errors.ts` | Centralized Supabase auth error mapping |
| `features/auth/api/auth.ts` | All Supabase auth operations (requestOtp, verifyOtp, signOut, loadProfile) |
| `providers/AuthProvider.tsx` | Central auth context, state machine, AppState refresh, logout |

### Route protection
| File | Purpose |
|---|---|
| `app/_layout.tsx` | Root layout — wraps with AuthProvider, route protection via useRouteProtection() |
| `app/(auth)/_layout.tsx` | Auth stack layout (fade animation) |
| `app/(auth)/login.tsx` | Phone number entry + real OTP request |
| `app/(auth)/verify-otp.tsx` | OTP verification + resend + change phone |
| `app/(auth)/blocked.tsx` | Blocked account screen |

### Application screens
| Directory | Purpose |
|---|---|
| `app/(tabs)/` | Bottom tab screens (Home, Categories, Orders, Profile) |
| `app/product/`, `app/category/` | Product and category detail screens |
| `app/cart/`, `app/checkout/` | Commerce flow screens |
| `app/order/` | Order confirmation and detail screens |
| `app/addresses/` | Address management screens |
| `app/notifications/` | Notifications screen |
| `app/profile/` | Profile edit screen |
| `app/support/` | Help & Support screen |
| `app/search/` | Search screen |

### Design system and shared code
| Directory | Purpose |
|---|---|
| `components/` | Reusable UI components (AppButton, Screen, MenuRow, etc.) |
| `constants/` | Design tokens (colors, theme, spacing, typography) |
| `hooks/` | Shared React hooks (useColors, etc.) |
| `stores/` | Zustand stores (cart, toast) |
| `assets/` | Images, icons, fonts |

---

## API Server (`artifacts/api-server/`)

| File | Purpose |
|---|---|
| `src/` | Express 5 server source |
| `package.json` | Server dependencies |
| `tsconfig.json` | TypeScript configuration |
| `esbuild.config.mjs` | Build configuration |

---

## Shared Libraries (`lib/`)

| Directory | Purpose |
|---|---|
| `lib/db/` | Drizzle ORM schema and client |
| `lib/api-spec/` | OpenAPI specification |
| `lib/api-client/` | Generated API client |
| `lib/api-client-react/` | React hooks for API client |
| `lib/shared/` | Shared types and utilities |

---

## Documentation (`docs/`)

All files in `docs/` are tracked. Key files:

| File | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/FEATURE_BEHAVIOUR.md` | Feature behaviour specification |
| `docs/USER_FLOWS.md` | User flow documentation |
| `docs/DATABASE_ARCHITECTURE.md` | Database design |
| `docs/SECURITY_ARCHITECTURE.md` | Security model |
| `docs/RLS_SECURITY_PLAN.md` | Row Level Security plan |
| `docs/AUTH_ARCHITECTURE.md` | Authentication architecture |
| `docs/MOBILE_ROUTE_MAP.md` | Mobile app route structure |
| `docs/PHONE_AUTH_SETUP.md` | Supabase phone auth setup guide |
| `docs/PROJECT_STATE.md` | Current development progress |
| `docs/SECRET_INVENTORY_TEMPLATE.md` | Secret names and retrieval instructions |
| `docs/REPLIT_ACCOUNT_RESTORE.md` | Step-by-step account migration guide |

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/check-project-setup.mjs` | Project health check — run after import to verify setup |

---

## What Is NOT Required (Not Tracked)

| Item | Reason |
|---|---|
| `node_modules/` | Regenerated by `pnpm install` |
| `.env` | Contains real secret values — never committed |
| `.cache/`, `.local/` | Replit runtime cache — regenerated |
| `supabase/.temp/`, `supabase/.branches/` | Supabase CLI local state — regenerated by `supabase link` |
| `attached_assets/` | Local working files — not project source |
| `dist/`, `android/`, `ios/` | Build outputs — regenerated |

---

## After Import: What Must Be Re-Configured

Only **secret values** must be manually added to Replit Secrets. No code needs to change.

| Secret | Required For |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile app auth and data |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Mobile app auth and data |
| `SESSION_SECRET` | API server session middleware |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI only (optional if no migrations planned) |
| `SUPABASE_DB_PASSWORD` | Supabase CLI only (optional if no migrations planned) |
| `SUPABASE_PROJECT_ID` | Supabase CLI only (optional if no migrations planned) |

See `docs/SECRET_INVENTORY_TEMPLATE.md` for retrieval instructions and `docs/REPLIT_ACCOUNT_RESTORE.md` for the complete restoration walkthrough.
