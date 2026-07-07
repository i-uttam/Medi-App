-- =============================================================================
-- Migration 014: Security Helper Functions
-- =============================================================================
-- Depends on: 001–013
-- Creates authentication and authorisation helper functions used by all
-- subsequent RLS policies and secure RPCs.
--
-- DESIGN PRINCIPLES:
--   1. SECURITY DEFINER on all functions that query admin/profile tables.
--      This prevents RLS recursion: if admin_users had RLS that called
--      is_admin(), and is_admin() queried admin_users, we'd have infinite
--      recursion. SECURITY DEFINER bypasses RLS on the queried table.
--   2. SET search_path = public prevents search-path-injection attacks.
--   3. STABLE allows PostgreSQL to cache the result once per query,
--      avoiding redundant lookups when a policy is evaluated per-row.
--   4. REVOKE EXECUTE FROM PUBLIC on admin helpers — only authenticated
--      users should call them (granted below).
--   5. Never trust auth JWT metadata for admin privileges.
--   6. Never accept a user_id argument — always use auth.uid().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: current_user_id()
-- Returns the authenticated user's UUID from Supabase Auth.
-- Simple wrapper — no table access, no SECURITY DEFINER needed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id() IS
    'Returns auth.uid(). Never accepts a user_id argument.';

-- ---------------------------------------------------------------------------
-- FUNCTION: is_authenticated()
-- Returns TRUE when a valid Supabase Auth session exists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL;
$$;

COMMENT ON FUNCTION public.is_authenticated() IS
    'Returns TRUE when auth.uid() is not null (valid Supabase Auth session).';

-- ---------------------------------------------------------------------------
-- FUNCTION: is_admin()
-- Returns TRUE when the authenticated user has ANY row in admin_users.
-- Does NOT check status — use is_active_admin() to confirm active status.
-- SECURITY DEFINER: bypasses RLS on admin_users (avoids recursion once
-- admin_users gets RLS policies in migration 018).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS
    'Returns TRUE when auth.uid() has a row in admin_users (any status). '
    'SECURITY DEFINER to bypass RLS on admin_users and prevent recursion. '
    'Does NOT check status — call is_active_admin() for status check.';

-- ---------------------------------------------------------------------------
-- FUNCTION: is_active_admin()
-- Returns TRUE when the authenticated user is an admin with status = active.
-- SECURITY DEFINER: bypasses RLS on admin_users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = auth.uid()
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION public.is_active_admin() IS
    'Returns TRUE when auth.uid() is an admin with status = ''active''. '
    'SECURITY DEFINER to bypass RLS on admin_users.';

-- ---------------------------------------------------------------------------
-- FUNCTION: has_admin_permission(permission_key text)
-- Returns TRUE when the authenticated active admin has the named permission.
--
-- Resolution chain:
--   auth.uid()
--     → admin_users (must exist, status = active)
--     → admin_user_roles (roles assigned to this admin)
--     → admin_role_permissions (permissions in those roles)
--     → admin_permissions (the actual permission key)
--
-- SECURITY DEFINER: bypasses RLS on all admin tables (prevents recursion).
-- Does NOT trust the permission key as authorisation on its own — it checks
-- the key against the authenticated user's actual database permissions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users           au
        JOIN public.admin_user_roles      aur ON aur.admin_user_id = au.id
        JOIN public.admin_role_permissions arp ON arp.role_id = aur.role_id
        JOIN public.admin_permissions     ap  ON ap.id = arp.permission_id
        WHERE au.user_id = auth.uid()
          AND au.status  = 'active'
          AND ap.permission_key = p_permission_key
    );
$$;

COMMENT ON FUNCTION public.has_admin_permission(TEXT) IS
    'Returns TRUE when auth.uid() is an active admin with the requested permission. '
    'Resolves: admin_users → admin_user_roles → admin_role_permissions → admin_permissions. '
    'SECURITY DEFINER to bypass RLS on admin tables and prevent recursion. '
    'The permission key alone is not authorisation — the caller''s database identity is always verified.';

