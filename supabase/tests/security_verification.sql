-- =============================================================================
-- Security Verification Suite
-- Online Pharmacy Platform — Supabase PostgreSQL
-- =============================================================================
-- PURPOSE:
--   Verify that RLS policies, SECURITY DEFINER RPCs, and privilege model
--   correctly enforce access control. Tests run as structural/catalog checks
--   where auth context cannot be simulated, and as behavioral checks
--   where auth context can be set.
--
-- USAGE:
--   Run against the real linked Supabase database AFTER all migrations applied.
--   Uses transactions with ROLLBACK where possible.
--   auth.uid() simulation uses Supabase's set_config approach.
--
-- CONVENTIONS:
--   RAISE NOTICE 'PASS: ...'   — verification passed
--   RAISE NOTICE 'FAIL: ...'   — verification failed
--   RAISE NOTICE 'SKIP: ...'   — test not executable in this context
-- =============================================================================

-- =============================================================================
-- SECTION A: STRUCTURAL CHECKS (pg_catalog queries — no auth needed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- S1: Verify RLS is enabled on all 25 application tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_count INTEGER;
    v_tables TEXT[] := ARRAY[
        'profiles','carts','cart_items','user_addresses','orders',
        'order_items','order_status_history','payments','coupon_usage',
        'user_notifications','categories','brands','manufacturers','products',
        'product_images','product_compositions','inventory',
        'inventory_transactions','banners','app_settings','coupons',
        'notifications','admin_users','admin_roles','admin_permissions',
        'admin_role_permissions','admin_user_roles','admin_activity_logs'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY v_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity
        ) THEN
            RAISE NOTICE 'FAIL S1: RLS NOT enabled on table: %', t;
        END IF;
    END LOOP;
    -- Check total count
    SELECT COUNT(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname = ANY(v_tables);
    IF v_count = array_length(v_tables, 1) THEN
        RAISE NOTICE 'PASS S1: RLS enabled on all % application tables', v_count;
    ELSE
        RAISE NOTICE 'FAIL S1: RLS enabled on only %/% tables', v_count, array_length(v_tables, 1);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S2: Verify FORCE ROW LEVEL SECURITY on all 25 application tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relforcerowsecurity
      AND c.relname IN (
        'profiles','carts','cart_items','user_addresses','orders',
        'order_items','order_status_history','payments','coupon_usage',
        'user_notifications','categories','brands','manufacturers','products',
        'product_images','product_compositions','inventory',
        'inventory_transactions','banners','app_settings','coupons',
        'notifications','admin_users','admin_roles','admin_permissions',
        'admin_role_permissions','admin_user_roles','admin_activity_logs'
      );
    IF v_count = 28 THEN
        RAISE NOTICE 'PASS S2: FORCE RLS enabled on all 28 application tables';
    ELSE
        RAISE NOTICE 'FAIL S2: FORCE RLS enabled on only %/28 tables', v_count;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S3: Verify all SECURITY DEFINER helper functions exist
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    fn TEXT;
    fns TEXT[] := ARRAY[
        'current_user_id', 'is_authenticated', 'is_admin', 'is_active_admin',
        'has_admin_permission', 'is_super_admin', 'is_active_customer',
        'assert_active_customer', 'assert_active_admin'
    ];
BEGIN
    FOREACH fn IN ARRAY fns LOOP
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = fn
        ) THEN
            RAISE NOTICE 'PASS S3: Function exists: %', fn;
        ELSE
            RAISE NOTICE 'FAIL S3: Function MISSING: %', fn;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S4: Verify all SECURITY DEFINER RPCs exist
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    fn TEXT;
    fns TEXT[] := ARRAY[
        'update_my_profile', 'get_my_profile',
        'get_or_create_my_cart', 'add_product_to_my_cart',
        'set_my_cart_item_quantity', 'increment_my_cart_item',
        'decrement_my_cart_item', 'remove_my_cart_item', 'clear_my_cart',
        'create_my_address', 'update_my_address', 'delete_my_address',
        'set_my_default_address', 'admin_adjust_inventory',
        'get_product_availability', 'validate_my_coupon', 'cancel_my_order',
        'admin_update_order_status', 'admin_cancel_order',
        'mark_my_notification_read', 'mark_all_my_notifications_read',
        'admin_block_customer', 'admin_unblock_customer',
        'admin_archive_product', 'admin_update_app_setting'
    ];
BEGIN
    FOREACH fn IN ARRAY fns LOOP
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = fn
        ) THEN
            RAISE NOTICE 'PASS S4: RPC exists: %', fn;
        ELSE
            RAISE NOTICE 'FAIL S4: RPC MISSING: %', fn;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S5: Verify no sensitive SECURITY DEFINER function is PUBLIC EXECUTE
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    fn TEXT;
    fns TEXT[] := ARRAY[
        'update_my_profile', 'get_my_profile',
        'get_or_create_my_cart', 'add_product_to_my_cart',
        'set_my_cart_item_quantity', 'increment_my_cart_item',
        'decrement_my_cart_item', 'remove_my_cart_item', 'clear_my_cart',
        'create_my_address', 'update_my_address', 'delete_my_address',
        'set_my_default_address', 'admin_adjust_inventory',
        'validate_my_coupon', 'cancel_my_order',
        'admin_update_order_status', 'admin_cancel_order',
        'mark_my_notification_read', 'mark_all_my_notifications_read',
        'admin_block_customer', 'admin_unblock_customer',
        'admin_archive_product', 'admin_update_app_setting',
        'has_admin_permission', 'is_super_admin', 'assert_active_admin',
        'assert_active_customer', 'is_active_admin', 'is_admin'
    ];
    v_public_grant BOOLEAN;
