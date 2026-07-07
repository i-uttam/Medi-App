-- =============================================================================
-- Migration 023: Secure Order Functions
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- Functions:
--   validate_my_coupon(code)         — customer coupon validation (pre-order)
--   cancel_my_order(order_id, reason) — customer-initiated order cancellation
--   admin_update_order_status(...)   — admin order status transitions
--   admin_cancel_order(order_id, reason) — admin order cancellation
--   mark_my_notification_read(...)   — customer read notifications
--   mark_all_my_notifications_read() — bulk mark read
--
-- ORDER STATUS TRANSITION MATRIX (from PRD Section 6):
--   pending       → confirmed | cancelled
--   confirmed     → processing | cancelled
--   processing    → packed | cancelled
--   packed        → shipped | cancelled
--   shipped       → out_for_delivery  (no cancel; must go through admin_cancel_order)
--   out_for_delivery → delivered      (no cancel)
--   delivered     → (terminal)
--   cancelled     → (terminal)
--
-- CUSTOMER CANCELLABLE STATUSES: pending, confirmed (per PRD + EDGE_CASES)
-- ADMIN CANCELLABLE STATUSES: pending, confirmed, processing, packed (before shipped)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: validate_my_coupon(p_coupon_code text)
-- Validates a coupon for the authenticated active customer.
-- Does NOT create a coupon_usage record (that happens at order creation).
-- Does NOT trust client-supplied cart subtotal.
--
-- Returns a composite with validation result and coupon details for UI display.
-- ---------------------------------------------------------------------------
CREATE TYPE public.coupon_validation_result AS (
    is_valid               BOOLEAN,
    error_code             TEXT,
    coupon_id              UUID,
    description            TEXT,
    discount_type          discount_type,
    discount_value         INTEGER,
    minimum_order_paise    INTEGER,
    maximum_discount_paise INTEGER
);

CREATE OR REPLACE FUNCTION public.validate_my_coupon(p_coupon_code TEXT)
RETURNS public.coupon_validation_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coupon     public.coupons;
    v_user_uses  BIGINT;
    v_total_uses BIGINT;
    v_result     public.coupon_validation_result;
BEGIN
    PERFORM public.assert_active_customer();

    -- Normalise: uppercase, trim (matches storage format)
    p_coupon_code := UPPER(TRIM(p_coupon_code));

    IF p_coupon_code = '' THEN
        v_result.is_valid   := FALSE;
        v_result.error_code := 'empty_code';
        RETURN v_result;
    END IF;

    -- Fetch coupon
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = p_coupon_code;

    IF NOT FOUND THEN
        v_result.is_valid   := FALSE;
        v_result.error_code := 'invalid_code';
        RETURN v_result;
    END IF;

    -- Check active flag
    IF NOT v_coupon.is_active THEN
        v_result.is_valid   := FALSE;
        v_result.error_code := 'coupon_inactive';
        RETURN v_result;
    END IF;

    -- Check starts_at
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > NOW() THEN
        v_result.is_valid   := FALSE;
        v_result.error_code := 'coupon_not_started';
        RETURN v_result;
    END IF;

    -- Check expires_at
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= NOW() THEN
        v_result.is_valid   := FALSE;
        v_result.error_code := 'coupon_expired';
        RETURN v_result;
    END IF;

    -- Check total usage limit
    IF v_coupon.total_usage_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_total_uses
        FROM public.coupon_usage
        WHERE coupon_id = v_coupon.id;

        IF v_total_uses >= v_coupon.total_usage_limit THEN
            v_result.is_valid   := FALSE;
            v_result.error_code := 'usage_limit_reached';
            RETURN v_result;
        END IF;
    END IF;

    -- Check per-user usage limit
    IF v_coupon.per_user_usage_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_user_uses
        FROM public.coupon_usage
        WHERE coupon_id = v_coupon.id
          AND user_id   = auth.uid();

        IF v_user_uses >= v_coupon.per_user_usage_limit THEN
            v_result.is_valid   := FALSE;
            v_result.error_code := 'per_user_limit_reached';
            RETURN v_result;
        END IF;
    END IF;

    -- NOTE: minimum_order_value check is intentionally NOT done here.
    -- The client does not supply a subtotal; the authoritative check is
    -- performed by the Place Order Edge Function using database-calculated totals.
    -- The minimum_order_paise is returned so the UI can display a message.

    -- Valid coupon
    v_result.is_valid               := TRUE;
    v_result.error_code             := NULL;
    v_result.coupon_id              := v_coupon.id;
    v_result.description            := v_coupon.description;
    v_result.discount_type          := v_coupon.discount_type;
    v_result.discount_value         := v_coupon.discount_value;
    v_result.minimum_order_paise    := v_coupon.minimum_order_paise;
    v_result.maximum_discount_paise := v_coupon.maximum_discount_paise;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.validate_my_coupon(TEXT) IS
    'Validates a coupon code for the authenticated active customer. '
    'Does NOT create coupon_usage — only checks eligibility. '
    'Minimum order check is deferred to the Place Order Edge Function '
    'which uses authoritative server-calculated cart totals. '
    'SECURITY DEFINER: queries coupons table without customer SELECT access.';

