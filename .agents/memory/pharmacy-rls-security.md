---
name: Online Pharmacy RLS Security Layer
description: Key design decisions, bug patterns, and deployment facts for the pharmacy platform's Supabase migration stack (migrations 001–026).
---

## Migration Stack Overview
- 26 migrations total: 001–013 schema, 014–025 security/RLS/RBAC, 026 fix
- Remote project: `zfcdqxmwpindhizptcgt` (Medi App, ap-south-1, PostgreSQL 17.6.1)
- All 26 migrations synced; verified via `supabase migration list`

## Column Type: app_settings.value is TEXT (not JSONB)
**Rule:** `admin_update_app_setting` must accept `p_value TEXT`, not JSONB. The app_settings table stores values as plain text — callers must serialize numbers/booleans/JSON to string before calling.

**Why:** Migration 024 originally shipped with `p_value JSONB` but `app_settings.value` is `TEXT`. PostgreSQL has no implicit/assignment cast from jsonb→text, so the INSERT would fail at runtime. Fixed in migration 026 (DROP JSONB overload, CREATE TEXT overload).

**How to apply:** If any future function upserts into `app_settings`, use TEXT for both the parameter and local variables. Never pass JSONB directly into a TEXT column.

## SECURITY DEFINER Function Pattern
All 9 security-helper functions (014) and all 14 RPC functions (019–024) use:
```sql
SECURITY DEFINER
SET search_path = public
```
Missing `SET search_path` is a privilege-escalation risk. Verified on remote: 0 functions missing this lock.

## admin_users Table Has No Profile Columns
`admin_users` only has: `id`, `user_id`, `status`, `created_at`, `updated_at`. Profile info (`full_name`, `email`) is on the `profiles` table joined via `profiles.id = admin_users.user_id`.

**Why this matters:** Any query joining admin_users for user display must also join `profiles`. The `security_audit.sql` AUDIT 10 had this bug (fixed).

## RLS FORCE Column Name
The correct pg_catalog column for FORCE ROW LEVEL SECURITY is `relforcerowsecurity` on `pg_class`, NOT a column called `forceroulsecurity` on `pg_tables` (which doesn't exist). Always use:
```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
```

## Supabase CLI Notes (v2.109.0)
- `db execute` does not exist — use `db query --linked -f <file>` or `db query --linked "<sql>"`
- `db query` with inline SQL containing `--` (SQL comments) causes argument parsing issues; prefer `-f <file>`
- `db push` will prompt for confirmation; passes `--yes` flag to suppress
- pgdelta catalog warning after push is non-critical (Docker cert issue in Replit env)
- TypeScript types: `gen types typescript --project-id <ref>` — pipe stdout to file, stderr has npm warnings

## Privilege Sweep Pattern (migration 025 + 026)
Every SECURITY DEFINER function needs:
1. `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` — revokes default public execute
2. `GRANT EXECUTE ON FUNCTION ... TO authenticated;` — grants to logged-in users
3. If anon should NOT call it: `REVOKE EXECUTE ... FROM anon;` (belt-and-suspenders)
Only `get_product_availability` is granted to `anon`.

## Deferred FK Pattern
`inventory_transactions.order_id` and `coupon_usage.order_id` have no FK in migrations 004/007 to avoid circular dependency. The FKs are added in migration 008 (`ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`). This is intentional — do not add them earlier.

## Replit Secrets Configured
- `SUPABASE_ACCESS_TOKEN`: CLI auth (personal access token)
- `SUPABASE_PROJECT_ID`: `zfcdqxmwpindhizptcgt`
- `SUPABASE_DB_PASSWORD`: DB password
- `SUPABASE_URL`: `https://zfcdqxmwpindhizptcgt.supabase.co`
- `SUPABASE_ANON_KEY`: project anon/public JWT key

## Storage Buckets (Manual)
Required buckets (`product-images`, `category-images`, `brand-images`, `banner-images`, `avatars`) cannot be created via CLI in Replit (requires Docker). Must be created manually in Supabase Dashboard → Storage.

## Super Admin Bootstrap
See `docs/SUPER_ADMIN_BOOTSTRAP.md`. Must be done after all migrations; no automated way.