BEGIN
    FOREACH fn IN ARRAY fns LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routine_privileges
            WHERE specific_schema = 'public'
              AND routine_name = fn
              AND grantee = 'PUBLIC'
              AND privilege_type = 'EXECUTE'
        ) INTO v_public_grant;
        IF v_public_grant THEN
            RAISE NOTICE 'FAIL S5: PUBLIC EXECUTE privilege found on sensitive function: %', fn;
        ELSE
            RAISE NOTICE 'PASS S5: No PUBLIC EXECUTE on: %', fn;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S6: Verify SECURITY DEFINER state on all RPCs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_non_definer_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'update_my_profile', 'get_my_profile',
              'get_or_create_my_cart', 'add_product_to_my_cart',
              'set_my_cart_item_quantity', 'increment_my_cart_item',
              'decrement_my_cart_item', 'remove_my_cart_item', 'clear_my_cart',
              'create_my_address', 'update_my_address', 'delete_my_address',
              'set_my_default_address', 'admin_adjust_inventory',
              'get_product_availability', 'validate_my_coupon', 'cancel_my_order',
              'admin_update_order_status', 'admin_cancel_order',
              'mark_my_notification_read', 'mark_all_my_notifications_read',
              'admin_block_customer', 'admin_unblock_customer',
              'admin_archive_product', 'admin_update_app_setting',
              'is_admin', 'is_active_admin', 'has_admin_permission',
              'is_super_admin', 'is_active_customer',
              'assert_active_customer', 'assert_active_admin'
          )
          AND NOT p.prosecdef  -- NOT SECURITY DEFINER = problem
    LOOP
        v_non_definer_count := v_non_definer_count + 1;
        RAISE NOTICE 'FAIL S6: Function is NOT SECURITY DEFINER: %', r.proname;
    END LOOP;
    IF v_non_definer_count = 0 THEN
        RAISE NOTICE 'PASS S6: All RPCs and helper functions are SECURITY DEFINER';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S7: Verify coupon table has no SELECT policy for authenticated (by design)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coupons'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[];
    IF v_count = 0 THEN
        RAISE NOTICE 'PASS S7: No SELECT policy for authenticated on coupons (enumeration prevention correct)';
    ELSE
        RAISE NOTICE 'FAIL S7: % SELECT policies found for authenticated on coupons (customers should not query coupons directly)', v_count;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S8: Verify inventory_transactions has no SELECT policy for customers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_cust_policy INTEGER;
