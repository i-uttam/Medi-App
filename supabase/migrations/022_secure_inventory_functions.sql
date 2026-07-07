-- =============================================================================
-- Migration 022: Secure Admin Inventory Adjustment Function
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- admin_adjust_inventory(): the ONLY way for admins to change inventory.
-- Direct UPDATE on the inventory table is denied by RLS (migration 018).
--
-- ALLOWED transaction types for manual admin adjustment:
--   admin_addition   — add stock
--   admin_reduction  — remove stock
--   admin_correction — set absolute value (implemented as signed delta)
--
-- FORBIDDEN transaction types via this function:
--   order_placement, order_cancellation_restore, return_restore
--   (those are managed by the order Edge Functions only)
--
-- CONCURRENCY:
--   Row-level lock (FOR UPDATE) on inventory row prevents race conditions
--   when multiple admin operations occur simultaneously.
--
-- AUDIT:
--   Every adjustment creates an inventory_transactions row and an
--   admin_activity_logs row within the same transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(
    p_product_id      UUID,
    p_transaction_type inventory_transaction_type,
    p_quantity_change  INTEGER,        -- signed: positive = add, negative = remove
    p_reason           TEXT
)
RETURNS public.inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id   UUID;
    v_inv             public.inventory;
    v_qty_before      INTEGER;
    v_qty_after       INTEGER;
    v_tx_id           UUID;
BEGIN
    -- Guard: active admin with inventory.adjust permission
    PERFORM public.assert_active_admin('inventory.adjust');

    -- Validate reason is provided and non-empty
    IF TRIM(COALESCE(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'validation_error'
            USING HINT = 'A reason is required for inventory adjustments.';
    END IF;

    -- Only allow manual admin transaction types
    IF p_transaction_type NOT IN (
        'admin_addition', 'admin_reduction', 'admin_correction'
    ) THEN
        RAISE EXCEPTION 'invalid_transaction_type'
            USING HINT = 'Only admin_addition, admin_reduction, and admin_correction are permitted via this function.';
    END IF;

    -- Validate quantity_change is non-zero
    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'validation_error'
            USING HINT = 'quantity_change must be non-zero.';
    END IF;

    -- Validate product exists
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'product_not_found'
            USING HINT = 'No product found with the given ID.';
    END IF;

    -- Resolve admin_user_id for the calling admin
    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    -- Lock inventory row and read current quantity
    SELECT * INTO v_inv
    FROM public.inventory
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'inventory_not_found'
            USING HINT = 'No inventory record found for this product.';
    END IF;

    v_qty_before := v_inv.available_quantity;
    v_qty_after  := v_qty_before + p_quantity_change;

    -- Reject if resulting stock would go negative
    IF v_qty_after < 0 THEN
        RAISE EXCEPTION 'insufficient_stock'
            USING HINT = 'Adjustment would result in negative inventory (' ||
                         v_qty_after || '). Current stock: ' || v_qty_before || '.';
    END IF;

    -- Update inventory
    UPDATE public.inventory
    SET
        available_quantity = v_qty_after,
        updated_at         = NOW()
    WHERE product_id = p_product_id
    RETURNING * INTO v_inv;

    -- Create inventory transaction record (ledger entry)
    INSERT INTO public.inventory_transactions (
        product_id, transaction_type, quantity_change,
        quantity_before, quantity_after,
        admin_user_id, reason, order_id
    )
    VALUES (
        p_product_id, p_transaction_type, p_quantity_change,
        v_qty_before, v_qty_after,
        v_admin_user_id, TRIM(p_reason), NULL
    )
    RETURNING id INTO v_tx_id;

    -- Create admin activity log entry
    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'inventory_adjusted',
        'product',
        p_product_id::TEXT,
        'Inventory adjusted: ' || p_transaction_type || ' | qty_change=' || p_quantity_change || ' | reason=' || TRIM(p_reason),
        jsonb_build_object(
            'available_quantity', v_qty_before,
            'product_id', p_product_id
        ),
        jsonb_build_object(
            'available_quantity', v_qty_after,
            'product_id', p_product_id,
            'transaction_id', v_tx_id,
            'transaction_type', p_transaction_type,
            'reason', TRIM(p_reason)
        )
    );

    RETURN v_inv;
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_inventory(UUID, inventory_transaction_type, INTEGER, TEXT) IS
    'Admin-only inventory adjustment. Locks the inventory row, validates result is non-negative, '
    'creates an inventory_transactions record and an admin_activity_logs entry. '
    'Only admin_addition, admin_reduction, and admin_correction are permitted. '
    'order_placement and order_cancellation_restore are reserved for order Edge Functions. '
    'SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: get_product_availability(p_product_id uuid)
-- Safe read-only function for customers to check availability.
-- Returns: available (bool), available_quantity (int), is_low_stock (bool).
-- Does not expose raw inventory_transactions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_product_availability(p_product_id UUID)
RETURNS TABLE (
    product_id         UUID,
    is_available       BOOLEAN,
    available_quantity INTEGER,
    is_low_stock       BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id                              AS product_id,
        (p.is_active AND p.archived_at IS NULL AND i.available_quantity > 0)
                                          AS is_available,
        COALESCE(i.available_quantity, 0) AS available_quantity,
        (i.available_quantity <= p.low_stock_threshold)
                                          AS is_low_stock
    FROM public.products p
    LEFT JOIN public.inventory i ON i.product_id = p.id
    WHERE p.id = p_product_id;
$$;

COMMENT ON FUNCTION public.get_product_availability(UUID) IS
    'Customer-safe product availability check. '
    'Returns availability, quantity, and low-stock flag. '
    'Does not expose inventory_transactions. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_adjust_inventory(UUID, inventory_transaction_type, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_availability(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(UUID, inventory_transaction_type, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_availability(UUID) TO authenticated;

-- =============================================================================
-- END OF MIGRATION 022
-- =============================================================================
