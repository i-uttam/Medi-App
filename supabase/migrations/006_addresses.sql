-- =============================================================================
-- Migration 006: User Addresses
-- =============================================================================
-- Depends on: 001
-- Creates: user_addresses
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: user_addresses
-- Delivery addresses owned by authenticated customers.
--
-- Ownership: user_id references auth.users(id). RLS (migration STEP 3)
-- ensures customers can only access their own addresses.
--
-- Phone normalisation:
--   Stored as provided by the customer (validated E.164 by the application).
--   Database does not enforce E.164 format to remain flexible for future
--   international support. Application layer enforces the format.
--
-- Postal code:
--   Stored as TEXT. Indian 6-digit PIN codes validated by application layer.
--   Database uses TEXT to support future international formats without
--   a migration.
--
-- Country code: ISO 3166-1 alpha-2 (e.g. 'IN'). Default 'IN' for current
-- India-only scope. TEXT allows future expansion.
--
-- Default address strategy:
--   At most one row per user may have is_default = TRUE.
--   Enforced by a PARTIAL UNIQUE INDEX (one default per user).
--   When a default address is deleted, the application layer must update
--   another address to is_default = TRUE (documented in EDGE_CASES.md).
--
-- Historical order data:
--   Deleting a user_address does NOT affect historical orders because
--   orders store an immutable address snapshot (inline columns on orders,
--   see migration 008). The FK from orders to user_addresses is nullable.
--
-- ON DELETE CASCADE from auth.users:
--   Address data is personal to the user. If the auth user is deleted
--   (account deletion flow), all their addresses are cascade-deleted.
--   Historical orders retain their snapshot data independently.
-- ---------------------------------------------------------------------------
CREATE TABLE user_addresses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT        NOT NULL,
    phone           TEXT        NOT NULL,
    address_line_1  TEXT        NOT NULL,
    address_line_2  TEXT,
    landmark        TEXT,
    city            TEXT        NOT NULL,
    state           TEXT        NOT NULL,
    postal_code     TEXT        NOT NULL,
    country_code    TEXT        NOT NULL DEFAULT 'IN',
    address_type    address_type NOT NULL DEFAULT 'home',
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_user_addresses_full_name   CHECK (LENGTH(TRIM(full_name)) >= 2),
    CONSTRAINT chk_user_addresses_phone       CHECK (LENGTH(TRIM(phone)) >= 7),
    CONSTRAINT chk_user_addresses_country_code CHECK (LENGTH(TRIM(country_code)) = 2)
);

COMMENT ON TABLE user_addresses IS
    'Customer delivery addresses. Deleting an address does not affect '
    'historical order data because orders store an immutable address snapshot.';

COMMENT ON COLUMN user_addresses.is_default IS
    'At most one TRUE per user, enforced by partial unique index.';

COMMENT ON COLUMN user_addresses.postal_code IS
    'Stored as TEXT. Application validates 6-digit Indian PIN codes. '
    'TEXT allows future international formats without migration.';

COMMENT ON COLUMN user_addresses.country_code IS
    'ISO 3166-1 alpha-2. Default IN for current India-only scope.';

-- Partial unique index: only one default address per user.
CREATE UNIQUE INDEX udx_user_addresses_default
    ON user_addresses (user_id)
    WHERE is_default = TRUE;

-- =============================================================================
-- END OF MIGRATION 006
-- =============================================================================
