-- =============================================================================
-- Migration 024: Secure Admin Management Functions
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- Functions:
--   admin_block_customer(user_id, reason)   — block a customer account
--   admin_unblock_customer(user_id)         — unblock a customer account
--   admin_archive_product(product_id, reason) — archive a product
--   admin_update_app_setting(key, value)    — update app settings
--
-- All functions:
--   - Require specific admin permissions (not just any active admin)
--   - Write to admin_activity_logs
--   - Use SECURITY DEFINER (direct table write bypasses RLS)
--   - Never accept auth.uid() as a parameter (always resolve from session)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_block_customer(p_user_id uuid, p_reason text)
-- Sets profiles.status = 'blocked' and records the block_reason.
-- Admins cannot block other admins via this function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_block_customer(
    p_user_id UUID,
    p_reason  TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_profile       public.profiles;
BEGIN
    PERFORM public.assert_active_admin('customers.block');

    -- Reason is mandatory
    IF TRIM(COALESCE(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'validation_error'
            USING HINT = 'A reason is required to block a customer.';
    END IF;

    -- Prevent blocking an admin (check if target user is an admin)
    IF EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'cannot_block_admin'
            USING HINT = 'Cannot block admin users through this function. Use the admin management console.';
    END IF;

    -- Resolve calling admin's record
    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    -- Validate target profile exists
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'customer_not_found'
            USING HINT = 'No customer profile found with the given user ID.';
    END IF;

    IF v_profile.status = 'blocked' THEN
        RAISE EXCEPTION 'already_blocked'
            USING HINT = 'This customer is already blocked.';
    END IF;

    IF v_profile.status = 'deleted' THEN
        RAISE EXCEPTION 'customer_deleted'
            USING HINT = 'Cannot block a deleted customer account.';
    END IF;

    -- Apply the block
    UPDATE public.profiles
    SET
        status       = 'blocked',
        block_reason = TRIM(p_reason),
        updated_at   = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_profile;

    -- Audit log
    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'customer_blocked',
        'profile',
        p_user_id::TEXT,
        'Customer blocked. Reason: ' || TRIM(p_reason),
        jsonb_build_object('status', 'active'),
        jsonb_build_object('status', 'blocked', 'block_reason', TRIM(p_reason))
    );

    RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.admin_block_customer(UUID, TEXT) IS
    'Blocks a customer account (profiles.status = blocked). '
    'Requires customers.block permission. '
    'Cannot block admin users. Writes audit log. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_unblock_customer(p_user_id uuid)
-- Clears profiles.status back to 'active' and clears block_reason.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unblock_customer(p_user_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_profile       public.profiles;
BEGIN
    PERFORM public.assert_active_admin('customers.block');

    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'customer_not_found'
            USING HINT = 'No customer profile found with the given user ID.';
    END IF;

    IF v_profile.status != 'blocked' THEN
        RAISE EXCEPTION 'not_blocked'
            USING HINT = 'This customer is not currently blocked (status: ' || v_profile.status || ').';
    END IF;

    UPDATE public.profiles
    SET
        status       = 'active',
        block_reason = NULL,
        updated_at   = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_profile;

    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'customer_unblocked',
        'profile',
        p_user_id::TEXT,
        'Customer unblocked.',
        jsonb_build_object('status', 'blocked'),
        jsonb_build_object('status', 'active', 'block_reason', NULL)
    );

    RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.admin_unblock_customer(UUID) IS
    'Unblocks a customer (profiles.status = active, block_reason = NULL). '
    'Requires customers.block permission. Writes audit log. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_archive_product(p_product_id uuid, p_reason text)
-- Sets products.archived_at = NOW() and is_active = FALSE.
-- Idempotent: archiving an already-archived product is a no-op.
--
-- Per FEATURE_BEHAVIOUR.md: archived products are not shown to customers.
-- Active cart items referencing archived products are NOT auto-removed here
-- (that is the responsibility of the Place Order Edge Function which re-validates
-- items at checkout time).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_archive_product(
    p_product_id UUID,
    p_reason     TEXT DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_product       public.products;
BEGIN
    PERFORM public.assert_active_admin('products.archive');

    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'product_not_found'
            USING HINT = 'No product found with the given ID.';
    END IF;

    -- Idempotent: already archived → return as-is
    IF v_product.archived_at IS NOT NULL THEN
        RETURN v_product;
    END IF;

    UPDATE public.products
    SET
        is_active   = FALSE,
        archived_at = NOW(),
        updated_at  = NOW()
    WHERE id = p_product_id
    RETURNING * INTO v_product;

    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'product_archived',
        'product',
        p_product_id::TEXT,
        'Product archived.' || CASE WHEN p_reason IS NOT NULL
                                    THEN ' Reason: ' || TRIM(p_reason)
                                    ELSE '' END,
        jsonb_build_object('is_active', TRUE, 'archived_at', NULL),
        jsonb_build_object(
            'is_active',   FALSE,
            'archived_at', v_product.archived_at,
            'reason',      p_reason
        )
    );

    RETURN v_product;
END;
$$;

COMMENT ON FUNCTION public.admin_archive_product(UUID, TEXT) IS
    'Archives a product (is_active=FALSE, archived_at=NOW()). '
    'Idempotent: already-archived products return unchanged. '
    'Requires products.archive permission. Writes audit log. '
    'Cart items referencing archived products are invalidated at checkout time. '
    'SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_update_app_setting(p_key text, p_value jsonb)
-- Updates a single app_settings row by its text key.
-- Upserts: creates the row if the key does not exist.
--
-- NOTE: is_public and description cannot be changed via this function.
-- Structural changes to app_settings must be done via SQL migration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_app_setting(
    p_key         TEXT,
    p_value       JSONB,
    p_description TEXT DEFAULT NULL
)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_setting       public.app_settings;
    v_old_value     JSONB;
BEGIN
    PERFORM public.assert_active_admin('settings.update');

    IF TRIM(COALESCE(p_key, '')) = '' THEN
        RAISE EXCEPTION 'validation_error'
            USING HINT = 'Setting key cannot be empty.';
    END IF;

    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    -- Capture existing value for audit log
    SELECT value INTO v_old_value
    FROM public.app_settings
    WHERE key = p_key;

    -- Upsert: update if exists, insert if not
    INSERT INTO public.app_settings (key, value, description, is_public)
    VALUES (
        TRIM(p_key),
        p_value,
        COALESCE(p_description, ''),
        FALSE   -- new settings are private by default; change via migration
    )
    ON CONFLICT (key) DO UPDATE
    SET
        value       = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, app_settings.description),
        updated_at  = NOW()
    RETURNING * INTO v_setting;

    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'app_settings_updated',
        'app_settings',
        p_key,
        'App setting updated: ' || p_key,
        jsonb_build_object('key', p_key, 'value', v_old_value),
        jsonb_build_object('key', p_key, 'value', p_value)
    );

    RETURN v_setting;
END;
$$;

COMMENT ON FUNCTION public.admin_update_app_setting(TEXT, JSONB, TEXT) IS
    'Updates (or inserts) an app_settings record by key. '
    'is_public cannot be changed via this function — use migrations. '
    'Requires settings.manage permission. Writes audit log. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_block_customer(UUID, TEXT)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_unblock_customer(UUID)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_product(UUID, TEXT)         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_app_setting(TEXT, JSONB, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_block_customer(UUID, TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_customer(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_product(UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_app_setting(TEXT, JSONB, TEXT) TO authenticated;

-- =============================================================================
-- END OF MIGRATION 024
-- =============================================================================
