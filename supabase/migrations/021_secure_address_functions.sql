-- =============================================================================
-- Migration 021: Secure Address Functions
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- DECISIONS (from FEATURE_BEHAVIOUR.md and EDGE_CASES.md):
--   - First address created for a user is automatically set as default.
--   - Deleting the default address: the most recently updated remaining
--     address becomes the new default. If none remain, no default is set.
--   - set_my_default_address: unsets previous default and sets new one in
--     a single transaction (uses partial unique index atomically).
--   - Editing an address: only via update_my_address() RPC; tapping an
--     address card does NOT enter edit mode (UX rule in PRD/FEATURE_BEHAVIOUR).
--   - All functions use auth.uid() — never accept user_id parameter.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: create_my_address(...)
-- Creates a new address for the authenticated active customer.
-- If the customer has no existing addresses, sets is_default = TRUE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_my_address(
    p_full_name      TEXT,
    p_phone          TEXT,
    p_address_line_1 TEXT,
    p_address_line_2 TEXT        DEFAULT NULL,
    p_landmark       TEXT        DEFAULT NULL,
    p_city           TEXT        DEFAULT NULL,
    p_state          TEXT        DEFAULT NULL,
    p_postal_code    TEXT        DEFAULT NULL,
    p_country_code   TEXT        DEFAULT 'IN',
    p_address_type   address_type DEFAULT 'home'
)
RETURNS public.user_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_address       public.user_addresses;
    v_has_existing  BOOLEAN;
    v_is_default    BOOLEAN;
