-- =============================================================================
-- Migration 020: Secure Cart Functions
-- =============================================================================
-- Depends on: 014 (helpers), 015–018 (RLS)
--
-- All cart mutations go through SECURITY DEFINER RPCs. Direct client
-- INSERT/UPDATE/DELETE on carts/cart_items is denied by RLS (migration 016).
--
-- CART RULES (from FEATURE_BEHAVIOUR.md):
--   - One cart per authenticated user (get_or_create_my_cart).
--   - Adding the same product again: increment quantity, not a new row.
--   - Decrement to zero: automatically removes the item.
--   - Quantity may never exceed available_quantity from inventory.
--   - Product must be is_active = TRUE AND archived_at IS NULL.
--   - Blocked customers cannot mutate the cart.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: get_or_create_my_cart()
-- Returns the authenticated customer's cart, creating one if it doesn't exist.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_my_cart()
RETURNS public.carts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cart public.carts;
BEGIN
    PERFORM public.assert_active_customer();

    -- Try to get existing cart
    SELECT * INTO v_cart
    FROM public.carts
    WHERE user_id = auth.uid();

    -- Create if not found
    IF NOT FOUND THEN
        INSERT INTO public.carts (user_id)
        VALUES (auth.uid())
        RETURNING * INTO v_cart;
    END IF;

    RETURN v_cart;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_my_cart() IS
    'Returns the caller''s cart, creating one atomically if it doesn''t exist. '
    'Requires active customer. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: add_product_to_my_cart(p_product_id uuid)
-- Adds a product to the caller's cart (quantity 1), or increments existing.
-- Validates: active customer, product exists & active, stock > 0.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_product_to_my_cart(p_product_id UUID)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cart        public.carts;
    v_product     public.products;
    v_inv_qty     INTEGER;
    v_item        public.cart_items;
    v_new_qty     INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    -- Validate product exists, is active, not archived
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
      AND is_active   = TRUE
      AND archived_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'product_unavailable'
            USING HINT = 'Product does not exist, is inactive, or is archived.';
    END IF;

    -- Check available stock
    SELECT available_quantity INTO v_inv_qty
    FROM public.inventory
    WHERE product_id = p_product_id;

    IF v_inv_qty IS NULL OR v_inv_qty <= 0 THEN
        RAISE EXCEPTION 'out_of_stock'
            USING HINT = 'This product is currently out of stock.';
    END IF;

    -- Get or create cart
    v_cart := public.get_or_create_my_cart();

    -- Check if item already in cart
    SELECT * INTO v_item
    FROM public.cart_items
    WHERE cart_id    = v_cart.id
      AND product_id = p_product_id;

    IF FOUND THEN
        -- Item exists: increment quantity, respecting stock limit
        v_new_qty := v_item.quantity + 1;
        IF v_new_qty > v_inv_qty THEN
            RAISE EXCEPTION 'exceeds_stock'
                USING HINT = 'Cannot add more than the available stock quantity.';
        END IF;

        UPDATE public.cart_items
        SET quantity   = v_new_qty,
            updated_at = NOW()
        WHERE id = v_item.id
        RETURNING * INTO v_item;
    ELSE
        -- New item: insert with quantity 1
        INSERT INTO public.cart_items (cart_id, product_id, quantity)
        VALUES (v_cart.id, p_product_id, 1)
        RETURNING * INTO v_item;
    END IF;

    RETURN v_item;
END;
$$;

COMMENT ON FUNCTION public.add_product_to_my_cart(UUID) IS
    'Adds a product to the caller''s cart (qty 1) or increments if already present. '
    'Validates: active customer, product active, stock > 0. '
    'Never accepts user_id — uses auth.uid(). SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: set_my_cart_item_quantity(p_cart_item_id uuid, p_quantity integer)
-- Sets the quantity of a specific cart item. Must own the item.
-- quantity = 0 is rejected — use remove_my_cart_item() instead.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_my_cart_item_quantity(
    p_cart_item_id UUID,
    p_quantity     INTEGER
)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item    public.cart_items;
    v_inv_qty INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'invalid_quantity'
            USING HINT = 'Quantity must be >= 1. Use remove_my_cart_item() to remove.';
    END IF;

    -- Fetch item and validate ownership
    SELECT ci.* INTO v_item
    FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id     = p_cart_item_id
      AND c.user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'cart_item_not_found'
            USING HINT = 'Cart item not found or does not belong to the authenticated user.';
    END IF;

    -- Validate product still active
    IF NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = v_item.product_id
          AND is_active   = TRUE
          AND archived_at IS NULL
    ) THEN
        RAISE EXCEPTION 'product_unavailable'
            USING HINT = 'This product is no longer available.';
    END IF;

    -- Check current stock from database (never trust client stock)
    SELECT available_quantity INTO v_inv_qty
    FROM public.inventory
    WHERE product_id = v_item.product_id;

    IF v_inv_qty IS NULL THEN
        RAISE EXCEPTION 'no_inventory_record'
            USING HINT = 'Inventory record not found for this product.';
    END IF;

    IF p_quantity > v_inv_qty THEN
        RAISE EXCEPTION 'exceeds_stock'
            USING HINT = 'Requested quantity exceeds available stock (' || v_inv_qty || ' units).';
    END IF;

    UPDATE public.cart_items
    SET quantity   = p_quantity,
        updated_at = NOW()
    WHERE id = p_cart_item_id
    RETURNING * INTO v_item;

    RETURN v_item;
