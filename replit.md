# Online Pharmacy Platform

A production-ready online pharmacy system: customers browse and order medicines via a mobile app; administrators manage the catalogue, inventory, orders, and promotions from a web panel. All data flows through a single shared Express 5 backend and PostgreSQL database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build and run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to the database (dev only)

## Required environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase or Replit Postgres) |
| `SESSION_SECRET` | Secret for session signing (already configured in Replit Secrets) |

**Note:** `DATABASE_URL` is not yet configured. The API server will not start without it. Apply the migrations in `supabase/migrations/` after provisioning a database.

## Stack

- **Runtime:** Node.js 24, pnpm workspaces, TypeScript 5.9
- **API:** Express 5 (artifact: `artifacts/api-server/`)
- **DB:** PostgreSQL + Drizzle ORM (`lib/db/`)
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval — OpenAPI spec → Zod schemas + React Query hooks
- **Build:** esbuild (CJS bundle output to `artifacts/api-server/dist/`)

## Where things live

| Path | Purpose |
|------|---------|
| `artifacts/api-server/` | Express 5 API server |
| `artifacts/api-server/src/routes/` | Route handlers |
| `lib/db/` | Drizzle ORM client and schema definitions |
| `lib/db/src/schema/` | Table definitions (currently empty — needs Drizzle schemas) |
| `lib/api-spec/openapi.yaml` | OpenAPI spec — source of truth for the API contract |
| `lib/api-client-react/` | Generated React Query hooks (from Orval) |
| `lib/api-zod/` | Generated Zod validation schemas (from Orval) |
| `supabase/migrations/` | 13 SQL migration files defining the full DB schema |
| `docs/PRD.md` | Full product requirements document |
| `docs/USER_FLOWS.md` | Screen-by-screen user flows |
| `docs/DATABASE_ARCHITECTURE.md` | Database design decisions |

## Architecture decisions

- **Supabase SQL migrations as schema source of truth:** The 13 files under `supabase/migrations/` define all tables, types, RLS policies, indexes, and triggers. The Drizzle schema in `lib/db/src/schema/` must be written to match these.
- **Orval codegen:** Run `pnpm --filter @workspace/api-spec run codegen` any time `lib/api-spec/openapi.yaml` changes to regenerate `lib/api-client-react/` and `lib/api-zod/`.
- **Single backend:** Both the customer mobile app and the admin panel communicate exclusively with the Express API server — no direct Supabase client calls from the frontend.
- **COD only:** Cash on Delivery is the only payment method in this version. Online payment is explicitly deferred.
- **Soft deletes only:** No hard deletes anywhere in the system — medicines are archived, admins are deactivated, etc.

## Product

- **Customer mobile app** (React Native + Expo, not yet built): phone OTP login, medicine browsing, cart, COD checkout, order tracking, coupon support, push notifications.
- **Admin panel** (Next.js, not yet built): catalogue management, inventory, order fulfilment, customer management, promotions.
- **API server** (Express 5, scaffolded): shared backend for both surfaces; health check at `/api/health`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `DATABASE_URL` must be set before the API server will start — it throws on startup if missing.
- `PORT` must also be set — the server throws on startup if missing (Replit sets this automatically for artifacts).
- The Drizzle schema (`lib/db/src/schema/index.ts`) is currently empty. API routes that touch the DB will not work until Drizzle table definitions are added to match the SQL migrations.
- Run `pnpm install` at the workspace root before running any artifact — the lockfile is committed.

## Pointers

- See `docs/PRD.md` for the full feature specification
- See `docs/DATABASE_ARCHITECTURE.md` for DB design rationale
- See `docs/RLS_SECURITY_PLAN.md` for row-level security design
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