-- ---------------------------------------------------------------------------
-- FUNCTION: cancel_my_order(p_order_id uuid, p_reason text)
-- Customer-initiated order cancellation.
--
-- Cancellable statuses: pending, confirmed (per PRD and EDGE_CASES.md EC-AUTH-04)
-- Blocked customers: may NOT cancel (per TASK 6 design — blocked users cannot
-- perform commerce mutations). Blocked customers must contact support.
--
-- ATOMICITY: all steps in a single transaction. If any step fails,
-- the entire operation rolls back (per EDGE_CASES.md EC-ADMIN-ORDER-04).
--
-- COUPON USAGE: the coupon_usage record is deleted (reversed) so the customer
-- can use the coupon again and the global usage count is released.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_my_order(
    p_order_id UUID,
    p_reason   TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order        public.orders;
    v_prior_status order_status;
    v_item         RECORD;
    v_inv          public.inventory;
    v_qty_before   INTEGER;
    v_qty_after    INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    -- Lock order row and validate ownership + status
    SELECT * INTO v_order
    FROM public.orders
    WHERE id      = p_order_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'order_not_found'
            USING HINT = 'Order not found or does not belong to the authenticated user.';
    END IF;

    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'order_not_cancellable'
            USING HINT = 'Only orders in ''pending'' or ''confirmed'' status can be cancelled by customers.';
    END IF;

    -- Save prior status before RETURNING overwrites v_order
    v_prior_status := v_order.status;

    -- Restore inventory for each order item.
    -- Lock inventory rows in product_id order (alphabetical UUID) to prevent deadlocks.
    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
          AND oi.product_id IS NOT NULL
        ORDER BY oi.product_id   -- deterministic lock ordering
    LOOP
        SELECT * INTO v_inv
        FROM public.inventory
        WHERE product_id = v_item.product_id
        FOR UPDATE;

        IF FOUND THEN
            v_qty_before := v_inv.available_quantity;
            v_qty_after  := v_qty_before + v_item.quantity;

            UPDATE public.inventory
            SET available_quantity = v_qty_after,
                updated_at         = NOW()
            WHERE product_id = v_item.product_id;

            -- Inventory transaction record for the restoration
            INSERT INTO public.inventory_transactions (
                product_id, transaction_type, quantity_change,
                quantity_before, quantity_after,
                order_id, admin_user_id, reason
            )
            VALUES (
                v_item.product_id,
                'order_cancellation_restore',
                v_item.quantity,
                v_qty_before,
                v_qty_after,
                p_order_id,
                NULL,
                'Customer-initiated cancellation'
            );
        END IF;
    END LOOP;

    -- Update order status
    UPDATE public.orders
    SET
        status       = 'cancelled',
        cancelled_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Append order status history record (use v_prior_status captured before UPDATE)
    INSERT INTO public.order_status_history (
        order_id, from_status, to_status,
        changed_by_user_id, changed_by_admin_user_id, reason
    )
    VALUES (
        p_order_id,
        v_prior_status,
        'cancelled',
        auth.uid(),
        NULL,
        NULLIF(TRIM(COALESCE(p_reason, '')), '')
    );

    -- Reverse coupon usage (releases the usage count so the customer can reuse)
    DELETE FROM public.coupon_usage
    WHERE order_id = p_order_id;

    RETURN v_order;
END;
$$;

COMMENT ON FUNCTION public.cancel_my_order(UUID, TEXT) IS
    'Customer-initiated order cancellation. '
    'Cancellable statuses: pending, confirmed only. '
    'Atomically: updates status, restores inventory, creates history record, '
    'reverses coupon_usage. Full rollback on any step failure. '
    'Blocked customers cannot cancel. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_update_order_status(p_order_id, p_new_status, p_reason)
-- Admin-only order status update. Enforces the transition matrix.
-- Does NOT handle cancellation — route to admin_cancel_order() instead.
--
-- Transition matrix:
--   pending         → confirmed
--   confirmed       → processing
--   processing      → packed
--   packed          → shipped
--   shipped         → out_for_delivery
--   out_for_delivery → delivered
--   delivered       → (terminal — no transitions)
--   cancelled       → (terminal — no transitions)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id   UUID,
    p_new_status order_status,
    p_reason     TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order            public.orders;
    v_prior_status     order_status;
    v_admin_user_id    UUID;
    v_allowed_next     order_status[];
BEGIN
    PERFORM public.assert_active_admin('orders.update_status');

    -- Resolve admin_user_id
    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    -- Lock and fetch order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'order_not_found'
            USING HINT = 'No order found with the given ID.';
    END IF;

    -- Route cancellation requests to the dedicated function
    IF p_new_status = 'cancelled' THEN
        RAISE EXCEPTION 'use_cancel_function'
            USING HINT = 'Use admin_cancel_order() to cancel orders (requires inventory restoration).';
    END IF;

    -- Determine allowed transitions for current status
    v_allowed_next := CASE v_order.status
        WHEN 'pending'          THEN ARRAY['confirmed']::order_status[]
        WHEN 'confirmed'        THEN ARRAY['processing']::order_status[]
        WHEN 'processing'       THEN ARRAY['packed']::order_status[]
        WHEN 'packed'           THEN ARRAY['shipped']::order_status[]
        WHEN 'shipped'          THEN ARRAY['out_for_delivery']::order_status[]
        WHEN 'out_for_delivery' THEN ARRAY['delivered']::order_status[]
        WHEN 'delivered'        THEN ARRAY[]::order_status[]
        WHEN 'cancelled'        THEN ARRAY[]::order_status[]
        ELSE                         ARRAY[]::order_status[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_next)) THEN
        RAISE EXCEPTION 'invalid_status_transition'
            USING HINT = 'Cannot transition from ' || v_order.status ||
                         ' to ' || p_new_status || '. ' ||
                         'Allowed next statuses: ' || array_to_string(v_allowed_next::TEXT[], ', ');
    END IF;

    -- Capture prior status before RETURNING overwrites v_order
    v_prior_status := v_order.status;

    -- Apply the status update
    UPDATE public.orders
    SET
        status       = p_new_status,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        updated_at   = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Append status history (v_prior_status = the status before this transition)
    INSERT INTO public.order_status_history (
        order_id, from_status, to_status,
        changed_by_user_id, changed_by_admin_user_id, reason
    )
    VALUES (
        p_order_id,
        v_prior_status,
        p_new_status,
        NULL,
        v_admin_user_id,
        NULLIF(TRIM(COALESCE(p_reason, '')), '')
    );

    -- Admin activity log
    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'order_status_updated',
        'order',
        p_order_id::TEXT,
        'Order status updated to ' || p_new_status,
        jsonb_build_object('status', v_prior_status),
        jsonb_build_object('status', p_new_status, 'reason', p_reason)
    );

    RETURN v_order;
