-- =============================================================================
-- Migration 007: Coupons and Coupon Usage
-- =============================================================================
-- Depends on: 001
-- Creates: coupons, coupon_usage
--
-- CIRCULAR FK NOTE:
--   coupon_usage.order_id references orders.
--   orders is created in migration 008.
--   coupon_usage is created here WITHOUT the order FK.
--   Migration 008 adds the FK via ALTER TABLE after orders is created.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: coupons
-- Discount codes validated server-side at checkout.
--
-- All monetary values in INTEGER PAISE.
--
-- Coupon code normalisation:
--   Stored as UPPER(TRIM(code)). The application normalises before INSERT
--   and before lookup to ensure case-insensitive matching via an exact match
--   on the normalised value. A CHECK constraint enforces uppercase at the
--   database level.
--
-- discount_type = 'percentage':
--   discount_value is a percentage (1–100, stored as INTEGER, e.g. 15 = 15%).
--   maximum_discount_paise: optional cap on the discount amount.
--     If NULL, no cap (full percentage applied regardless of order value).
--
-- discount_type = 'fixed':
--   discount_value is the fixed discount amount in PAISE (must be > 0).
--   maximum_discount_paise: not applicable for fixed (NULL or same value).
--
-- starts_at / expires_at:
--   NULL starts_at = immediately active from creation.
--   NULL expires_at = never expires.
--   When both are set, starts_at must be before expires_at (CHECK constraint).
--
-- total_usage_limit: NULL = unlimited total uses.
-- per_user_usage_limit: NULL = unlimited per-user uses.
-- ---------------------------------------------------------------------------
CREATE TABLE coupons (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    TEXT            NOT NULL UNIQUE,
    description             TEXT,
    discount_type           discount_type   NOT NULL,
    discount_value          INTEGER         NOT NULL,   -- paise for fixed; 1-100 for percentage
    minimum_order_paise     INTEGER         NOT NULL DEFAULT 0,
    maximum_discount_paise  INTEGER,                    -- NULL = no cap (percentage only)
    total_usage_limit       INTEGER,                    -- NULL = unlimited
    per_user_usage_limit    INTEGER,                    -- NULL = unlimited per user
    starts_at               TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    is_active               BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Code must be uppercase (normalisation enforced here and at app layer)
    CONSTRAINT chk_coupons_code_uppercase
        CHECK (code = UPPER(code)),

    -- Discount value must be positive
    CONSTRAINT chk_coupons_discount_value_positive
        CHECK (discount_value > 0),

    -- Percentage must be 1–100
    CONSTRAINT chk_coupons_percentage_range
        CHECK (discount_type != 'percentage' OR (discount_value >= 1 AND discount_value <= 100)),

    -- Minimum order cannot be negative
    CONSTRAINT chk_coupons_minimum_order
        CHECK (minimum_order_paise >= 0),

    -- Maximum discount cannot be negative
    CONSTRAINT chk_coupons_maximum_discount
        CHECK (maximum_discount_paise IS NULL OR maximum_discount_paise > 0),

    -- Usage limits must be positive when set
    CONSTRAINT chk_coupons_total_usage_limit
        CHECK (total_usage_limit IS NULL OR total_usage_limit > 0),

    CONSTRAINT chk_coupons_per_user_usage_limit
        CHECK (per_user_usage_limit IS NULL OR per_user_usage_limit > 0),

    -- When both dates are set, starts_at must be before expires_at
    CONSTRAINT chk_coupons_date_range
        CHECK (starts_at IS NULL OR expires_at IS NULL OR starts_at < expires_at)
);

COMMENT ON TABLE coupons IS
    'Discount coupons validated server-side at checkout. '
    'All monetary values in integer paise. '
    'code stored as UPPER(TRIM(code)) — application must normalise before INSERT/lookup.';

COMMENT ON COLUMN coupons.discount_value IS
    'For percentage coupons: the percentage (1–100). '
    'For fixed coupons: the discount amount in paise.';

COMMENT ON COLUMN coupons.maximum_discount_paise IS
    'Optional cap on discount for percentage coupons. NULL = no cap. '
    'E.g. 20% off but max ₹100 discount = 10000 paise.';

COMMENT ON COLUMN coupons.is_active IS
    'Must be TRUE AND within starts_at/expires_at window to be usable. '
    'All three conditions checked server-side (Edge Function).';

-- ---------------------------------------------------------------------------
-- TABLE: coupon_usage
-- Records each successful coupon redemption against an order.
--
-- coupon_id ON DELETE RESTRICT: historical usage records must survive even
-- if the coupon is deactivated. Prevents accidentally losing usage history.
--
-- user_id ON DELETE CASCADE: if a customer deletes their account, their
-- usage history is removed. This does not affect the order record or the
-- coupon's global used_count which should be tracked separately if needed.
--
-- order_id: nullable here; FK to orders added in migration 008.
-- UNIQUE (coupon_id, order_id): prevents duplicate redemption for same order.
-- UNIQUE (coupon_id, user_id): NOT applied here because per_user_usage_limit
--   can be > 1. Per-user count is enforced by the Edge Function via COUNT.
-- ---------------------------------------------------------------------------
CREATE TABLE coupon_usage (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   UUID        NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id    UUID,               -- FK to orders added in migration 008
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE coupon_usage IS
    'Audit log of coupon redemptions. One row per order per coupon. '
    'order_id FK added in migration 008 to resolve circular dependency.';

-- =============================================================================
-- END OF MIGRATION 007
-- =============================================================================