-- ---------------------------------------------------------------------------
-- FUNCTION: is_super_admin()
-- Returns TRUE when the authenticated active admin has the super_admin role.
-- Uses the role name from the seeded admin_roles table — not JWT metadata,
-- not hardcoded email addresses.
-- SECURITY DEFINER: bypasses RLS on admin tables.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users      au
        JOIN public.admin_user_roles aur ON aur.admin_user_id = au.id
        JOIN public.admin_roles      ar  ON ar.id = aur.role_id
        WHERE au.user_id = auth.uid()
          AND au.status  = 'active'
          AND ar.name    = 'super_admin'
    );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
    'Returns TRUE when auth.uid() is an active admin with the super_admin role. '
    'Uses database role assignments — never JWT metadata or hardcoded emails. '
    'SECURITY DEFINER to bypass RLS on admin tables.';

-- ---------------------------------------------------------------------------
-- FUNCTION: is_active_customer()
-- Returns TRUE when the authenticated user has a profile with status = active.
-- Blocked or deleted customers return FALSE.
-- SECURITY DEFINER: bypasses RLS on profiles (prevents recursion once
-- profiles gets RLS policies in migration 016).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_customer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id     = auth.uid()
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION public.is_active_customer() IS
    'Returns TRUE when auth.uid() has a profile with status = ''active''. '
    'Blocked (status = ''blocked'') and deleted (status = ''deleted'') customers return FALSE. '
    'SECURITY DEFINER to bypass RLS on profiles.';

-- ---------------------------------------------------------------------------
-- FUNCTION: assert_active_customer()
-- Raises an exception if the authenticated user is not an active customer.
-- Convenience wrapper for secure RPC functions that need a hard stop.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_active_customer()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated'
            USING HINT = 'A valid Supabase Auth session is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'customer_not_active'
            USING HINT = 'Your account is blocked or does not exist. Contact support.';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_active_customer() IS
    'Raises an exception if the caller is not an active customer. '
    'Used as a guard at the top of customer-facing secure RPCs.';

-- ---------------------------------------------------------------------------
-- FUNCTION: assert_active_admin(p_permission_key text DEFAULT NULL)
-- Raises an exception if the authenticated user is not an active admin,
-- or if p_permission_key is provided and the admin lacks that permission.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_active_admin(p_permission_key TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated'
            USING HINT = 'A valid Supabase Auth session is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'not_active_admin'
            USING HINT = 'Active admin account required.';
    END IF;

    IF p_permission_key IS NOT NULL THEN
        IF NOT public.has_admin_permission(p_permission_key) THEN
            RAISE EXCEPTION 'permission_denied'
                USING HINT = 'Admin permission required: ' || p_permission_key;
        END IF;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_active_admin(TEXT) IS
    'Raises an exception if the caller is not an active admin, '
    'or if p_permission_key is provided and the admin lacks it. '
    'SECURITY DEFINER to bypass RLS on admin_users.';

-- ---------------------------------------------------------------------------
-- PRIVILEGE GRANTS
-- Revoke PUBLIC execute from sensitive admin helpers.
-- Grant only to authenticated role (Supabase Auth users with a valid JWT).
-- ---------------------------------------------------------------------------

-- Customer helpers: safe to call for any authenticated user
REVOKE ALL ON FUNCTION public.current_user_id()           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated()          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_customer()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_active_customer()    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_id()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated()       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_active_customer()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_active_customer() TO authenticated;

-- Admin helpers: authenticated users may call them (RLS policies use them),
-- but only admins will ever get a TRUE result.
REVOKE ALL ON FUNCTION public.is_admin()                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin()           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_admin_permission(TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin()            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_active_admin(TEXT)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_active_admin(TEXT) TO authenticated;

-- =============================================================================
-- END OF MIGRATION 014
-- =============================================================================
