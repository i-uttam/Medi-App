-- =============================================================================
-- Migration 026: Fix admin_update_app_setting parameter type mismatch
-- =============================================================================
--
-- Problem: Migration 024 deployed admin_update_app_setting with p_value JSONB
-- but app_settings.value is TEXT. PostgreSQL has no implicit/assignment cast
-- from jsonb→text, so INSERT and SELECT INTO would throw a type error at
-- runtime whenever the function was actually called.
--
-- Fix:
--   1. Drop the JSONB overload that was created in migration 024.
--   2. Re-create the function with p_value TEXT (matching the column type).
--   3. Update REVOKE/GRANT to reference the corrected (TEXT, TEXT, TEXT) sig.
--
-- Note: migration 025 revoked the JSONB overload from anon; that REVOKE is now
-- a no-op since the function is dropped, but it does not need to be undone.
-- =============================================================================

-- Step 1: Drop the incorrectly-typed overload
DROP FUNCTION IF EXISTS public.admin_update_app_setting(TEXT, JSONB, TEXT);

-- Step 2: Re-create with correct TEXT parameter type
-- ---------------------------------------------------------------------------
-- FUNCTION: admin_update_app_setting(p_key text, p_value text, p_description text)
-- Updates a single app_settings row by its text key.
-- Upserts: creates the row if the key does not exist.
--
-- NOTE: p_value is TEXT (matching app_settings.value column type).
-- Callers must serialize numeric/boolean/json values to text before calling.
-- NOTE: is_public cannot be changed via this function — use migrations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_app_setting(
    p_key         TEXT,
    p_value       TEXT,
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
    v_old_value     TEXT;
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

COMMENT ON FUNCTION public.admin_update_app_setting(TEXT, TEXT, TEXT) IS
    'Updates (or inserts) an app_settings record by key. '
    'p_value must be a TEXT representation of the value (number/boolean/json as string). '
    'is_public cannot be changed via this function — use migrations. '
    'Requires settings.update permission. Writes audit log. SECURITY DEFINER.';

-- Step 3: Privilege sweep for the corrected signature
REVOKE ALL ON FUNCTION public.admin_update_app_setting(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_app_setting(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_app_setting(TEXT, TEXT, TEXT) TO authenticated;