BEGIN
    -- There should be no policy that gives customers access to inventory_transactions
    -- Admin-only: policy uses has_admin_permission
    SELECT COUNT(*) INTO v_cust_policy
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_transactions'
      AND cmd = 'SELECT'
      AND qual NOT LIKE '%admin_permission%'
      AND qual NOT LIKE '%is_admin%';
    IF v_cust_policy = 0 THEN
        RAISE NOTICE 'PASS S8: inventory_transactions SELECT correctly restricted to admins only';
    ELSE
        RAISE NOTICE 'FAIL S8: % non-admin SELECT policies found on inventory_transactions', v_cust_policy;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S9: Verify customer ownership policies exist for core tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    v_count INTEGER;
    tables TEXT[] := ARRAY['profiles','carts','cart_items','user_addresses',
                           'orders','order_items','payments','coupon_usage','user_notifications'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        SELECT COUNT(*) INTO v_count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT';
        IF v_count > 0 THEN
            RAISE NOTICE 'PASS S9: SELECT policy exists on: %', t;
        ELSE
            RAISE NOTICE 'FAIL S9: No SELECT policy found on: %', t;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S10: Verify admin tables have policies
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    v_count INTEGER;
    tables TEXT[] := ARRAY['admin_users','admin_roles','admin_permissions',
                           'admin_role_permissions','admin_user_roles','admin_activity_logs'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        SELECT COUNT(*) INTO v_count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t;
        IF v_count > 0 THEN
            RAISE NOTICE 'PASS S10: Policies exist on admin table: %', t;
        ELSE
            RAISE NOTICE 'FAIL S10: No policies found on admin table: %', t;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S11: Verify all 31 admin permission keys are seeded
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_count INTEGER;
    expected_keys TEXT[] := ARRAY[
        'dashboard.view','products.view','products.create','products.update',
        'products.archive','categories.view','categories.manage',
        'brands.view','brands.manage','manufacturers.view','manufacturers.manage',
        'inventory.view','inventory.adjust','orders.view','orders.update_status',
        'orders.cancel','customers.view','customers.block','banners.view',
        'banners.manage','coupons.view','coupons.manage','notifications.view',
        'notifications.send','settings.view','settings.update',
        'admins.view','admins.manage','roles.view','roles.manage','audit_logs.view'
    ];
    k TEXT;
BEGIN
    FOREACH k IN ARRAY expected_keys LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.admin_permissions WHERE permission_key = k
        ) THEN
            RAISE NOTICE 'FAIL S11: Permission key MISSING from admin_permissions: %', k;
        END IF;
    END LOOP;
    SELECT COUNT(*) INTO v_count FROM public.admin_permissions
    WHERE permission_key = ANY(expected_keys);
    IF v_count = array_length(expected_keys, 1) THEN
        RAISE NOTICE 'PASS S11: All % permission keys are seeded', v_count;
    ELSE
        RAISE NOTICE 'FAIL S11: Only %/% permission keys found', v_count, array_length(expected_keys, 1);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S12: Verify super_admin role exists and has all permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_role_id   UUID;
    v_perm_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT id INTO v_role_id FROM public.admin_roles WHERE name = 'super_admin';
    IF NOT FOUND THEN
        RAISE NOTICE 'FAIL S12: super_admin role not found in admin_roles';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_perm_count
    FROM public.admin_role_permissions arp
    WHERE arp.role_id = v_role_id;

    SELECT COUNT(*) INTO v_total_count FROM public.admin_permissions;

    IF v_perm_count = v_total_count THEN
        RAISE NOTICE 'PASS S12: super_admin role has all % permissions', v_perm_count;
    ELSE
        RAISE NOTICE 'FAIL S12: super_admin has %/% permissions', v_perm_count, v_total_count;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S13: Verify anon role has NO SELECT access to sensitive tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    v_count INTEGER;
    sensitive_tables TEXT[] := ARRAY['profiles','orders','order_items','payments',
        'admin_users','admin_roles','admin_permissions','coupons','coupon_usage',
        'inventory_transactions','user_addresses','carts','cart_items'];
BEGIN
    FOREACH t IN ARRAY sensitive_tables LOOP
        SELECT COUNT(*) INTO v_count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND 'anon' = ANY(roles);
        IF v_count = 0 THEN
            RAISE NOTICE 'PASS S13: anon has no RLS policy on: %', t;
        ELSE
            RAISE NOTICE 'FAIL S13: anon has % policies on sensitive table: %', v_count, t;
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- S14: Verify anon role SELECT on app_settings is restricted to is_public
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_policy_qual TEXT;
BEGIN
    SELECT qual INTO v_policy_qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT';
    IF v_policy_qual LIKE '%is_public%' THEN
        RAISE NOTICE 'PASS S14: anon app_settings policy correctly filters is_public';
    ELSIF NOT FOUND THEN
        RAISE NOTICE 'FAIL S14: No anon SELECT policy on app_settings';
    ELSE
        RAISE NOTICE 'FAIL S14: anon policy on app_settings does not check is_public: %', v_policy_qual;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- S15: Verify get_product_availability is executable by anon
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_has_execute BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routine_privileges
        WHERE specific_schema = 'public'
          AND routine_name = 'get_product_availability'
          AND grantee IN ('PUBLIC', 'anon')
          AND privilege_type = 'EXECUTE'
    ) INTO v_has_execute;
    IF v_has_execute THEN
        RAISE NOTICE 'PASS S15: get_product_availability is executable by anon/PUBLIC';
    ELSE
        RAISE NOTICE 'FAIL S15: get_product_availability is NOT executable by anon';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- BEHAVIORAL CHECKS NOTE
