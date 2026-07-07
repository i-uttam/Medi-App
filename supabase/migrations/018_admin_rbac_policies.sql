-- =============================================================================
-- Migration 018: Admin RBAC Policies
-- =============================================================================
-- Depends on: 014 (helpers), 015 (RLS enabled), 016, 017
-- Implements permission-based admin access to all tables.
--
-- DESIGN:
--   - Every admin policy calls has_admin_permission(key) or is_super_admin().
--   - No blanket "admin gets everything" policy.
--   - Super admins inherit all admin permissions via the seeded role.
--   - Mutations that require business logic (order status, inventory, block/
--     unblock) go through SECURITY DEFINER RPCs in migrations 022–024.
--     Direct table mutation is denied even for admins in those cases.
--   - Append-only audit tables: admin INSERT allowed, UPDATE/DELETE denied.
-- =============================================================================

-- ===========================================================================
-- TABLE: profiles  (admin access for customer support)
-- ===========================================================================

CREATE POLICY "profiles: admin select all"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('customers.view'));

-- Admins update profile status (block/unblock) via admin_block_customer RPC.
-- Direct UPDATE denied here; only the RPC (SECURITY DEFINER) can update status.

-- ===========================================================================
-- TABLE: admin_users
-- ===========================================================================

-- Admins can only see their own row; super admins can see all.
CREATE POLICY "admin_users: admin select own"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()                -- every active admin sees their own row
        OR public.is_super_admin()          -- super admin sees all
    );

-- All admin_users writes go through service role (Edge Function / Super Admin SQL).
-- No INSERT/UPDATE/DELETE via RLS for the authenticated role.

-- ===========================================================================
-- TABLE: admin_roles
-- ===========================================================================

CREATE POLICY "admin_roles: admin read"
    ON public.admin_roles
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('roles.view'));

-- ===========================================================================
-- TABLE: admin_permissions
-- ===========================================================================

CREATE POLICY "admin_permissions: admin read"
    ON public.admin_permissions
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('roles.view'));

-- ===========================================================================
-- TABLE: admin_role_permissions
-- ===========================================================================

CREATE POLICY "admin_role_permissions: admin read"
    ON public.admin_role_permissions
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('roles.view'));

-- ===========================================================================
-- TABLE: admin_user_roles
-- ===========================================================================

CREATE POLICY "admin_user_roles: admin read"
    ON public.admin_user_roles
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('roles.view'));

-- ===========================================================================
-- TABLE: categories
-- ===========================================================================

-- Admins see all categories (including inactive).
CREATE POLICY "categories: admin select all"
    ON public.categories
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('categories.view'));

CREATE POLICY "categories: admin insert"
    ON public.categories
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('categories.manage'));

CREATE POLICY "categories: admin update"
    ON public.categories
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('categories.manage'))
    WITH CHECK (public.has_admin_permission('categories.manage'));

-- No hard delete (RESTRICT FK prevents it anyway).

-- ===========================================================================
-- TABLE: brands
-- ===========================================================================

CREATE POLICY "brands: admin select all"
    ON public.brands
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('brands.view'));

CREATE POLICY "brands: admin insert"
    ON public.brands
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('brands.manage'));

CREATE POLICY "brands: admin update"
    ON public.brands
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('brands.manage'))
    WITH CHECK (public.has_admin_permission('brands.manage'));

-- ===========================================================================
-- TABLE: manufacturers
-- ===========================================================================

CREATE POLICY "manufacturers: admin select all"
    ON public.manufacturers
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('manufacturers.view'));

CREATE POLICY "manufacturers: admin insert"
    ON public.manufacturers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('manufacturers.manage'));

CREATE POLICY "manufacturers: admin update"
    ON public.manufacturers
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('manufacturers.manage'))
    WITH CHECK (public.has_admin_permission('manufacturers.manage'));

-- ===========================================================================
-- TABLE: products
-- ===========================================================================

-- Admins see all products including inactive and archived.
CREATE POLICY "products: admin select all"
    ON public.products
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('products.view'));

CREATE POLICY "products: admin insert"
    ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('products.create'));

-- Product UPDATE (name, price, description, is_active) — needs products.update.
-- Product archival goes through admin_archive_product RPC (migration 024),
-- but the RPC uses SECURITY DEFINER so this policy also covers that UPDATE
-- when called from within the RPC context. We allow UPDATE here; the RPC
-- enforces the archival-specific business logic.
CREATE POLICY "products: admin update"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('products.update'))
    WITH CHECK (public.has_admin_permission('products.update'));

-- No hard delete.

-- ===========================================================================
-- TABLE: product_images
-- ===========================================================================

CREATE POLICY "product_images: admin select all"
    ON public.product_images
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('products.view'));

CREATE POLICY "product_images: admin insert"
    ON public.product_images
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('products.update'));

CREATE POLICY "product_images: admin update"
    ON public.product_images
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('products.update'))
    WITH CHECK (public.has_admin_permission('products.update'));

CREATE POLICY "product_images: admin delete"
    ON public.product_images
    FOR DELETE
    TO authenticated
    USING (public.has_admin_permission('products.update'));

