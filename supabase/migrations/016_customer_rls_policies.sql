-- =============================================================================
-- Migration 016: Customer RLS Policies
-- =============================================================================
-- Depends on: 014 (helper functions), 015 (RLS enabled)
-- Implements row-level policies for all customer-owned tables.
--
-- PRINCIPLES:
--   1. Ownership enforced via auth.uid() — never trust client-supplied user_id.
--   2. Blocked/deleted customers (status != 'active') cannot mutate data.
--   3. Indirect ownership (order_items, order_status_history, payments) is
--      resolved through parent-table JOIN — never trust a supplied order_id.
--   4. All INSERT/UPDATE/DELETE on commerce tables goes through secure RPCs
--      (migrations 019–023). Direct mutations are denied here.
--   5. Audit tables (order_status_history, payments) are SELECT-only for customers.
-- =============================================================================

-- ===========================================================================
-- TABLE: profiles
-- ===========================================================================

-- Customers may SELECT only their own profile row.
CREATE POLICY "profiles: customer select own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Customers may not INSERT directly (trigger handles creation).
-- Customers may not UPDATE directly (use update_my_profile RPC).
-- Customers may not DELETE directly (use account deletion Edge Function).

-- ===========================================================================
-- TABLE: carts
-- ===========================================================================

-- Customers may SELECT their own cart.
CREATE POLICY "carts: customer select own"
    ON public.carts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- All cart mutations go through RPCs (get_or_create_my_cart, etc.)
-- Direct INSERT/UPDATE/DELETE denied for authenticated users.
-- SECURITY DEFINER RPCs bypass RLS and handle all mutations.

-- ===========================================================================
-- TABLE: cart_items
-- ===========================================================================

-- Customers may SELECT items in their own cart only.
-- Ownership resolved through carts.user_id — never trusts cart_id directly.
CREATE POLICY "cart_items: customer select own"
    ON public.cart_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id      = cart_items.cart_id
              AND carts.user_id = auth.uid()
        )
    );

-- All cart_item mutations go through SECURITY DEFINER RPCs.
-- Direct INSERT/UPDATE/DELETE denied.

-- ===========================================================================
-- TABLE: user_addresses
-- ===========================================================================

-- Customers may SELECT their own addresses.
CREATE POLICY "user_addresses: customer select own"
    ON public.user_addresses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Address mutations go through SECURITY DEFINER RPCs (migration 021).
-- Direct INSERT/UPDATE/DELETE denied.

-- ===========================================================================
-- TABLE: orders
-- ===========================================================================

-- Customers may SELECT their own orders.
CREATE POLICY "orders: customer select own"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ORDER CREATION: via secure Place Order Edge Function (service role) only.
-- ORDER UPDATE: via admin_update_order_status / cancel_my_order RPCs only.
-- Direct INSERT/UPDATE/DELETE denied.

-- ===========================================================================
-- TABLE: order_items
-- ===========================================================================

-- Customers may SELECT items belonging to their own orders.
-- Ownership resolved through orders.user_id.
CREATE POLICY "order_items: customer select own"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id      = order_items.order_id
              AND orders.user_id = auth.uid()
        )
    );

-- Immutable after order creation. No INSERT/UPDATE/DELETE for customers.

-- ===========================================================================
-- TABLE: order_status_history
-- ===========================================================================

-- Customers may SELECT status history for their own orders.
CREATE POLICY "order_status_history: customer select own"
    ON public.order_status_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id      = order_status_history.order_id
              AND orders.user_id = auth.uid()
        )
    );

-- Append-only. No customer INSERT/UPDATE/DELETE — all writes via secure RPCs.

-- ===========================================================================
-- TABLE: payments
-- ===========================================================================

-- Customers may SELECT payment records for their own orders.
CREATE POLICY "payments: customer select own"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id      = payments.order_id
              AND orders.user_id = auth.uid()
        )
    );

-- Immutable after order creation. No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: coupon_usage
-- ===========================================================================

-- Customers may SELECT their own coupon usage records.
CREATE POLICY "coupon_usage: customer select own"
    ON public.coupon_usage
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- All writes via secure order creation Edge Function (service role).
-- No customer INSERT/UPDATE/DELETE.

-- ===========================================================================
-- TABLE: user_notifications
-- ===========================================================================

-- Customers may SELECT their own notification delivery records.
CREATE POLICY "user_notifications: customer select own"
    ON public.user_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Customers may UPDATE their own notifications (mark as read).
-- Restricted to is_read and read_at columns only (enforced by RPC in 023).
-- Direct UPDATE allowed here but the mark-as-read RPC is preferred.
CREATE POLICY "user_notifications: customer update own read status"
    ON public.user_notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- No customer INSERT (created by Edge Function) or DELETE.

-- =============================================================================
-- END OF MIGRATION 016
-- =============================================================================
