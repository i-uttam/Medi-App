-- =============================================================================
-- Migration 019: Secure Profile Functions
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- update_my_profile(): customers update only their own allowed profile fields.
-- get_my_profile(): convenience function returning the caller's profile.
--
-- Protected (never updatable by customer):
--   id, status, block_reason, created_at, updated_at
-- Updatable via RPC:
--   full_name, email, avatar_url
-- Read-only (mirrors auth.users — not updatable here):
--   phone (authoritative in Supabase Auth; changing it requires re-verification)
--
-- SOURCE OF TRUTH for email and phone:
--   phone  → Supabase Auth (auth.users.phone); profile.phone mirrors it.
--   email  → profiles.email (optional; not required for auth, which is phone-only).
--   Updating profiles.email here does NOT update auth.users.email.
--   This is acceptable because email is optional metadata for customers.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: update_my_profile(full_name, email, avatar_url)
-- Allows a customer to update their own safe profile fields.
-- Raises an exception if the customer is not active.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_full_name   TEXT    DEFAULT NULL,
    p_email       TEXT    DEFAULT NULL,
    p_avatar_url  TEXT    DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile public.profiles;
BEGIN
    -- Guard: must be an active customer
    PERFORM public.assert_active_customer();

    -- Validate full_name length if provided
    IF p_full_name IS NOT NULL THEN
        p_full_name := TRIM(p_full_name);
        IF LENGTH(p_full_name) < 2 OR LENGTH(p_full_name) > 100 THEN
            RAISE EXCEPTION 'validation_error'
                USING HINT = 'full_name must be 2–100 characters.';
        END IF;
    END IF;

    -- Validate email format if provided (basic check; not empty when passed)
    IF p_email IS NOT NULL THEN
        p_email := LOWER(TRIM(p_email));
        IF LENGTH(p_email) = 0 THEN
            p_email := NULL; -- treat empty string as "clear email"
        ELSIF p_email NOT LIKE '%@%.%' THEN
            RAISE EXCEPTION 'validation_error'
                USING HINT = 'email must be a valid email address.';
        END IF;
    END IF;

    -- Perform the update; only the three allowed columns
    UPDATE public.profiles
    SET
        full_name  = COALESCE(p_full_name,  full_name),
        email      = COALESCE(p_email,      email),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile_not_found'
            USING HINT = 'No profile found for the authenticated user.';
    END IF;

    RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) IS
    'Customers update only full_name, email, and avatar_url on their own profile. '
    'id, status, block_reason, phone, and created_at are never modified. '
    'SECURITY DEFINER: bypasses RLS to write profile row safely.';

-- ---------------------------------------------------------------------------
-- FUNCTION: get_my_profile()
-- Returns the authenticated customer's full profile row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_profile() IS
    'Returns the authenticated user''s profile row. '
    'SECURITY DEFINER: bypasses RLS; only returns the caller''s own row.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_profile()                     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                     TO authenticated;

-- =============================================================================
-- END OF MIGRATION 019
-- =============================================================================