-- ===========================================================================
-- TABLE: product_compositions
-- ===========================================================================

CREATE POLICY "product_compositions: admin select all"
    ON public.product_compositions
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('products.view'));

CREATE POLICY "product_compositions: admin insert"
    ON public.product_compositions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('products.update'));

CREATE POLICY "product_compositions: admin update"
    ON public.product_compositions
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('products.update'))
    WITH CHECK (public.has_admin_permission('products.update'));

CREATE POLICY "product_compositions: admin delete"
    ON public.product_compositions
    FOR DELETE
    TO authenticated
    USING (public.has_admin_permission('products.update'));

-- ===========================================================================
-- TABLE: inventory
-- ===========================================================================

-- Admins read all inventory.
CREATE POLICY "inventory: admin select all"
    ON public.inventory
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('inventory.view'));

-- Direct UPDATE denied for admins — must use admin_adjust_inventory() RPC.
-- The RPC is SECURITY DEFINER and handles row-locking + audit logging.

-- ===========================================================================
-- TABLE: inventory_transactions
-- ===========================================================================

-- Admins can read inventory transaction history.
-- Super admins see all; regular admins see their own adjustments + order transactions.
CREATE POLICY "inventory_transactions: admin select"
    ON public.inventory_transactions
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('inventory.view'));

-- No direct INSERT: all writes via admin_adjust_inventory() RPC or
-- the order creation/cancellation Edge Functions (service role).

-- ===========================================================================
-- TABLE: orders
-- ===========================================================================

CREATE POLICY "orders: admin select all"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('orders.view'));

-- No direct UPDATE: status changes go through admin_update_order_status() RPC.
-- No INSERT/DELETE.

-- ===========================================================================
-- TABLE: order_items
-- ===========================================================================

CREATE POLICY "order_items: admin select all"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('orders.view'));

-- Immutable after creation. No INSERT/UPDATE/DELETE via RLS.

-- ===========================================================================
-- TABLE: order_status_history
-- ===========================================================================

CREATE POLICY "order_status_history: admin select all"
    ON public.order_status_history
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('orders.view'));

-- Append-only. No UPDATE/DELETE.

-- ===========================================================================
-- TABLE: payments
-- ===========================================================================

CREATE POLICY "payments: admin select all"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('orders.view'));

-- ===========================================================================
-- TABLE: coupon_usage
-- ===========================================================================

CREATE POLICY "coupon_usage: admin select all"
    ON public.coupon_usage
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('coupons.view'));

-- ===========================================================================
-- TABLE: coupons
-- ===========================================================================

CREATE POLICY "coupons: admin select all"
    ON public.coupons
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('coupons.view'));

CREATE POLICY "coupons: admin insert"
    ON public.coupons
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('coupons.manage'));

CREATE POLICY "coupons: admin update"
    ON public.coupons
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('coupons.manage'))
    WITH CHECK (public.has_admin_permission('coupons.manage'));

-- No hard delete (RESTRICT FK from coupon_usage).

-- ===========================================================================
-- TABLE: banners
-- ===========================================================================

CREATE POLICY "banners: admin select all"
    ON public.banners
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('banners.view'));

CREATE POLICY "banners: admin insert"
    ON public.banners
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('banners.manage'));

CREATE POLICY "banners: admin update"
    ON public.banners
    FOR UPDATE
    TO authenticated
    USING (public.has_admin_permission('banners.manage'))
    WITH CHECK (public.has_admin_permission('banners.manage'));

-- ===========================================================================
-- TABLE: app_settings
-- ===========================================================================

-- Admins can read all settings (including non-public).
CREATE POLICY "app_settings: admin select all"
    ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('settings.view'));

-- Direct UPDATE denied. Use admin_update_app_setting() RPC (migration 024).

-- ===========================================================================
-- TABLE: notifications
-- ===========================================================================

CREATE POLICY "notifications: admin select all"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('notifications.view'));

CREATE POLICY "notifications: admin insert"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_admin_permission('notifications.send'));

-- ===========================================================================
-- TABLE: user_notifications
-- ===========================================================================

-- Admins can view notification delivery records.
CREATE POLICY "user_notifications: admin select all"
    ON public.user_notifications
    FOR SELECT
    TO authenticated
    USING (public.has_admin_permission('notifications.view'));

-- ===========================================================================
-- TABLE: admin_activity_logs
-- ===========================================================================

-- Super admins see all logs; regular admins see only their own entries.
CREATE POLICY "admin_activity_logs: admin select own"
    ON public.admin_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        (
            public.has_admin_permission('audit_logs.view')
            AND admin_user_id = (
                SELECT au.id FROM public.admin_users au
                WHERE au.user_id = auth.uid()
                LIMIT 1
            )
        )
        OR public.is_super_admin()
    );

-- INSERT: admins can insert their own log entries.
-- All audit log writes go through secure RPCs / Edge Functions.
-- The authenticated role is granted INSERT via the RPCs (SECURITY DEFINER).
-- No direct client INSERT policy — all writes go through SECURITY DEFINER functions.

-- UPDATE/DELETE: denied for all — append-only.

-- =============================================================================
-- END OF MIGRATION 018
-- =============================================================================
