-- =============================================================================
-- Migration 012: Indexes and Full-Text Search Architecture
-- =============================================================================
-- Depends on: 001–011 (all tables must exist)
-- Creates: performance indexes, partial indexes, GIN indexes for FTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
-- Customer lookup by phone is the primary auth lookup path
CREATE INDEX idx_profiles_phone  ON profiles (phone)  WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_status ON profiles (status);

-- ---------------------------------------------------------------------------
-- ADMIN USERS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_admin_users_user_id ON admin_users (user_id);
CREATE INDEX idx_admin_users_status  ON admin_users (status);

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
-- slug is already UNIQUE (index created by constraint)
-- Active category lookup for customer home screen
CREATE INDEX idx_categories_is_active     ON categories (is_active);
CREATE INDEX idx_categories_display_order ON categories (display_order);

-- ---------------------------------------------------------------------------
-- BRANDS
-- ---------------------------------------------------------------------------
-- slug is already UNIQUE
CREATE INDEX idx_brands_is_active ON brands (is_active);

-- ---------------------------------------------------------------------------
-- MANUFACTURERS
-- ---------------------------------------------------------------------------
-- slug is already UNIQUE
CREATE INDEX idx_manufacturers_is_active ON manufacturers (is_active);

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------
-- slug and sku are already UNIQUE (indexes created by constraints)

-- Category/brand/manufacturer browsing queries
CREATE INDEX idx_products_category_id    ON products (category_id);
CREATE INDEX idx_products_brand_id       ON products (brand_id)       WHERE brand_id IS NOT NULL;
CREATE INDEX idx_products_manufacturer_id ON products (manufacturer_id) WHERE manufacturer_id IS NOT NULL;

-- Status filtering (most common query pattern: active, non-archived products)
CREATE INDEX idx_products_is_active      ON products (is_active);
CREATE INDEX idx_products_archived_at    ON products (archived_at)    WHERE archived_at IS NOT NULL;

-- Featured / bestseller homepage queries
CREATE INDEX idx_products_is_featured    ON products (is_featured)    WHERE is_featured = TRUE;
CREATE INDEX idx_products_is_best_seller ON products (is_best_seller)  WHERE is_best_seller = TRUE;

-- Composite index for the most common customer listing query:
-- active, non-archived products sorted by name
CREATE INDEX idx_products_active_name ON products (name)
    WHERE is_active = TRUE AND archived_at IS NULL;

-- Trigram index for fuzzy name search (supports ILIKE '%query%' efficiently)
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- FULL-TEXT SEARCH ARCHITECTURE
-- ---------------------------------------------------------------------------
-- Strategy: tsvector column (products.search_vector) maintained by triggers.
-- Trigger is defined in migration 013 (alongside all other updated_at triggers).
--
-- The search_vector is built from:
--   - products.name           (weight A — highest priority)
--   - products.description    (weight C)
--   - products.uses           (weight C)
--   - products.pack_size      (weight D)
--   - brands.name             (weight B — populated by trigger on brands UPDATE)
--   - manufacturers.name      (weight B — populated by trigger on manufacturers UPDATE)
--   - product_compositions.composition_name (weight B — populated by composition trigger)
--
-- Implementation note on brand/manufacturer search:
--   The products.search_vector trigger reads brand and manufacturer names via
--   a SELECT on the related table. This is a standard trigger pattern (not a
--   generated column) and is legal in PostgreSQL. Generated columns cannot
--   use subqueries; triggers can.
--
--   When a brand or manufacturer name changes, a trigger on that table calls
--   a function that updates search_vector for all referencing products.
--   This is defined in migration 013.
--
-- GIN index on the tsvector column:
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- ---------------------------------------------------------------------------
-- PRODUCT IMAGES
-- ---------------------------------------------------------------------------
-- Primary image lookup per product (most common query)
CREATE INDEX idx_product_images_product_id ON product_images (product_id);
-- udx_product_images_primary already created in migration 003

