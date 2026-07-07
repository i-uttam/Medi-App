-- =============================================================================
-- Migration 015: Enable Row Level Security on All Tables
-- =============================================================================
-- Depends on: 001–014
-- Enables RLS on every public-schema application table.
-- FORCE ROW LEVEL SECURITY is applied to customer-facing tables so that
-- even the table owner (postgres role) is subject to policies.
--
-- IMPORTANT: After this migration, ALL tables deny access by default until
-- explicit policies are added in migrations 016–018. Do not grant client
-- access until those migrations are applied.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Customer-owned tables
-- These store personal data — FORCE RLS to protect against table-owner bypass.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            FORCE ROW LEVEL SECURITY;

ALTER TABLE public.carts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts               FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cart_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items          FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_addresses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses      FORCE ROW LEVEL SECURITY;

ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              FORCE ROW LEVEL SECURITY;

ALTER TABLE public.order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         FORCE ROW LEVEL SECURITY;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            FORCE ROW LEVEL SECURITY;

ALTER TABLE public.coupon_usage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage        FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications  FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Catalogue tables (public read for customers, admin write)
-- ---------------------------------------------------------------------------

ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          FORCE ROW LEVEL SECURITY;

ALTER TABLE public.brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands              FORCE ROW LEVEL SECURITY;

ALTER TABLE public.manufacturers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers       FORCE ROW LEVEL SECURITY;

ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            FORCE ROW LEVEL SECURITY;

ALTER TABLE public.product_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images      FORCE ROW LEVEL SECURITY;

ALTER TABLE public.product_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_compositions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory           FORCE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.banners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners             FORCE ROW LEVEL SECURITY;

ALTER TABLE public.app_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings        FORCE ROW LEVEL SECURITY;

ALTER TABLE public.coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons             FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Admin-only tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users         FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles         FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions   FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles    FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- VERIFICATION: Query to find any public-schema tables without RLS enabled.
-- Run this after applying all migrations; expect zero rows.
-- ---------------------------------------------------------------------------
-- SELECT relname AS table_name
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relkind = 'r'
--   AND NOT c.relrowsecurity
-- ORDER BY relname;

-- =============================================================================
-- END OF MIGRATION 015
-- =============================================================================
