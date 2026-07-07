-- =============================================================================
-- Migration 010: Banners and App Settings
-- =============================================================================
-- Depends on: 001
-- Creates: banners, app_settings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: banners
-- Home screen promotional banners managed by admins.
--
-- link_type controls how link_value is interpreted:
--   'product'  → link_value = product UUID
--   'category' → link_value = category UUID
--   'url'      → link_value = external URL string
--   'none'     → link_value = NULL (banner is decorative, no action on tap)
--
-- Scheduling:
--   Visibility = is_active = TRUE
--               AND (starts_at IS NULL OR starts_at <= NOW())
--               AND (ends_at IS NULL OR ends_at >= NOW())
--   Evaluated at query time by the backend; no cron job required.
--
-- starts_at / ends_at:
--   Both optional. When both set, starts_at must be before ends_at.
--
-- display_order: lower number = shown first.
-- ---------------------------------------------------------------------------
CREATE TABLE banners (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    image_url       TEXT        NOT NULL,
    link_type       TEXT        NOT NULL DEFAULT 'none',
    link_value      TEXT,
    display_order   INTEGER     NOT NULL DEFAULT 0,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_banners_link_type
        CHECK (link_type IN ('product', 'category', 'url', 'none')),

    CONSTRAINT chk_banners_link_value
        CHECK (link_type = 'none' OR link_value IS NOT NULL),

    CONSTRAINT chk_banners_date_range
        CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),

    CONSTRAINT chk_banners_display_order
        CHECK (display_order >= 0)
);

COMMENT ON TABLE banners IS
    'Home screen promotional banners. Visibility determined at query time by: '
    'is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW() (NULLs treated as unbounded). '
    'link_type controls how link_value is interpreted (product UUID, category UUID, URL, or none).';

-- ---------------------------------------------------------------------------
-- TABLE: app_settings
-- Key-value configuration store for runtime platform settings.
--
-- Using a typed key-value table rather than a single-row config table for:
--   - Easy addition of new settings without schema migrations
--   - Per-setting type metadata for validation
--   - Audit trail compatibility (each row independently auditable)
--
-- value_type: documents what type the value string represents.
--   Validation of the actual value is done by the Edge Function / admin API.
--   Supported: 'integer', 'boolean', 'string', 'json'
--
-- is_public: TRUE = safe to return to unauthenticated mobile app requests
--   (e.g. minimum_order_value, support_phone).
--   FALSE = admin-only setting.
--
-- description: human-readable explanation for the admin UI.
--
-- The service role key must NEVER be used to manage app_settings from a
-- client application. All writes must go through authenticated Edge Functions.
--
-- Seeded with required configuration keys (no business values set here).
-- Application uses sensible defaults when a setting is missing.
-- ---------------------------------------------------------------------------
CREATE TABLE app_settings (
    key         TEXT    PRIMARY KEY,
    value       TEXT    NOT NULL,
    value_type  TEXT    NOT NULL DEFAULT 'string',
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_app_settings_value_type
        CHECK (value_type IN ('integer', 'boolean', 'string', 'json')),

    CONSTRAINT chk_app_settings_key_format
        CHECK (key ~ '^[a-z_]+$')   -- snake_case keys only
);

COMMENT ON TABLE app_settings IS
    'Key-value runtime configuration. All writes via authenticated Edge Functions. '
    'is_public = TRUE settings may be returned to authenticated mobile app. '
    'NEVER expose settings with sensitive values to unauthenticated clients.';

COMMENT ON COLUMN app_settings.value IS
    'Always stored as TEXT. Interpreted according to value_type. '
    'Validation of numeric/boolean values is the Edge Function''s responsibility.';

-- ---------------------------------------------------------------------------
-- SEED: Required setting keys with safe default values.
-- Super Admin updates values via the admin panel.
-- Values here are structural defaults; they must be reviewed before launch.
-- ---------------------------------------------------------------------------
INSERT INTO app_settings (key, value, value_type, is_public, description) VALUES
    ('delivery_charge_paise',        '4900',    'integer', TRUE,  'Standard delivery charge in paise. ₹49 = 4900.'),
    ('free_delivery_threshold_paise','49900',   'integer', TRUE,  'Order subtotal threshold above which delivery is free. ₹499 = 49900.'),
    ('minimum_order_value_paise',    '9900',    'integer', TRUE,  'Minimum cart subtotal to place an order. ₹99 = 9900.'),
    ('support_phone',                '',        'string',  TRUE,  'Customer support phone number.'),
    ('support_email',                '',        'string',  TRUE,  'Customer support email address.'),
    ('support_whatsapp',             '',        'string',  TRUE,  'Customer support WhatsApp number.'),
    ('maintenance_mode',             'false',   'boolean', FALSE, 'If true, mobile app shows maintenance screen.'),
    ('minimum_supported_app_version','1.0.0',   'string',  TRUE,  'Minimum app version allowed to connect.'),
    ('latest_app_version',           '1.0.0',   'string',  TRUE,  'Latest released app version.'),
    ('force_update',                 'false',   'boolean', TRUE,  'If true, app versions below minimum_supported_app_version are blocked.'),
    ('cod_enabled',                  'true',    'boolean', TRUE,  'Whether Cash on Delivery is available.'),
    ('low_stock_threshold_default',  '10',      'integer', FALSE, 'Default low stock threshold for products that have not set their own.');

-- =============================================================================
-- END OF MIGRATION 010
-- =============================================================================
