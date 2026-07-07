-- =============================================================================
-- Migration 017: Catalogue and Content RLS Policies
-- =============================================================================
-- Depends on: 014 (helpers), 015 (RLS enabled)
-- Implements policies for catalogue, inventory, banners, settings, coupons,
-- and notifications tables.
--
-- CUSTOMER ACCESS RULES:
--   - categories/brands/manufacturers: active rows only
--   - products: is_active = TRUE AND archived_at IS NULL
--   - product_images/compositions: parent product must be customer-visible
--   - inventory: SELECT available_quantity only — no direct writes
--   - inventory_transactions: DENIED (use get_product_availability RPC)
--   - banners: is_active + within date window
--   - app_settings: is_public = TRUE rows only
--   - coupons: DENIED (validate via validate_my_coupon RPC)
--   - notifications: DENIED (accessed via user_notifications JOIN)
-- =============================================================================

-- ===========================================================================
-- TABLE: categories
-- ===========================================================================

-- Authenticated customers see only active categories.
CREATE POLICY "categories: customer read active"
    ON public.categories
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: brands
-- ===========================================================================

CREATE POLICY "brands: customer read active"
    ON public.brands
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- ===========================================================================
-- TABLE: manufacturers
-- ===========================================================================

CREATE POLICY "manufacturers: customer read active"
    ON public.manufacturers
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- ===========================================================================
-- TABLE: products
-- ===========================================================================

-- Customers see only active, non-archived products.
-- Archived products (archived_at IS NOT NULL) are always is_active = FALSE
-- by CHECK constraint, but we check both for defence-in-depth.
CREATE POLICY "products: customer read active"
    ON public.products
    FOR SELECT
    TO authenticated
    USING (
        is_active    = TRUE
        AND archived_at IS NULL
    );

-- No customer INSERT/UPDATE/DELETE (admin only via secure functions).

-- ===========================================================================
-- TABLE: product_images
-- ===========================================================================

-- Customers may read images only for customer-visible products.
CREATE POLICY "product_images: customer read for visible products"
    ON public.product_images
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id          = product_images.product_id
              AND products.is_active   = TRUE
              AND products.archived_at IS NULL
        )
    );

-- ===========================================================================
-- TABLE: product_compositions
-- ===========================================================================

-- Same visibility rule as product_images.
CREATE POLICY "product_compositions: customer read for visible products"
    ON public.product_compositions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id          = product_compositions.product_id
              AND products.is_active   = TRUE
              AND products.archived_at IS NULL
        )
    );

-- ===========================================================================
-- TABLE: inventory
-- ===========================================================================

-- Customers may read inventory (to determine stock status / available qty).
-- They cannot write to inventory under any circumstances.
-- The available_quantity column is used by the app to show in-stock status.
CREATE POLICY "inventory: customer read"
    ON public.inventory
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id          = inventory.product_id
              AND products.is_active   = TRUE
              AND products.archived_at IS NULL
        )
    );

-- No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: inventory_transactions
-- ===========================================================================

-- Denied for all customers. Internal ledger — exposed only to admins.
-- No SELECT policy created means default deny applies.

-- ===========================================================================
-- TABLE: banners
-- ===========================================================================

-- Customers see banners that are active and within their scheduled window.
-- NULL starts_at means no start restriction; NULL ends_at means no end restriction.
CREATE POLICY "banners: customer read active and scheduled"
    ON public.banners
    FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at   IS NULL OR ends_at   >  NOW())
    );

-- No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: app_settings
-- ===========================================================================

-- Customers may read only rows marked is_public = TRUE.
-- Internal / admin-only settings (is_public = FALSE) are never returned.
CREATE POLICY "app_settings: customer read public"
    ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (is_public = TRUE);

-- No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: coupons
-- ===========================================================================

-- Customers have NO direct SELECT access to the coupons table.
-- This prevents coupon code enumeration attacks.
-- Coupon validation goes through the validate_my_coupon() RPC (migration 023)
-- which is SECURITY DEFINER and returns only the validation result.
-- No policies created = default deny.

-- ===========================================================================
-- TABLE: notifications
-- ===========================================================================

-- Customers have NO direct SELECT on the notifications table.
-- They access notification content through user_notifications (migration 016)
-- which has a JOIN path to notifications via the FK.
-- No policies created = default deny.

-- =============================================================================
-- END OF MIGRATION 017
-- =============================================================================