END;
$$;

COMMENT ON FUNCTION public.admin_update_order_status(UUID, order_status, TEXT) IS
    'Admin order status update. Enforces the PRD transition matrix. '
    'Cancellation must use admin_cancel_order() instead. '
    'Sets delivered_at when transitioning to delivered. '
    'Creates order_status_history and admin_activity_logs entries. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: admin_cancel_order(p_order_id uuid, p_reason text)
-- Admin-initiated order cancellation with inventory restoration.
--
-- Admin cancellable statuses: pending, confirmed, processing, packed
-- (shipped, out_for_delivery, delivered cannot be cancelled by this function)
--
-- CONCURRENCY: locks inventory rows in product_id order to prevent deadlocks.
-- ATOMICITY: full rollback on any step failure.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_cancel_order(
    p_order_id UUID,
    p_reason   TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order         public.orders;
    v_prior_status  order_status;
    v_admin_user_id UUID;
    v_item          RECORD;
    v_inv           public.inventory;
    v_qty_before    INTEGER;
    v_qty_after     INTEGER;
BEGIN
    PERFORM public.assert_active_admin('orders.cancel');

    -- Reason is mandatory for admin cancellations
    IF TRIM(COALESCE(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'validation_error'
            USING HINT = 'A reason is required to cancel an order.';
    END IF;

    -- Resolve admin_user_id
    SELECT id INTO v_admin_user_id
    FROM public.admin_users
    WHERE user_id = auth.uid() AND status = 'active';

    -- Lock order row
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'order_not_found'
            USING HINT = 'No order found with the given ID.';
    END IF;

    -- Validate cancellable status
    IF v_order.status NOT IN ('pending', 'confirmed', 'processing', 'packed') THEN
        RAISE EXCEPTION 'order_not_cancellable'
            USING HINT = 'Only orders in pending/confirmed/processing/packed status can be cancelled. '
                         'Current status: ' || v_order.status;
    END IF;

    -- Prevent duplicate cancellation
    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'already_cancelled'
            USING HINT = 'This order is already cancelled.';
    END IF;

    -- Capture prior status before UPDATE RETURNING overwrites v_order
    v_prior_status := v_order.status;

    -- Restore inventory in deterministic product_id order (prevents deadlocks)
    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id   = p_order_id
          AND oi.product_id IS NOT NULL
        ORDER BY oi.product_id   -- alphabetical UUID = deterministic lock order
    LOOP
        SELECT * INTO v_inv
        FROM public.inventory
        WHERE product_id = v_item.product_id
        FOR UPDATE;

        IF FOUND THEN
            v_qty_before := v_inv.available_quantity;
            v_qty_after  := v_qty_before + v_item.quantity;

            UPDATE public.inventory
            SET available_quantity = v_qty_after,
                updated_at         = NOW()
            WHERE product_id = v_item.product_id;

            INSERT INTO public.inventory_transactions (
                product_id, transaction_type, quantity_change,
                quantity_before, quantity_after,
                order_id, admin_user_id, reason
            )
            VALUES (
                v_item.product_id,
                'order_cancellation_restore',
                v_item.quantity,
                v_qty_before,
                v_qty_after,
                p_order_id,
                v_admin_user_id,
                'Admin cancellation: ' || TRIM(p_reason)
            );
        END IF;
    END LOOP;

    -- Update order status
    UPDATE public.orders
    SET
        status       = 'cancelled',
        cancelled_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- Order status history (v_prior_status captured before UPDATE RETURNING)
    INSERT INTO public.order_status_history (
        order_id, from_status, to_status,
        changed_by_user_id, changed_by_admin_user_id, reason
    )
    VALUES (
        p_order_id,
        v_prior_status,
        'cancelled',
        NULL,
        v_admin_user_id,
        TRIM(p_reason)
    );

    -- Reverse coupon usage
    DELETE FROM public.coupon_usage WHERE order_id = p_order_id;

    -- Admin activity log
    INSERT INTO public.admin_activity_logs (
        admin_user_id, action, entity_type, entity_id,
        description, old_values, new_values
    )
    VALUES (
        v_admin_user_id,
        'order_cancelled',
        'order',
        p_order_id::TEXT,
        'Order cancelled by admin. Reason: ' || TRIM(p_reason),
        jsonb_build_object('status', v_prior_status),
        jsonb_build_object('status', 'cancelled', 'reason', TRIM(p_reason))
    );

    RETURN v_order;
END;
$$;

COMMENT ON FUNCTION public.admin_cancel_order(UUID, TEXT) IS
    'Admin order cancellation with inventory restoration. '
    'Cancellable statuses: pending, confirmed, processing, packed. '
    'Locks inventory rows in product_id order (deadlock prevention). '
    'Atomically: cancels order, restores inventory, creates history, '
    'reverses coupon_usage, writes audit log. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: mark_my_notification_read(p_user_notification_id uuid)
-- Marks a specific notification as read for the authenticated customer.
-- Idempotent: repeated calls are safe.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_my_notification_read(
    p_user_notification_id UUID
)
RETURNS public.user_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notif public.user_notifications;
BEGIN
    PERFORM public.assert_active_customer();

    UPDATE public.user_notifications
    SET
        is_read = TRUE,
        read_at = COALESCE(read_at, NOW())   -- idempotent: don't overwrite existing read_at
    WHERE id      = p_user_notification_id
      AND user_id = auth.uid()
    RETURNING * INTO v_notif;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'notification_not_found'
            USING HINT = 'Notification not found or does not belong to the authenticated user.';
    END IF;

    RETURN v_notif;
END;
$$;

COMMENT ON FUNCTION public.mark_my_notification_read(UUID) IS
    'Marks a notification as read for the caller. Idempotent. '
    'Validates ownership. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: mark_all_my_notifications_read()
-- Marks all unread notifications as read for the authenticated customer.
-- Returns count of notifications updated.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_all_my_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    WITH updated AS (
        UPDATE public.user_notifications
        SET
            is_read = TRUE,
            read_at = NOW()
        WHERE user_id  = auth.uid()
          AND is_read  = FALSE
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.mark_all_my_notifications_read() IS
    'Marks all unread notifications as read for the caller. '
    'Returns count of updated rows. Idempotent. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.validate_my_coupon(TEXT)                               FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_my_order(UUID, TEXT)                            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, order_status, TEXT)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_cancel_order(UUID, TEXT)                         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_my_notification_read(UUID)                        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_my_notifications_read()                       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.validate_my_coupon(TEXT)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(UUID, TEXT)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, order_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order(UUID, TEXT)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_notification_read(UUID)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_my_notifications_read()                    TO authenticated;

-- =============================================================================
-- END OF MIGRATION 023
-- =============================================================================