BEGIN
    PERFORM public.assert_active_customer();

    -- Lock the caller's profile row to serialize concurrent address operations
    -- for the same user, preventing two simultaneous first-address inserts
    -- both deciding is_default = TRUE (race-safe default assignment).
    PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;

    -- Validate required fields
    IF TRIM(COALESCE(p_full_name, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'full_name is required.';
    END IF;
    IF LENGTH(TRIM(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'full_name must be at least 2 characters.';
    END IF;
    IF LENGTH(TRIM(p_full_name)) > 100 THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'full_name must be at most 100 characters.';
    END IF;

    IF TRIM(COALESCE(p_phone, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'phone is required.';
    END IF;

    IF TRIM(COALESCE(p_address_line_1, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'address_line_1 is required.';
    END IF;

    IF TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'city is required.';
    END IF;

    IF TRIM(COALESCE(p_state, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'state is required.';
    END IF;

    IF TRIM(COALESCE(p_postal_code, '')) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'postal_code is required.';
    END IF;

    -- Validate country_code format (must be 2-letter ISO code)
    IF LENGTH(TRIM(COALESCE(p_country_code, 'IN'))) != 2 THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'country_code must be a 2-letter ISO code (e.g. IN).';
    END IF;

    -- Determine if this should be the default address
    -- First address for the user → auto-set as default (per FEATURE_BEHAVIOUR.md)
    SELECT EXISTS (
        SELECT 1 FROM public.user_addresses WHERE user_id = auth.uid()
    ) INTO v_has_existing;

    v_is_default := NOT v_has_existing;

    INSERT INTO public.user_addresses (
        user_id, full_name, phone, address_line_1, address_line_2,
        landmark, city, state, postal_code, country_code,
        address_type, is_default
    )
    VALUES (
        auth.uid(),
        TRIM(p_full_name),
        TRIM(p_phone),
        TRIM(p_address_line_1),
        NULLIF(TRIM(COALESCE(p_address_line_2, '')), ''),
        NULLIF(TRIM(COALESCE(p_landmark, '')), ''),
        TRIM(p_city),
        TRIM(p_state),
        TRIM(p_postal_code),
        UPPER(TRIM(COALESCE(p_country_code, 'IN'))),
        p_address_type,
        v_is_default
    )
    RETURNING * INTO v_address;

    RETURN v_address;
END;
$$;

COMMENT ON FUNCTION public.create_my_address(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) IS
    'Creates a delivery address for the caller. '
    'First address is automatically set as default. '
    'Never accepts user_id — uses auth.uid(). SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: update_my_address(p_address_id uuid, ...)
-- Updates fields on an address the caller owns.
-- Only updates supplied non-NULL fields (partial update semantics).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_address(
    p_address_id     UUID,
    p_full_name      TEXT        DEFAULT NULL,
    p_phone          TEXT        DEFAULT NULL,
    p_address_line_1 TEXT        DEFAULT NULL,
    p_address_line_2 TEXT        DEFAULT NULL,
    p_landmark       TEXT        DEFAULT NULL,
    p_city           TEXT        DEFAULT NULL,
    p_state          TEXT        DEFAULT NULL,
    p_postal_code    TEXT        DEFAULT NULL,
    p_country_code   TEXT        DEFAULT NULL,
    p_address_type   address_type DEFAULT NULL
)
RETURNS public.user_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_address public.user_addresses;
BEGIN
    PERFORM public.assert_active_customer();

    -- Validate ownership
    SELECT * INTO v_address
    FROM public.user_addresses
    WHERE id = p_address_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'address_not_found'
            USING HINT = 'Address not found or does not belong to the authenticated user.';
    END IF;

    -- Validate fields that are being updated
    IF p_full_name IS NOT NULL THEN
        p_full_name := TRIM(p_full_name);
        IF LENGTH(p_full_name) < 2 OR LENGTH(p_full_name) > 100 THEN
            RAISE EXCEPTION 'validation_error' USING HINT = 'full_name must be 2–100 characters.';
        END IF;
    END IF;
    IF p_phone IS NOT NULL AND TRIM(p_phone) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'phone cannot be blank.';
    END IF;
    IF p_address_line_1 IS NOT NULL AND TRIM(p_address_line_1) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'address_line_1 cannot be blank.';
    END IF;
    IF p_city IS NOT NULL AND TRIM(p_city) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'city cannot be blank.';
    END IF;
    IF p_state IS NOT NULL AND TRIM(p_state) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'state cannot be blank.';
    END IF;
    IF p_postal_code IS NOT NULL AND TRIM(p_postal_code) = '' THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'postal_code cannot be blank.';
    END IF;
    IF p_country_code IS NOT NULL AND LENGTH(TRIM(p_country_code)) != 2 THEN
        RAISE EXCEPTION 'validation_error' USING HINT = 'country_code must be 2 characters.';
    END IF;

    UPDATE public.user_addresses
    SET
        full_name      = COALESCE(TRIM(p_full_name),      full_name),
        phone          = COALESCE(TRIM(p_phone),          phone),
        address_line_1 = COALESCE(TRIM(p_address_line_1), address_line_1),
        address_line_2 = CASE WHEN p_address_line_2 IS NOT NULL
                              THEN NULLIF(TRIM(p_address_line_2), '')
                              ELSE address_line_2 END,
        landmark       = CASE WHEN p_landmark IS NOT NULL
                              THEN NULLIF(TRIM(p_landmark), '')
                              ELSE landmark END,
        city           = COALESCE(TRIM(p_city),           city),
        state          = COALESCE(TRIM(p_state),          state),
        postal_code    = COALESCE(TRIM(p_postal_code),    postal_code),
        country_code   = COALESCE(UPPER(TRIM(p_country_code)), country_code),
        address_type   = COALESCE(p_address_type,         address_type),
        updated_at     = NOW()
    WHERE id = p_address_id AND user_id = auth.uid()
    RETURNING * INTO v_address;

    RETURN v_address;
END;
$$;

COMMENT ON FUNCTION public.update_my_address(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) IS
    'Updates a delivery address owned by the caller. '
    'NULL parameters leave the field unchanged (partial update). '
    'Never accepts user_id. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: delete_my_address(p_address_id uuid)
-- Deletes an address owned by the caller.
-- If the deleted address was the default, promotes the most recently
-- updated remaining address as the new default (per EDGE_CASES.md EC-ADDR-01).
-- Historical order snapshots are unaffected (orders.address_id → SET NULL).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_address(p_address_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_address       public.user_addresses;
    v_next_id       UUID;
BEGIN
    PERFORM public.assert_active_customer();

    -- Fetch address and validate ownership
    SELECT * INTO v_address
    FROM public.user_addresses
    WHERE id = p_address_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'address_not_found'
            USING HINT = 'Address not found or does not belong to the authenticated user.';
    END IF;

    -- Delete the address
    DELETE FROM public.user_addresses WHERE id = p_address_id;

    -- If the deleted address was the default, promote the next most recent one
    IF v_address.is_default THEN
        SELECT id INTO v_next_id
        FROM public.user_addresses
        WHERE user_id = auth.uid()
        ORDER BY updated_at DESC
        LIMIT 1;

        IF v_next_id IS NOT NULL THEN
            UPDATE public.user_addresses
            SET is_default = TRUE, updated_at = NOW()
            WHERE id = v_next_id;
        END IF;
        -- If no remaining addresses: no default is set (per EC-ADDR-01)
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.delete_my_address(UUID) IS
    'Deletes a delivery address. If the deleted address was the default, '
    'the most recently updated remaining address becomes default. '
    'Historical order snapshots are unaffected. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: set_my_default_address(p_address_id uuid)
-- Sets the given address as the default for the caller.
-- Atomically unsets the previous default and sets the new one.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_my_default_address(p_address_id UUID)
RETURNS public.user_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_address public.user_addresses;
BEGIN
    PERFORM public.assert_active_customer();

    -- Validate ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.user_addresses
        WHERE id = p_address_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'address_not_found'
            USING HINT = 'Address not found or does not belong to the authenticated user.';
    END IF;

    -- Atomically unset all current defaults for this user, then set the new one.
    -- Both statements run in the same transaction (Supabase default behaviour).
    -- The partial unique index allows this two-step approach because we're
    -- within the same transaction: after UNSET completes, SET won't violate
    -- the constraint (no rows have is_default = TRUE anymore).
    UPDATE public.user_addresses
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = auth.uid()
      AND is_default = TRUE
      AND id != p_address_id;

    UPDATE public.user_addresses
    SET is_default = TRUE, updated_at = NOW()
    WHERE id = p_address_id AND user_id = auth.uid()
    RETURNING * INTO v_address;

    RETURN v_address;
END;
$$;

COMMENT ON FUNCTION public.set_my_default_address(UUID) IS
    'Sets the given address as the caller''s default delivery address. '
    'Atomically unsets the previous default. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_my_address(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_address(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_address(UUID)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_default_address(UUID)     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_my_address(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_address(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,address_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_address(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_default_address(UUID)  TO authenticated;

-- =============================================================================
-- END OF MIGRATION 021
-- =============================================================================
