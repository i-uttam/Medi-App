-- =============================================================================
-- Security Audit Queries
-- Online Pharmacy Platform — Supabase PostgreSQL
-- =============================================================================
-- PURPOSE:
--   Read-only audit queries for inspecting the security posture of the
--   deployed database. These queries do NOT modify any data.
--   Run periodically to verify the security model has not drifted.
--
-- USAGE:
--   Run in Supabase SQL Editor or via psql as postgres (superuser).
--   All queries are SELECT-only.
-- =============================================================================

-- =============================================================================
-- AUDIT 1: Tables without RLS enabled
-- Expected: 0 rows (all application tables should have RLS)
-- =============================================================================
\echo '--- AUDIT 1: Tables without RLS (expect 0 rows) ---'
SELECT relname AS table_name, 'RLS_DISABLED' AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY relname;

-- =============================================================================
-- AUDIT 2: Tables with RLS but WITHOUT FORCE RLS
-- Expected: 0 rows
-- =============================================================================
\echo '--- AUDIT 2: Tables with RLS but without FORCE RLS (expect 0 rows) ---'
SELECT relname AS table_name, 'FORCE_RLS_MISSING' AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT c.relforcerowsecurity
ORDER BY relname;

-- =============================================================================
-- AUDIT 3: All RLS policies (complete policy inventory)
-- =============================================================================
\echo '--- AUDIT 3: All RLS policies ---'
SELECT
    tablename,
    policyname,
    roles,
    cmd AS command,
    LEFT(qual, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- AUDIT 4: Tables with zero RLS policies (but RLS enabled)
-- Expected: All tables should have at least one policy after migrations 016–018
-- =============================================================================
\echo '--- AUDIT 4: Tables with RLS enabled but zero policies (expect 0 rows) ---'
SELECT relname AS table_name, 'NO_POLICIES' AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY relname;

-- =============================================================================
-- AUDIT 5: All SECURITY DEFINER functions (complete inventory)
-- =============================================================================
\echo '--- AUDIT 5: All SECURITY DEFINER functions in public schema ---'
SELECT
    p.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
    p.prosecdef AS is_security_definer,
    p.provolatile AS volatility,  -- s=stable, v=volatile, i=immutable
    pg_catalog.pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- =============================================================================
-- AUDIT 6: Functions with PUBLIC EXECUTE privilege (potential security gap)
-- Expected: Only get_product_availability should appear (safe for anon)
-- =============================================================================
\echo '--- AUDIT 6: Functions with PUBLIC EXECUTE (expect only get_product_availability) ---'
SELECT
    routine_schema,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee = 'PUBLIC'
  AND privilege_type = 'EXECUTE'
ORDER BY routine_name;

-- =============================================================================
-- AUDIT 7: Table privileges — sensitive tables should not have open grants
-- =============================================================================
\echo '--- AUDIT 7: Table grants to PUBLIC (expect 0 rows) ---'
SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'PUBLIC'
ORDER BY table_name;

-- =============================================================================
-- AUDIT 8: Admin permission keys currently in database
-- =============================================================================
\echo '--- AUDIT 8: All admin permission keys ---'
SELECT permission_key, description
FROM public.admin_permissions
ORDER BY permission_key;

-- =============================================================================
-- AUDIT 9: Admin roles and their permission count
-- =============================================================================
\echo '--- AUDIT 9: Admin roles and permission counts ---'
SELECT
    r.name AS role_name,
    r.description,
    COUNT(arp.permission_id) AS permission_count
FROM public.admin_roles r
LEFT JOIN public.admin_role_permissions arp ON arp.role_id = r.id
GROUP BY r.id, r.name, r.description
ORDER BY r.name;

-- =============================================================================
-- AUDIT 10: Current admin users (if any)
-- Expected: 0 rows before first Super Admin bootstrap
-- =============================================================================
\echo '--- AUDIT 10: Admin users (expect 0 before bootstrap) ---'
SELECT
    au.id,
    au.full_name,
    au.email,
    au.status,
    au.created_at,
    STRING_AGG(r.name, ', ' ORDER BY r.name) AS roles
FROM public.admin_users au
LEFT JOIN public.admin_user_roles aur ON aur.admin_user_id = au.id
LEFT JOIN public.admin_roles r ON r.id = aur.role_id
GROUP BY au.id, au.full_name, au.email, au.status, au.created_at
ORDER BY au.created_at;

-- =============================================================================
-- AUDIT 11: Profiles with non-active status (blocked/deleted customers)
-- =============================================================================
\echo '--- AUDIT 11: Non-active customer profiles ---'
SELECT id, status, block_reason, created_at
FROM public.profiles
WHERE status != 'active'
ORDER BY created_at DESC;

-- =============================================================================
-- AUDIT 12: App settings (verify is_public column integrity)
-- =============================================================================
\echo '--- AUDIT 12: App settings with is_public flag ---'
SELECT key, is_public, LEFT(description, 60) AS description, updated_at
FROM public.app_settings
ORDER BY key;

-- =============================================================================
-- AUDIT 13: Migration history (verify all 25 migrations recorded)
-- =============================================================================
\echo '--- AUDIT 13: Supabase migration history ---'
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- =============================================================================
-- AUDIT 14: Orphaned data check — carts without valid auth users
-- Expected: 0 rows in production (all carts should belong to auth.users rows)
-- =============================================================================
\echo '--- AUDIT 14: Orphaned carts (no matching auth user) ---'
SELECT c.id, c.user_id, c.created_at
FROM public.carts c
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = c.user_id
);

-- =============================================================================
-- AUDIT 15: Orders in terminal states (monitoring)
-- =============================================================================
\echo '--- AUDIT 15: Order status distribution ---'
SELECT status, COUNT(*) AS count
FROM public.orders
GROUP BY status
ORDER BY count DESC;

-- =============================================================================
-- END OF SECURITY AUDIT
-- =============================================================================
