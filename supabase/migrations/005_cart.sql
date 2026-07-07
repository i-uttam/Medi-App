-- =============================================================================
-- Migration 005: Shopping Cart
-- =============================================================================
-- Depends on: 001, 002, 003
-- Creates: carts, cart_items
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: carts
-- Server-side persistent cart. One active cart per authenticated user.
--
-- user_id: references auth.users directly (not profiles) to maintain the
-- cart even during a profile soft-delete workflow.
--
-- ON DELETE CASCADE on user_id: if the auth user is deleted (account deletion
-- flow), the cart and its items are cascade-deleted. Cart data is not a
-- historical business record that needs retention.
--
-- Uniqueness: enforced by UNIQUE constraint on user_id, ensuring one cart
-- per user. Future multi-cart support (wishlists, saved carts) would require
-- a different design.
-- ---------------------------------------------------------------------------
CREATE TABLE carts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE carts IS
    'Server-side shopping cart. One cart per authenticated customer. '
    'The cart does NOT store authoritative pricing — prices are always '
    'fetched from products at checkout time.';

-- ---------------------------------------------------------------------------
-- TABLE: cart_items
-- Individual product selections within a cart.
--
-- Pricing note:
--   cart_items does NOT store price. Authoritative price is always read from
--   products.selling_price_paise at checkout time. The client display price
--   may be stale; the backend recalculates on every checkout.
--
-- Unavailable product behaviour:
--   If products.is_active becomes FALSE or products.archived_at IS NOT NULL
--   after an item was added to the cart, the cart_item row remains.
--   The application (cart load endpoint) detects and flags these items.
--   Customers must remove flagged items before checkout can proceed.
--   This is documented in FEATURE_BEHAVIOUR.md.
--
-- product_id ON DELETE RESTRICT: prevents hard-deleting a product while it
-- is in a customer's cart. (Products are archived, not deleted, so this
-- is a safety net for emergency situations.)
--
-- UNIQUE (cart_id, product_id): one row per product per cart.
-- Quantity updates are done via UPDATE, not INSERT.
-- ---------------------------------------------------------------------------
CREATE TABLE cart_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER     NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (cart_id, product_id),

    -- Quantity must be at least 1 at the database level.
    -- Upper bound (available stock) enforced by application layer.
    CONSTRAINT chk_cart_items_quantity CHECK (quantity > 0)
);

COMMENT ON TABLE cart_items IS
    'Individual product selections in a cart. '
    'One row per product per cart (UNIQUE constraint). '
    'Does NOT store price — always recalculated from products at checkout. '
    'Rows with inactive or archived products remain until the customer removes them.';

COMMENT ON COLUMN cart_items.quantity IS
    'Must be >= 1 (database constraint). Upper bound validated by application '
    'against current inventory.available_quantity.';

-- =============================================================================
-- END OF MIGRATION 005
-- =============================================================================