END;
$$;

COMMENT ON FUNCTION public.set_my_cart_item_quantity(UUID, INTEGER) IS
    'Sets the quantity of an owned cart item. Validates ownership, product status, and stock. '
    'quantity must be >= 1. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: increment_my_cart_item(p_cart_item_id uuid)
-- Increments the quantity by 1. Validates stock ceiling.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_my_cart_item(p_cart_item_id UUID)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item    public.cart_items;
    v_inv_qty INTEGER;
    v_new_qty INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    -- Fetch and lock item, validating ownership
    SELECT ci.* INTO v_item
    FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id     = p_cart_item_id
      AND c.user_id = auth.uid()
    FOR UPDATE OF ci;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'cart_item_not_found'
            USING HINT = 'Cart item not found or does not belong to the authenticated user.';
    END IF;

    -- Check current stock
    SELECT available_quantity INTO v_inv_qty
    FROM public.inventory
    WHERE product_id = v_item.product_id;

    v_new_qty := v_item.quantity + 1;

    IF v_new_qty > COALESCE(v_inv_qty, 0) THEN
        RAISE EXCEPTION 'exceeds_stock'
            USING HINT = 'Cannot exceed available stock.';
    END IF;

    UPDATE public.cart_items
    SET quantity   = v_new_qty,
        updated_at = NOW()
    WHERE id = p_cart_item_id
    RETURNING * INTO v_item;

    RETURN v_item;
END;
$$;

COMMENT ON FUNCTION public.increment_my_cart_item(UUID) IS
    'Increments a cart item quantity by 1. Validates stock ceiling. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: decrement_my_cart_item(p_cart_item_id uuid)
-- Decrements quantity by 1. If quantity reaches 0, removes the item.
-- Returns NULL when the item is removed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_my_cart_item(p_cart_item_id UUID)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item    public.cart_items;
BEGIN
    PERFORM public.assert_active_customer();

    SELECT ci.* INTO v_item
    FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id     = p_cart_item_id
      AND c.user_id = auth.uid()
    FOR UPDATE OF ci;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'cart_item_not_found'
            USING HINT = 'Cart item not found or does not belong to the authenticated user.';
    END IF;

    IF v_item.quantity > 1 THEN
        UPDATE public.cart_items
        SET quantity   = v_item.quantity - 1,
            updated_at = NOW()
        WHERE id = p_cart_item_id
        RETURNING * INTO v_item;
        RETURN v_item;
    ELSE
        -- quantity = 1 → remove the item (per FEATURE_BEHAVIOUR.md)
        DELETE FROM public.cart_items WHERE id = p_cart_item_id;
        RETURN NULL;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.decrement_my_cart_item(UUID) IS
    'Decrements a cart item quantity by 1. If qty reaches 0, removes the item and returns NULL. '
    'SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: remove_my_cart_item(p_cart_item_id uuid)
-- Removes a specific cart item. Must be owned by the caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_my_cart_item(p_cart_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    WITH deleted AS (
        DELETE FROM public.cart_items
        WHERE id = p_cart_item_id
          AND cart_id IN (
              SELECT id FROM public.carts WHERE user_id = auth.uid()
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted FROM deleted;

    IF v_deleted = 0 THEN
        RAISE EXCEPTION 'cart_item_not_found'
            USING HINT = 'Cart item not found or does not belong to the authenticated user.';
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.remove_my_cart_item(UUID) IS
    'Removes a cart item owned by the caller. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- FUNCTION: clear_my_cart()
-- Removes all items from the authenticated customer's cart.
-- The cart row itself is preserved.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_my_cart()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    PERFORM public.assert_active_customer();

    WITH deleted AS (
        DELETE FROM public.cart_items
        WHERE cart_id IN (
            SELECT id FROM public.carts WHERE user_id = auth.uid()
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM deleted;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.clear_my_cart() IS
    'Removes all items from the caller''s cart. Returns count of deleted items. '
    'Never accepts a cart_id — always uses auth.uid(). SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_or_create_my_cart()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_product_to_my_cart(UUID)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_cart_item_quantity(UUID, INTEGER)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_my_cart_item(UUID)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_my_cart_item(UUID)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_my_cart_item(UUID)                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_my_cart()                               FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_or_create_my_cart()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_product_to_my_cart(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_cart_item_quantity(UUID, INTEGER)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_my_cart_item(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_my_cart_item(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_my_cart_item(UUID)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_my_cart()                            TO authenticated;

-- =============================================================================
-- END OF MIGRATION 020
-- =============================================================================
