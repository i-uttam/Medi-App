-- =============================================================================
-- Migration 013: Updated-At Triggers and Full-Text Search Triggers
-- =============================================================================
-- Depends on: 001–012 (all tables must exist)
-- Creates:
--   - set_updated_at() function (reusable trigger function)
--   - updated_at triggers for all mutable tables
--   - products_search_vector_update() function + trigger
--   - brand_name_search_update() function + trigger
--   - manufacturer_name_search_update() function + trigger
--   - product_composition_search_update() function + trigger
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: set_updated_at
-- Reusable trigger function that sets updated_at = NOW() before any UPDATE.
-- Applied to all mutable tables below.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
    'Generic trigger function to set updated_at = NOW() on UPDATE. '
    'Applied to all mutable tables via CREATE TRIGGER statements below.';

-- ---------------------------------------------------------------------------
-- Apply set_updated_at() to all mutable tables
-- Naming convention: trg_<table>_set_updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_profiles_set_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admin_users_set_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admin_roles_set_updated_at
    BEFORE UPDATE ON admin_roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_set_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_brands_set_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_manufacturers_set_updated_at
    BEFORE UPDATE ON manufacturers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_set_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_set_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carts_set_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cart_items_set_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_addresses_set_updated_at
    BEFORE UPDATE ON user_addresses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_coupons_set_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_set_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_set_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_banners_set_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- app_settings uses updated_at but has a different structure (no id PK);
-- the set_updated_at function works for it since it sets NEW.updated_at
CREATE TRIGGER trg_app_settings_set_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- FULL-TEXT SEARCH TRIGGERS
-- =============================================================================
-- Strategy: products.search_vector is a regular tsvector column (not GENERATED)
-- maintained by triggers. This allows subqueries to pull brand/manufacturer
-- names from related tables, which generated columns cannot do.
--
-- Text weight assignments:
--   A (highest): product name
--   B (high):    brand name, manufacturer name, composition names
--   C (medium):  product description, uses
--   D (lowest):  pack_size
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: update_products_search_vector
-- Called by the products INSERT/UPDATE trigger.
-- Reads brand.name and manufacturer.name via subquery (legal in triggers).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_brand_name        TEXT := '';
    v_manufacturer_name TEXT := '';
    v_compositions      TEXT := '';
BEGIN
    -- Fetch related brand name (may be NULL if brand_id is NULL)
    IF NEW.brand_id IS NOT NULL THEN
        SELECT name INTO v_brand_name FROM brands WHERE id = NEW.brand_id;
        v_brand_name := COALESCE(v_brand_name, '');
    END IF;

    -- Fetch related manufacturer name
    IF NEW.manufacturer_id IS NOT NULL THEN
        SELECT name INTO v_manufacturer_name FROM manufacturers WHERE id = NEW.manufacturer_id;
        v_manufacturer_name := COALESCE(v_manufacturer_name, '');
    END IF;

    -- Fetch all composition names for this product
    SELECT COALESCE(STRING_AGG(composition_name || ' ' || COALESCE(strength, ''), ' '), '')
    INTO v_compositions
    FROM product_compositions
    WHERE product_id = NEW.id;

    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(unaccent(NEW.name), '')),         'A') ||
        setweight(to_tsvector('english', COALESCE(unaccent(v_brand_name), '')),     'B') ||
        setweight(to_tsvector('english', COALESCE(unaccent(v_manufacturer_name), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(unaccent(v_compositions), '')),   'B') ||
        setweight(to_tsvector('english', COALESCE(unaccent(NEW.description), '')),  'C') ||
        setweight(to_tsvector('english', COALESCE(unaccent(NEW.uses), '')),         'C') ||
        setweight(to_tsvector('english', COALESCE(unaccent(NEW.pack_size), '')),    'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_products_search_vector() IS
    'Maintains products.search_vector. Reads brand, manufacturer, and '
    'composition names via subquery. Called on every product INSERT or UPDATE.';

CREATE TRIGGER trg_products_search_vector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_products_search_vector();

-- ---------------------------------------------------------------------------
-- FUNCTION: update_products_search_vector_for_brand
-- When a brand's name changes, re-index all products referencing that brand.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_products_search_vector_for_brand()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Touch all products referencing the updated brand to fire their trigger
    UPDATE products
    SET updated_at = NOW()
    WHERE brand_id = NEW.id;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_products_search_vector_for_brand() IS
    'When brands.name changes, triggers a products UPDATE to rebuild search_vector '
    'for all products in that brand. The products trigger does the actual rebuild.';

CREATE TRIGGER trg_brand_name_change_reindex
    AFTER UPDATE OF name ON brands
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION update_products_search_vector_for_brand();

-- ---------------------------------------------------------------------------
-- FUNCTION: update_products_search_vector_for_manufacturer
-- When a manufacturer's name changes, re-index all referencing products.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_products_search_vector_for_manufacturer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET updated_at = NOW()
    WHERE manufacturer_id = NEW.id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manufacturer_name_change_reindex
    AFTER UPDATE OF name ON manufacturers
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION update_products_search_vector_for_manufacturer();

-- ---------------------------------------------------------------------------
-- FUNCTION: update_products_search_vector_for_composition
-- When compositions change (INSERT, UPDATE, DELETE), re-index the product.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_products_search_vector_for_composition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- Handle DELETE: use OLD.product_id; INSERT/UPDATE: use NEW.product_id
    v_product_id := COALESCE(NEW.product_id, OLD.product_id);

    UPDATE products
    SET updated_at = NOW()
    WHERE id = v_product_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_composition_change_reindex
    AFTER INSERT OR UPDATE OR DELETE ON product_compositions
    FOR EACH ROW EXECUTE FUNCTION update_products_search_vector_for_composition();

-- =============================================================================
-- END OF MIGRATION 013
-- =============================================================================
