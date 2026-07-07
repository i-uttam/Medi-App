-- =============================================================================
-- Migration 004: Inventory
-- =============================================================================
-- Depends on: 001, 002, 003
-- Creates: inventory, inventory_transactions
--
-- CIRCULAR FK NOTE:
--   inventory_transactions.order_id references orders.
--   orders is created in migration 008.
--   To break this circular dependency at the migration level:
--     1. inventory_transactions is created here WITHOUT the orders FK.
--     2. Migration 008 adds the FK via ALTER TABLE after orders is created.
--   The order_id column exists and is nullable from the start.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: inventory
-- One row per product. Tracks available stock.
--
-- Inventory model (documented decision):
--   available_quantity = physical stock currently available for new orders.
--                        This is the only quantity reduced when an order is
--                        placed. It represents "can I sell this right now?"
--   reserved_quantity  = quantity currently reserved by a background workflow
--                        (not used in v1; seeded as 0).
--                        Included for schema forward-compatibility without
--                        a future migration to add the column.
--
-- There is NO separate "physical_quantity" column in v1.
-- Conceptually: physical_quantity = available_quantity + reserved_quantity.
--
-- Constraints prevent negative values at the database level, providing a
-- safety net below the application-layer row-level locking.
--
-- ON DELETE RESTRICT: cannot delete a product that has an inventory row.
-- (Products are archived, not deleted.)
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
    product_id              UUID        PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
    available_quantity      INTEGER     NOT NULL DEFAULT 0,
    reserved_quantity       INTEGER     NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Hard database-level guards against impossible inventory states.
    CONSTRAINT chk_inventory_available_quantity
        CHECK (available_quantity >= 0),
    CONSTRAINT chk_inventory_reserved_quantity
        CHECK (reserved_quantity >= 0)
);

COMMENT ON TABLE inventory IS
    'Single inventory record per product. '
    'available_quantity = stock available for new orders (reduced on order placement). '
    'reserved_quantity = held by active workflow reservations (v1: always 0). '
    'Both columns have CHECK constraints preventing negative values.';

COMMENT ON COLUMN inventory.available_quantity IS
    'Units available for immediate purchase. Reduced atomically on order placement. '
    'Restored atomically on order cancellation. Must be >= 0.';

COMMENT ON COLUMN inventory.reserved_quantity IS
    'Units held by a reservation workflow. Not used in v1 (COD, no pre-auth). '
    'Column exists for forward-compatibility. Always 0 in current version.';

-- ---------------------------------------------------------------------------
-- TABLE: inventory_transactions
-- Immutable ledger of every stock change. Append-only in normal workflows.
--
-- quantity_change: signed integer.
--   Positive = stock increased (admin_addition, order_cancellation_restore).
--   Negative = stock decreased (order_placement, admin_reduction).
--   Zero-sum correction: admin_correction stores the absolute delta.
--
-- quantity_before / quantity_after: snapshot of available_quantity before
-- and after this transaction. Enables full audit reconstruction.
--
-- order_id: nullable. FK to orders added in migration 008 (see note above).
-- admin_user_id: nullable. References admin_users for manual adjustments.
--
-- reason: required for admin_addition, admin_reduction, admin_correction.
--   Enforced by application layer (Edge Function). Not a DB constraint
--   because order_placement transactions don't need a human reason.
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
    id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID                        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    transaction_type    inventory_transaction_type  NOT NULL,
    quantity_change     INTEGER                     NOT NULL,
    quantity_before     INTEGER                     NOT NULL,
    quantity_after      INTEGER                     NOT NULL,
    order_id            UUID,               -- FK added in migration 008 (avoids circular dep)
    admin_user_id       UUID                REFERENCES admin_users(id) ON DELETE SET NULL,
    reason              TEXT,
    metadata            JSONB               DEFAULT '{}',
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- quantity_after must equal quantity_before + quantity_change
    CONSTRAINT chk_inv_tx_quantity_math
        CHECK (quantity_after = quantity_before + quantity_change),

    -- quantity_after must be non-negative (mirrors the inventory constraint)
    CONSTRAINT chk_inv_tx_quantity_after_positive
        CHECK (quantity_after >= 0),

    -- quantity_before must be non-negative
    CONSTRAINT chk_inv_tx_quantity_before_positive
        CHECK (quantity_before >= 0)
);

COMMENT ON TABLE inventory_transactions IS
    'Immutable ledger of all stock changes. Every change to inventory.available_quantity '
    'must produce exactly one row here. Rows are never updated or deleted in normal operations. '
    'The order_id FK is added in migration 008 to resolve circular dependency.';

COMMENT ON COLUMN inventory_transactions.quantity_change IS
    'Signed delta. Positive = stock increase. Negative = stock decrease.';

COMMENT ON COLUMN inventory_transactions.quantity_before IS
    'Snapshot of inventory.available_quantity before this transaction.';

COMMENT ON COLUMN inventory_transactions.quantity_after IS
    'Snapshot of inventory.available_quantity after this transaction. '
    'Must equal quantity_before + quantity_change (enforced by constraint).';

COMMENT ON COLUMN inventory_transactions.order_id IS
    'NULL for admin adjustments and initial stock. '
    'References orders.id for order_placement and order_cancellation_restore. '
    'FK constraint added in migration 008.';

-- =============================================================================
-- END OF MIGRATION 004
-- =============================================================================