-- ---------------------------------------------------------------------------
-- PRODUCT COMPOSITIONS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_product_compositions_product_id ON product_compositions (product_id);

-- Trigram index on composition name for search
CREATE INDEX idx_product_compositions_name_trgm
    ON product_compositions USING GIN (composition_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- INVENTORY
-- ---------------------------------------------------------------------------
-- product_id is PRIMARY KEY (already indexed)
-- Low stock alert query: products where available_quantity <= threshold
-- The actual threshold comparison uses products.low_stock_threshold,
-- so this supports range queries on inventory levels
CREATE INDEX idx_inventory_available_quantity ON inventory (available_quantity);

-- ---------------------------------------------------------------------------
-- INVENTORY TRANSACTIONS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_inv_tx_product_id  ON inventory_transactions (product_id);
CREATE INDEX idx_inv_tx_order_id    ON inventory_transactions (order_id)
    WHERE order_id IS NOT NULL;
CREATE INDEX idx_inv_tx_created_at  ON inventory_transactions (created_at DESC);
CREATE INDEX idx_inv_tx_type        ON inventory_transactions (transaction_type);

-- ---------------------------------------------------------------------------
-- CARTS
-- ---------------------------------------------------------------------------
-- user_id is already UNIQUE (one cart per user)
-- No additional indexes needed

-- ---------------------------------------------------------------------------
-- CART ITEMS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_cart_items_cart_id    ON cart_items (cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);

-- ---------------------------------------------------------------------------
-- USER ADDRESSES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_user_addresses_user_id ON user_addresses (user_id);
-- udx_user_addresses_default already created in migration 006

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------
-- code is already UNIQUE
-- Active coupon lookup (common validation path)
CREATE INDEX idx_coupons_is_active ON coupons (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_coupons_expires_at ON coupons (expires_at) WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- COUPON USAGE
-- ---------------------------------------------------------------------------
CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage (coupon_id);
CREATE INDEX idx_coupon_usage_user_id   ON coupon_usage (user_id);
-- order_id is already UNIQUE (constraint added in migration 008)

-- Per-user usage count query (coupon_id + user_id)
CREATE INDEX idx_coupon_usage_coupon_user ON coupon_usage (coupon_id, user_id);

-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------
-- user_id + created_at DESC: customer's order history (most common query)
CREATE INDEX idx_orders_user_id    ON orders (user_id, created_at DESC);
-- order_number is already UNIQUE
CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
-- Admin search by customer: join path via user_id
CREATE INDEX idx_orders_idempotency ON orders (user_id, idempotency_key);

-- ---------------------------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id)
    WHERE product_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ORDER STATUS HISTORY
-- ---------------------------------------------------------------------------
CREATE INDEX idx_order_status_history_order_id  ON order_status_history (order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history (created_at DESC);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
-- order_id is already UNIQUE

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_notifications_target_type ON notifications (target_type);
CREATE INDEX idx_notifications_created_at  ON notifications (created_at DESC);

-- ---------------------------------------------------------------------------
-- USER NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_user_notifications_user_id ON user_notifications (user_id);
-- Unread notifications query (most common)
CREATE INDEX idx_user_notifications_unread  ON user_notifications (user_id, is_read)
    WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- BANNERS
-- ---------------------------------------------------------------------------
-- Active banners for home screen
CREATE INDEX idx_banners_active_display ON banners (display_order)
    WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- ADMIN ACTIVITY LOGS
-- ---------------------------------------------------------------------------
CREATE INDEX idx_admin_logs_admin_user_id ON admin_activity_logs (admin_user_id);
CREATE INDEX idx_admin_logs_created_at    ON admin_activity_logs (created_at DESC);
CREATE INDEX idx_admin_logs_action        ON admin_activity_logs (action);
CREATE INDEX idx_admin_logs_entity        ON admin_activity_logs (entity_type, entity_id);

-- =============================================================================
-- END OF MIGRATION 012
-- =============================================================================
