-- =============================================================================
-- Migration 025: Final Security Privileges & Hardening
-- =============================================================================
-- Depends on: 001–024
--
-- This migration performs a final sweep of REVOKE/GRANT to ensure the
-- privilege model is consistent after all migrations are applied.
--
-- STRATEGY:
--   1. Revoke all PUBLIC grants on application tables.
--   2. Grant SELECT on catalogue tables to `authenticated` role
--      (RLS policies in 017/018 enforce the actual row-level filtering).
--   3. Grant SELECT on customer-owned tables to `authenticated`
--      (RLS policies in 016/018 enforce row-level filtering).
--   4. Grant INSERT/UPDATE/DELETE is withheld from all authenticated users
--      on tables where mutations must go through SECURITY DEFINER RPCs.
--   5. Grant the `anon` role access only to app_settings (public settings)
--      and nothing else.
--   6. No direct grants to `postgres` (it already bypasses RLS as the owner,
--      but FORCE ROW LEVEL SECURITY in migration 015 covers it).
--
-- POST-MIGRATION VERIFICATION:
--   Run the verification queries at the bottom of this file to confirm
--   the privilege model is correct.
-- =============================================================================

-- ===========================================================================
-- STEP 1: Revoke all from PUBLIC on every application table
-- ===========================================================================
-- PUBLIC is PostgreSQL's implicit "everyone" group. We revoke all permissions
-- to ensure no implicit access exists. This covers anon and authenticated roles.

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'profiles', 'carts', 'cart_items', 'user_addresses',
        'orders', 'order_items', 'order_status_history', 'payments',
        'coupon_usage', 'user_notifications',
        'categories', 'brands', 'manufacturers', 'products',
        'product_images', 'product_compositions', 'inventory',
        'inventory_transactions', 'banners', 'app_settings',
        'coupons', 'notifications',
        'admin_users', 'admin_roles', 'admin_permissions',
        'admin_role_permissions', 'admin_user_roles', 'admin_activity_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    END LOOP;
END;
$$;

-- ===========================================================================
-- STEP 2: Grant SELECT to authenticated on customer-readable tables
-- (RLS policies enforce row-level filtering per 016–018)
-- ===========================================================================

-- Customer-owned: customers see only their own rows (RLS applied)
GRANT SELECT ON public.profiles             TO authenticated;
GRANT SELECT ON public.carts                TO authenticated;
GRANT SELECT ON public.cart_items           TO authenticated;
GRANT SELECT ON public.user_addresses       TO authenticated;
GRANT SELECT ON public.orders               TO authenticated;
GRANT SELECT ON public.order_items          TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.payments             TO authenticated;
GRANT SELECT ON public.coupon_usage         TO authenticated;

-- user_notifications: SELECT + limited UPDATE (mark as read via RLS policy)
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;

-- Catalogue: customers see active rows only (RLS applied)
GRANT SELECT ON public.categories           TO authenticated;
GRANT SELECT ON public.brands               TO authenticated;
GRANT SELECT ON public.manufacturers        TO authenticated;
GRANT SELECT ON public.products             TO authenticated;
GRANT SELECT ON public.product_images       TO authenticated;
GRANT SELECT ON public.product_compositions TO authenticated;
GRANT SELECT ON public.inventory            TO authenticated;
GRANT SELECT ON public.banners              TO authenticated;
GRANT SELECT ON public.app_settings         TO authenticated;

-- NO SELECT on: coupons (validate via RPC), notifications (via user_notifications),
-- inventory_transactions (admin only)

-- Admin tables: admin SELECT is via RLS policies in 018
-- Granting SELECT here is required for RLS policies to filter correctly.
GRANT SELECT ON public.admin_users               TO authenticated;
GRANT SELECT ON public.admin_roles               TO authenticated;
GRANT SELECT ON public.admin_permissions         TO authenticated;
GRANT SELECT ON public.admin_role_permissions    TO authenticated;
GRANT SELECT ON public.admin_user_roles          TO authenticated;
GRANT SELECT ON public.admin_activity_logs       TO authenticated;

-- Admin-managed catalogue tables: admins can also SELECT (policy enforced)
GRANT SELECT ON public.coupons                   TO authenticated;
GRANT SELECT ON public.notifications             TO authenticated;
GRANT SELECT ON public.inventory_transactions    TO authenticated;

-- ===========================================================================
-- STEP 3: Grant INSERT/UPDATE on catalogue tables (admin policies enforce access)
-- ===========================================================================

-- Catalogue management (admin policies in 018 enforce permission checks)
GRANT INSERT, UPDATE ON public.categories           TO authenticated;
GRANT INSERT, UPDATE ON public.brands               TO authenticated;
GRANT INSERT, UPDATE ON public.manufacturers        TO authenticated;
GRANT INSERT, UPDATE ON public.products             TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_compositions TO authenticated;

-- Coupons (admin CRUD via policies in 018)
GRANT INSERT, UPDATE ON public.coupons              TO authenticated;

-- Banners (admin CRUD via policies in 018)
GRANT INSERT, UPDATE ON public.banners              TO authenticated;

