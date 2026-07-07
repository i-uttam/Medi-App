-- =============================================================================
-- Migration 001: Extensions and Domain Types
-- =============================================================================
-- Must be run first. All subsequent migrations depend on these types.
-- Safe to run on a fresh Supabase PostgreSQL database.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- pg_trgm: trigram similarity for fuzzy text search on product names
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- unaccent: accent-insensitive search support
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ---------------------------------------------------------------------------
-- ENUM: user_status
-- Customer account lifecycle states.
-- ---------------------------------------------------------------------------
CREATE TYPE user_status AS ENUM (
    'active',
    'blocked',
    'deleted'
);

-- ---------------------------------------------------------------------------
-- ENUM: admin_status
-- Admin user account states.
-- ---------------------------------------------------------------------------
CREATE TYPE admin_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);

-- ---------------------------------------------------------------------------
-- ENUM: address_type
-- Supported address labels for delivery addresses.
-- ---------------------------------------------------------------------------
CREATE TYPE address_type AS ENUM (
    'home',
    'work',
    'other'
);

-- ---------------------------------------------------------------------------
-- ENUM: inventory_transaction_type
-- All valid reasons for an inventory quantity change.
-- return_restore included for future compatibility without schema migration.
-- ---------------------------------------------------------------------------
CREATE TYPE inventory_transaction_type AS ENUM (
    'initial_stock',
    'admin_addition',
    'admin_reduction',
    'admin_correction',
    'order_placement',
    'order_cancellation_restore',
    'return_restore'
);

-- ---------------------------------------------------------------------------
-- ENUM: order_status
-- Complete order lifecycle. Transition rules are enforced by application
-- logic (Edge Function), not by a database constraint, to allow flexibility.
-- The allowed transition matrix is documented in docs/PRD.md Section 6.
-- ---------------------------------------------------------------------------
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

-- ---------------------------------------------------------------------------
-- ENUM: payment_method
-- Only cash_on_delivery in current version.
-- Additional values (e.g. razorpay, upi) added here in future versions
-- without breaking existing data.
-- ---------------------------------------------------------------------------
CREATE TYPE payment_method AS ENUM (
    'cash_on_delivery'
);

-- ---------------------------------------------------------------------------
-- ENUM: payment_status
-- ---------------------------------------------------------------------------
CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
);

-- ---------------------------------------------------------------------------
-- ENUM: discount_type
-- Coupon discount calculation mode.
-- ---------------------------------------------------------------------------
CREATE TYPE discount_type AS ENUM (
    'percentage',
    'fixed'
);

-- ---------------------------------------------------------------------------
-- ENUM: notification_type
-- What kind of event the notification represents.
-- ---------------------------------------------------------------------------
CREATE TYPE notification_type AS ENUM (
    'order_update',
    'promotion',
    'system',
    'broadcast'
);

-- ---------------------------------------------------------------------------
-- ENUM: notification_target_type
-- Who the notification is addressed to.
-- ---------------------------------------------------------------------------
CREATE TYPE notification_target_type AS ENUM (
    'all',
    'individual'
);

-- ---------------------------------------------------------------------------
-- ENUM: admin_activity_action
-- All auditable admin actions. Adding a new auditable action requires
-- an ALTER TYPE ... ADD VALUE migration in the future.
-- ---------------------------------------------------------------------------
CREATE TYPE admin_activity_action AS ENUM (
    'product_created',
    'product_updated',
    'product_archived',
    'category_created',
    'category_updated',
    'brand_created',
    'brand_updated',
    'manufacturer_created',
    'manufacturer_updated',
    'inventory_adjusted',
    'order_status_updated',
    'order_cancelled',
    'customer_blocked',
    'customer_unblocked',
    'banner_created',
    'banner_updated',
    'coupon_created',
    'coupon_updated',
    'app_settings_updated',
    'admin_user_created',
    'admin_user_updated',
    'admin_role_assigned',
    'admin_role_created',
    'admin_role_updated',
    'admin_permission_updated',
    'notification_sent'
);

-- =============================================================================
-- END OF MIGRATION 001
-- =============================================================================
