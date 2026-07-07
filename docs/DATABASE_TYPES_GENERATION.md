# Database Types Generation Guide
## Online Pharmacy Platform — Supabase TypeScript Types

**Version:** 1.0  
**Last Updated:** 2026-07-07  

---

## Overview

Supabase generates TypeScript types from the live database schema using the Supabase CLI. These types provide end-to-end type safety for all database interactions in both the admin panel (Next.js) and any backend Edge Functions.

**Important:** Do not manually write or maintain these types. They must be generated from the live schema to remain accurate. Manual types will drift from the actual schema and introduce bugs.

---

## Prerequisites

1. **Supabase project linked** — The Supabase CLI must be linked to the remote project.
2. **All migrations applied** — Run all migrations before generating types.
3. **Supabase CLI installed** — Version 1.x or later.

---

## Installation

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Or via Homebrew on macOS
brew install supabase/tap/supabase
```

---

## One-Time Project Setup

```bash
# Login to Supabase
supabase login

# Link to your remote project (obtain Project Ref from Supabase Dashboard)
supabase link --project-ref <YOUR_PROJECT_REF>
```

The project ref is found in the Supabase Dashboard under **Project Settings → General → Reference ID**.

---

## Applying Migrations

Before generating types, apply all migrations in order:

```bash
# Apply all migrations in supabase/migrations/ to the remote project
supabase db push

# Verify migration status
supabase migration list
```

Migrations must be applied in numeric order (001 → 013). The Supabase CLI handles ordering automatically based on filename.

---

## Generating Types

```bash
# Generate TypeScript types from the live schema
# Output to the shared types location in the monorepo
supabase gen types typescript \
    --project-id <YOUR_PROJECT_REF> \
    > lib/database.types.ts
```

### Alternative: generate from local Supabase instance

```bash
# Start local Supabase instance (requires Docker)
supabase start

# Apply migrations to local instance
supabase db reset

# Generate types from local instance
supabase gen types typescript --local > lib/database.types.ts
```

---

## Monorepo Type Location

Generated types are placed at:

```
lib/database.types.ts
```

This file is imported by:
- `artifacts/api-server/` — Express backend routes
- Edge Functions — Supabase server-side functions
- `lib/db/` — Drizzle schema (if using Drizzle alongside Supabase)

---

## Using the Generated Types

```typescript
import type { Database } from '@workspace/db-types'; // or direct path

// Table row types
type Product = Database['public']['Tables']['products']['Row'];
type InsertProduct = Database['public']['Tables']['products']['Insert'];
type UpdateProduct = Database['public']['Tables']['products']['Update'];

// Enum types
type OrderStatus = Database['public']['Enums']['order_status'];
type DiscountType = Database['public']['Enums']['discount_type'];

// Supabase client with types
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Fully typed query
const { data, error } = await supabase
    .from('products')
    .select('id, name, selling_price_paise')
    .eq('is_active', true)
    .is('archived_at', null);
// data is typed as Pick<Product, 'id' | 'name' | 'selling_price_paise'>[] | null
```

---

## Regeneration Workflow

Regenerate types whenever a migration is applied:

```bash
# After applying a new migration:
supabase db push
supabase gen types typescript --project-id <YOUR_PROJECT_REF> > lib/database.types.ts
```

Add this to the project's `package.json` scripts:

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_REF > lib/database.types.ts"
  }
}
```

---

## Environment Variables Required

```bash
# .env or Replit Secrets
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>          # Safe for client apps; subject to RLS
SUPABASE_SERVICE_ROLE_KEY=<secret>    # NEVER in client apps; Edge Functions only
SUPABASE_PROJECT_REF=<project-ref>    # For CLI commands
```

---

## Actions Requiring Human Configuration

The following steps **require a human to perform** after this codebase is set up:

| Step | Action | Where |
|------|--------|--------|
| 1 | Create a Supabase project | [supabase.com](https://supabase.com) |
| 2 | Obtain Project Ref, URL, Anon Key, Service Role Key | Supabase Dashboard → Project Settings → API |
| 3 | Add secrets to Replit Secrets | Replit → Secrets tab |
| 4 | Run `supabase login` and `supabase link` | Local terminal |
| 5 | Run `supabase db push` to apply all migrations | Local terminal |
| 6 | Run type generation command | Local terminal |
| 7 | Configure Supabase Auth for phone OTP (SMS provider) | Supabase Dashboard → Auth → Providers |
| 8 | Configure Supabase Storage buckets (medicine images, banners) | Supabase Dashboard → Storage |
| 9 | Set initial `app_settings` values (support contacts, delivery charges) | Admin panel or Supabase SQL Editor |
| 10 | Create first Super Admin user | Supabase Dashboard → Auth → Users, then insert into admin_users |

---

## Drizzle ORM Relationship

The project monorepo includes `lib/db` with a Drizzle ORM schema (`drizzle.config.ts`). In the current architecture:

- **Supabase migrations** (`supabase/migrations/`) are the source of truth for the production schema.
- **Drizzle** can be used for type-safe query building in the Express API server.
- If Drizzle is used alongside Supabase, the Drizzle schema must be kept in sync with the Supabase migration schema.
- Recommended: use generated Supabase types for all Supabase client interactions; use Drizzle only for the Express API server database queries.
- Do NOT run `drizzle-kit push` against the Supabase database if Supabase migrations are the schema authority — this will create conflicts.