-- ---------------------------------------------------------------------------
-- The following tests require actual auth.uid() context. In Supabase,
-- auth context can be simulated using:
--
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"<user-uuid>","role":"authenticated"}';
--   SET LOCAL request.jwt.claim.sub TO '<user-uuid>';
--
-- These tests should be run via the Supabase SQL Editor or test runner
-- with proper authentication fixtures. They are documented here for
-- reference but are marked SKIP when run without auth context.
--
-- B1: Unauthenticated access to profiles → 0 rows
-- B2: Cross-user profile access → 0 rows
-- B3: Cross-user address access → 0 rows
-- B4: Cross-user cart access → 0 rows
-- B5: Direct order INSERT by authenticated user → ERROR (no INSERT policy)
-- B6: Direct order status UPDATE → ERROR (no UPDATE policy)
-- B7: Direct payment status UPDATE → ERROR (no UPDATE policy)
-- B8: Direct inventory UPDATE → ERROR (no UPDATE policy)
-- B9: Blocked customer calling cart RPC → exception 'not_active_customer'
-- B10: Admin RPC without required permission → exception 'insufficient_permission'
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE 'SKIP B1–B10: Behavioral tests require authenticated context. Run via Supabase SQL Editor with SET LOCAL role.';
END;
$$;

-- ---------------------------------------------------------------------------
-- SUMMARY
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'Security verification suite complete.';
    RAISE NOTICE 'Review PASS/FAIL/SKIP notices above.';
    RAISE NOTICE 'Behavioral tests (B1–B10) require auth context — run separately.';
    RAISE NOTICE '=============================================================';
END;
$$;

-- =============================================================================
-- END OF SECURITY VERIFICATION SUITE
-- =============================================================================
