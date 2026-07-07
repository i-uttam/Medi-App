-- =============================================================================
-- Migration 011: Admin Activity Logs
-- =============================================================================
-- Depends on: 001, 002
-- Creates: admin_activity_logs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: admin_activity_logs
-- Immutable append-only audit trail for all significant admin actions.
--
-- admin_user_id ON DELETE SET NULL: if an admin account is deactivated and
--   its auth user deleted, log entries remain but the actor reference becomes
--   NULL. This preserves the audit trail.
--
-- old_values / new_values: JSONB snapshots of the changed data.
--   Sensitive authentication secrets must NEVER appear in these fields.
--   The Edge Function is responsible for scrubbing sensitive data before
--   writing. See docs/DATABASE_ARCHITECTURE.md for scrubbing rules.
--
-- entity_type: the domain object affected (e.g. 'product', 'order', 'coupon').
-- entity_id: the UUID of the affected row (TEXT to handle both UUID and
--   non-UUID identifiers without a type cast).
--
-- Normal application workflows must not UPDATE or DELETE rows in this table.
-- The RLS policy (STEP 3) will enforce INSERT-only from authenticated admins.
-- Supabase service role or Super Admin database access is required for
-- any corrective action on log records.
--
-- Indexed fields: admin_user_id, created_at (in migration 012).
-- ---------------------------------------------------------------------------
CREATE TABLE admin_activity_logs (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID                    REFERENCES admin_users(id) ON DELETE SET NULL,
    action          admin_activity_action   NOT NULL,
    entity_type     TEXT                    NOT NULL,
    entity_id       TEXT,
    description     TEXT,
    old_values      JSONB,
    new_values      JSONB,
    metadata        JSONB                   DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_activity_logs IS
    'Immutable append-only audit log of all admin actions. '
    'Rows must never be updated or deleted in normal workflows. '
    'RLS (STEP 3) will enforce INSERT-only access for admin users. '
    'old_values and new_values must not contain authentication secrets.';

COMMENT ON COLUMN admin_activity_logs.entity_id IS
    'UUID of the affected row stored as TEXT to avoid type-specific casting. '
    'May be NULL for actions that do not target a specific row (e.g. login).';

COMMENT ON COLUMN admin_activity_logs.old_values IS
    'JSONB snapshot of data BEFORE the change. '
    'Must not include passwords, tokens, or secret values.';

COMMENT ON COLUMN admin_activity_logs.new_values IS
    'JSONB snapshot of data AFTER the change. '
    'Must not include passwords, tokens, or secret values.';

COMMENT ON COLUMN admin_activity_logs.ip_address IS
    'Request IP address recorded for security auditing. '
    'Retrieved from the Edge Function request context.';

-- Actions requiring audit log entries (reference for Edge Function developers):
-- product_created, product_updated, product_archived
-- category_created, category_updated
-- brand_created, brand_updated
-- manufacturer_created, manufacturer_updated
-- inventory_adjusted
-- order_status_updated, order_cancelled
-- customer_blocked, customer_unblocked
-- banner_created, banner_updated
-- coupon_created, coupon_updated
-- app_settings_updated
-- admin_user_created, admin_user_updated
-- admin_role_assigned, admin_role_created, admin_role_updated
-- admin_permission_updated
-- notification_sent

-- =============================================================================
-- END OF MIGRATION 011
-- =============================================================================
