-- =============================================================================
-- Migration 003: Product Catalogue
-- =============================================================================
-- Depends on: 001, 002
-- Creates: categories, brands, manufacturers, products,
--          product_images, product_compositions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: categories
-- Therapeutic or product categories used to organise the medicine catalogue.
--
-- Deletion strategy: RESTRICT — cannot delete a category that has products
-- referencing it. This prevents accidental orphaning of historical orders
-- (order_items store a product_id which references a product that has a
-- category_id). Admin must reassign or archive products first.
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    slug            TEXT        NOT NULL UNIQUE,
    description     TEXT,
    image_url       TEXT,
    display_order   INTEGER     NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_categories_display_order CHECK (display_order >= 0)
);

COMMENT ON TABLE categories IS
    'Medicine browsing taxonomy. Deleting a category is restricted if '
    'products reference it to protect historical order integrity.';

-- ---------------------------------------------------------------------------
-- TABLE: brands
-- Medicine brand names (e.g. Cipla, Sun Pharma).
--
-- Deletion strategy: RESTRICT — cannot delete a brand that products reference.
-- ---------------------------------------------------------------------------
CREATE TABLE brands (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    logo_url    TEXT,
    description TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE brands IS
    'Medicine brand registry. ON DELETE RESTRICT prevents removal of brands '
    'with associated products.';

-- ---------------------------------------------------------------------------
-- TABLE: manufacturers
-- Medicine manufacturers (may differ from brand).
--
-- Deletion strategy: RESTRICT for same reason as brands.
-- ---------------------------------------------------------------------------
CREATE TABLE manufacturers (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    address     TEXT,
    contact     TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: products
-- The central medicine catalogue entry.
--
-- All money values in INTEGER PAISE (1 rupee = 100 paise).
-- ₹50.00 is stored as 5000.
--
-- Archival strategy:
--   is_active = FALSE: product hidden from customers; purchasable by nobody.
--   archived_at IS NOT NULL: product permanently removed from catalogue.
--   Archived products are NEVER hard-deleted because order_items reference
--   product_id for historical context (though order_items store snapshots,
--   the FK reference provides optional JOIN access).
--
-- category_id, brand_id, manufacturer_id ON DELETE RESTRICT:
--   Prevents deleting a category/brand/manufacturer while products exist.
--   This is safe because we never hard-delete these lookup records either.
--
-- search_vector:
--   A tsvector column maintained by a trigger (migration 012/013).
--   Populated from product-level text: name, description, uses, pack_size.
--   Brand and manufacturer names are added to the vector by a separate
--   trigger on those tables (defined in migration 013).
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT        NOT NULL,
    slug                    TEXT        NOT NULL UNIQUE,
    sku                     TEXT        NOT NULL UNIQUE,
    category_id             UUID        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id                UUID        REFERENCES brands(id) ON DELETE RESTRICT,
    manufacturer_id         UUID        REFERENCES manufacturers(id) ON DELETE RESTRICT,
    description             TEXT,
    uses                    TEXT,
    pack_size               TEXT,                   -- e.g. "10 tablets", "100ml"
    mrp_paise               INTEGER     NOT NULL,
    selling_price_paise     INTEGER     NOT NULL,
    low_stock_threshold     INTEGER     NOT NULL DEFAULT 10,
    is_active               BOOLEAN     NOT NULL DEFAULT FALSE,  -- inactive until admin activates
    is_featured             BOOLEAN     NOT NULL DEFAULT FALSE,
    is_best_seller          BOOLEAN     NOT NULL DEFAULT FALSE,
    search_vector           TSVECTOR,               -- maintained by trigger in migration 013
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at             TIMESTAMPTZ,            -- NULL = not archived; non-NULL = archived

    -- Money constraints
    CONSTRAINT chk_products_mrp_positive
        CHECK (mrp_paise > 0),
    CONSTRAINT chk_products_selling_price_positive
        CHECK (selling_price_paise > 0),
    CONSTRAINT chk_products_selling_price_lte_mrp
        CHECK (selling_price_paise <= mrp_paise),
    CONSTRAINT chk_products_low_stock_threshold
        CHECK (low_stock_threshold >= 0),

    -- Archived products must be inactive
    CONSTRAINT chk_products_archived_is_inactive
        CHECK (archived_at IS NULL OR is_active = FALSE)
);

COMMENT ON TABLE products IS
    'Medicine catalogue. All monetary values in integer paise. '
    'Products are soft-deleted (archived_at) to preserve historical order references.';

COMMENT ON COLUMN products.mrp_paise IS
    'Maximum Retail Price in paise (integer). ₹50.00 = 5000.';

COMMENT ON COLUMN products.selling_price_paise IS
    'Actual customer-facing price in paise. Must be <= mrp_paise.';

COMMENT ON COLUMN products.archived_at IS
    'NULL = not archived. Non-NULL = soft-archived timestamp. '
    'Archived products are always inactive and never shown to customers. '
    'The row is never hard-deleted to preserve order_items FK references.';

COMMENT ON COLUMN products.search_vector IS
    'Maintained by trigger. Contains product name, description, uses, pack_size. '
    'Brand and manufacturer names added by cross-table triggers.';

-- ---------------------------------------------------------------------------
-- TABLE: product_images
-- Multiple images per product with deterministic display order.
--
-- Primary image constraint: enforced by a PARTIAL UNIQUE INDEX below
-- (only one row with is_primary = TRUE per product_id).
--
-- ON DELETE CASCADE: if a product is ever physically removed (emergency
-- admin action), its images are removed too. In normal operation, products
-- are archived, not deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE product_images (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url       TEXT        NOT NULL,
    alt_text        TEXT,
    display_order   INTEGER     NOT NULL DEFAULT 0,
    is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_product_images_display_order CHECK (display_order >= 0)
);

-- Partial unique index: only one primary image per product.
-- Allows multiple is_primary = FALSE rows but at most one is_primary = TRUE.
CREATE UNIQUE INDEX udx_product_images_primary
    ON product_images (product_id)
    WHERE is_primary = TRUE;

COMMENT ON TABLE product_images IS
    'Product image gallery. At most one image per product may have is_primary = TRUE '
    '(enforced by partial unique index udx_product_images_primary).';

-- ---------------------------------------------------------------------------
-- TABLE: product_compositions
-- Active ingredient breakdown per product (e.g. Paracetamol 500mg).
-- Multiple compositions per product for combination medicines.
-- ---------------------------------------------------------------------------
CREATE TABLE product_compositions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    composition_name    TEXT        NOT NULL,
    strength            TEXT,                   -- e.g. "500mg", "10%"
    display_order       INTEGER     NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_product_compositions_display_order CHECK (display_order >= 0)
);

COMMENT ON TABLE product_compositions IS
    'Active ingredient list for each product. '
    'Composition names are included in the product search_vector via trigger.';

-- =============================================================================
-- END OF MIGRATION 003
-- =============================================================================