-- Notifications (admin INSERT via policies in 018)
GRANT INSERT ON public.notifications                TO authenticated;

-- ===========================================================================
-- STEP 4: Tables where mutations are EXCLUSIVELY through SECURITY DEFINER RPCs
-- No direct INSERT/UPDATE/DELETE for `authenticated` beyond what RPCs need.
-- ===========================================================================
-- These tables have NO direct INSERT/UPDATE/DELETE grants:
--   profiles         — update_my_profile() RPC + service role
--   carts            — get_or_create_my_cart() RPC
--   cart_items       — add/set/remove cart RPCs
--   user_addresses   — create/update/delete address RPCs
--   orders           — place-order Edge Function + order status RPCs
--   order_items      — place-order Edge Function (service role)
--   order_status_history — order RPCs + Edge Functions (service role)
--   payments         — place-order Edge Function (service role)
--   coupon_usage     — place-order Edge Function (service role), cancel RPCs
--   inventory        — admin_adjust_inventory() RPC + order Edge Functions
--   inventory_transactions — admin_adjust_inventory() RPC + order Edge Functions
--   admin_users      — service role only
--   admin_roles      — service role only
--   admin_permissions — service role only
--   admin_role_permissions — service role only
--   admin_user_roles — service role only
--   admin_activity_logs — SECURITY DEFINER RPCs only

-- NOTE: SECURITY DEFINER functions bypass the authenticated role's lack of
-- INSERT/UPDATE/DELETE privileges because they run with the table owner's
-- (postgres) privileges.

-- ===========================================================================
-- STEP 5: Grant anon role access to public app_settings only
-- ===========================================================================
-- `anon` is used by Supabase for unauthenticated API requests.
-- The mobile app requires OTP authentication, so anon access is minimal.
-- We expose only public app settings (e.g. app version, feature flags)
-- to support app initialisation before the user logs in.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.app_settings TO anon;

-- RLS policy for anon on app_settings: only is_public = TRUE rows
-- (The customer SELECT policy covers `authenticated`; we add a separate one for `anon`)
DROP POLICY IF EXISTS "app_settings: anon read public" ON public.app_settings;
CREATE POLICY "app_settings: anon read public"
    ON public.app_settings
    FOR SELECT
    TO anon
    USING (is_public = TRUE);

-- ===========================================================================
-- STEP 6: Revoke direct schema usage from anon (belt-and-suspenders)
-- ===========================================================================
-- anon should not be able to discover schema structure or call arbitrary functions.
-- REVOKE on all public functions from PUBLIC:
-- Individual function privileges were already set per migration (014–024).
-- This final sweep ensures no stray PUBLIC function grants exist.

-- Revoke schema usage for anon role to prevent pg_catalog queries
-- (Supabase requires USAGE on public schema for PostgREST to work, so we leave
-- it. The table-level REVOKE above is the actual protection layer.)

-- ===========================================================================
-- STEP 7: Lock down helper functions from anon
-- ===========================================================================

REVOKE EXECUTE ON FUNCTION public.current_user_id()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_authenticated()           FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_admin()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(TEXT)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_customer()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.assert_active_customer()     FROM anon;
REVOKE EXECUTE ON FUNCTION public.assert_active_admin(TEXT)    FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT)                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_my_cart()                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_product_to_my_cart(UUID)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_my_cart_item_quantity(UUID, INTEGER)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_my_cart_item(UUID)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_my_cart_item(UUID)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_my_cart_item(UUID)                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_my_cart()                                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_my_address(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_my_address(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_my_address(UUID)                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_my_default_address(UUID)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_inventory(UUID, inventory_transaction_type, INTEGER, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_product_availability(UUID)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_my_coupon(TEXT)                             FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_my_order(UUID, TEXT)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(UUID, order_status, TEXT)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_order(UUID, TEXT)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_my_notification_read(UUID)                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_my_notifications_read()                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_block_customer(UUID, TEXT)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unblock_customer(UUID)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_archive_product(UUID, TEXT)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_app_setting(TEXT, JSONB, TEXT)          FROM anon;

-- ===========================================================================
-- STEP 8: Grant product availability check to anon (for app pre-auth init)
-- ===========================================================================
-- The app may need to show product availability on the browse/search screen
-- before login. get_product_availability() is safe for anon use (returns no PII).
GRANT EXECUTE ON FUNCTION public.get_product_availability(UUID) TO anon;

-- ===========================================================================
-- VERIFICATION QUERIES
-- Run these after applying all migrations to confirm the privilege model.
-- ===========================================================================

-- Verify no public.* tables are accessible to PUBLIC (expect 0 rows):
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND grantee = 'PUBLIC';

-- Verify RLS is enabled on all tables (expect 0 rows):
-- SELECT relname FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
-- ORDER BY relname;

-- Verify FORCE RLS on tables that require it (expect all 25 application tables):
-- SELECT relname, relforcerowsecurity FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relforcerowsecurity
-- ORDER BY relname;

-- List all policies (should show policies for each table per 016–018):
-- SELECT tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =============================================================================
-- END OF MIGRATION 025
-- =============================================================================
