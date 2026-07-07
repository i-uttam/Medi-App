-- =============================================================================
-- Migration 002: Customer Profiles and Admin Architecture
-- =============================================================================
-- Depends on: 001_extensions_and_types.sql
-- Creates: profiles, admin_users, admin_roles, admin_permissions,
--          admin_role_permissions, admin_user_roles
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: profiles
-- One row per Supabase Auth user (customers only).
-- id matches auth.users.id exactly (1:1 mapping).
--
-- Phone normalisation:
--   Stored in E.164 format (e.g. +919876543210).
--   The mobile app submits the phone number in E.164 via Supabase Auth.
--   Application layer normalises before storage; database stores as-provided
--   by auth.users.phone.
--
-- Email normalisation:
--   Stored as LOWER(TRIM(email)). Applied in the trigger below.
--
-- Deletion strategy:
--   ON DELETE CASCADE from auth.users means deleting the auth user
--   cascades to this profile. In practice, customer account deletion
--   performs a soft-delete (status = 'deleted', PII anonymised) via an
--   Edge Function, and the auth.users row is deleted by Supabase Auth.
--   Hard physical deletion is only done by the Edge Function workflow.
--
-- Security note:
--   The trigger that creates this row uses SECURITY DEFINER to run as
--   the superuser but the function body is limited and does not trust
--   arbitrary auth.users.raw_user_meta_data for privileged fields.
--   role assignment MUST NOT originate from auth metadata.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    phone           TEXT,                           -- E.164, mirrors auth.users.phone
    email           TEXT,                           -- lowercase trimmed
    avatar_url      TEXT,
    status          user_status NOT NULL DEFAULT 'active',
    block_reason    TEXT,                           -- populated when status = 'blocked'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure block_reason is only set when account is blocked
    CONSTRAINT chk_block_reason CHECK (
        (status = 'blocked' AND block_reason IS NOT NULL) OR
        (status != 'blocked')
    )
);

COMMENT ON TABLE profiles IS
    'Customer profile data. One row per auth.users entry for customer accounts. '
    'Admin accounts have a row in admin_users instead.';

COMMENT ON COLUMN profiles.phone IS
    'Phone number in E.164 format (e.g. +919876543210). '
    'Application layer must normalise before storage.';

COMMENT ON COLUMN profiles.status IS
    'active: normal operation. blocked: cannot authenticate. '
    'deleted: PII anonymised, auth user deleted.';

-- ---------------------------------------------------------------------------
-- FUNCTION + TRIGGER: Auto-create profile on new auth user
--
-- SECURITY DEFINER: runs with elevated privileges so it can insert into
-- profiles after a new row is created in auth.users.
-- search_path is locked to public to prevent search-path hijacking.
--
-- Trust policy: only copies id, phone, and lowercased email from auth.users.
-- Never reads raw_user_meta_data for privileged fields.
-- Never grants admin access based on auth metadata.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, email)
    VALUES (
        NEW.id,
        NEW.phone,
        CASE WHEN NEW.email IS NOT NULL THEN LOWER(TRIM(NEW.email)) ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but do not block auth user creation.
        -- A missing profile will be detected and created on first app load.
        RAISE WARNING 'handle_new_auth_user: failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- TABLE: admin_users
-- Maps auth.users entries that have admin privileges.
-- Admin accounts have a profile row AND an admin_users row.
-- The admin_users row is created by the Super Admin; it is never auto-created.
--
-- ON DELETE RESTRICT on user_id: prevents accidentally deleting an auth user
-- while they still have admin records. Must deactivate admin first.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
    status      admin_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS
    'Admin user registry. user_id links to auth.users. '
    'Only Super Admins may create rows here.';

-- ---------------------------------------------------------------------------
-- TABLE: admin_roles
-- Named roles that group permissions. System roles (super_admin, admin) are
-- seeded below and protected by is_system_role = TRUE.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_roles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL UNIQUE,
    description     TEXT,
    is_system_role  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN admin_roles.is_system_role IS
    'System roles cannot be deleted and cannot have their name changed.';

-- ---------------------------------------------------------------------------
-- TABLE: admin_permissions
-- Granular capabilities. Keys use dot notation (resource.action).
-- ---------------------------------------------------------------------------
CREATE TABLE admin_permissions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key  TEXT        NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: admin_role_permissions
-- Many-to-many: which permissions belong to which role.
-- Cascade on role delete (role deleted → its permission mappings removed).
-- Cascade on permission delete (permission removed → role loses it).
-- ---------------------------------------------------------------------------
CREATE TABLE admin_role_permissions (
    role_id         UUID        NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id   UUID        NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- TABLE: admin_user_roles
-- Many-to-many: which roles an admin user has.
-- Cascade on admin_user delete.
-- RESTRICT on role delete: cannot delete a role while admins hold it.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_user_roles (
    admin_user_id   UUID        NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    role_id         UUID        NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (admin_user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- SEED: System roles (structural metadata, not runtime business data)
-- These are infrastructure-level records required for the system to function.
-- ---------------------------------------------------------------------------
INSERT INTO admin_roles (name, description, is_system_role) VALUES
    ('super_admin', 'Full platform access. Can manage admin users and roles.', TRUE),
    ('admin',       'Standard admin access. Cannot manage admin users or roles.', TRUE);

-- ---------------------------------------------------------------------------
-- SEED: System permissions
-- ---------------------------------------------------------------------------
INSERT INTO admin_permissions (permission_key, description) VALUES
    ('dashboard.view',          'View dashboard metrics'),
    ('products.view',           'View products'),
    ('products.create',         'Create new products'),
    ('products.update',         'Edit existing products'),
    ('products.archive',        'Archive products'),
    ('categories.view',         'View categories'),
    ('categories.manage',       'Create and edit categories'),
    ('brands.view',             'View brands'),
    ('brands.manage',           'Create and edit brands'),
    ('manufacturers.view',      'View manufacturers'),
    ('manufacturers.manage',    'Create and edit manufacturers'),
    ('inventory.view',          'View inventory levels and history'),
    ('inventory.adjust',        'Perform inventory adjustments'),
    ('orders.view',             'View all orders'),
    ('orders.update_status',    'Advance order status'),
    ('orders.cancel',           'Cancel orders'),
    ('customers.view',          'View customer accounts'),
    ('customers.block',         'Block and unblock customer accounts'),
    ('banners.view',            'View banners'),
    ('banners.manage',          'Create and edit banners'),
    ('coupons.view',            'View coupons'),
    ('coupons.manage',          'Create and edit coupons'),
    ('notifications.view',      'View sent notifications'),
    ('notifications.send',      'Send notifications to customers'),
    ('settings.view',           'View app settings'),
    ('settings.update',         'Update app settings'),
    ('admins.view',             'View admin user list'),
    ('admins.manage',           'Create, edit, and deactivate admin users'),
    ('roles.view',              'View roles and permissions'),
    ('roles.manage',            'Manage role assignments'),
    ('audit_logs.view',         'View admin activity logs');

-- ---------------------------------------------------------------------------
-- SEED: Assign all permissions to super_admin role
-- ---------------------------------------------------------------------------
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM admin_roles WHERE name = 'super_admin'),
    id
FROM admin_permissions;

-- ---------------------------------------------------------------------------
-- SEED: Assign non-super-admin permissions to admin role
-- (Excludes settings.update, admins.manage, roles.manage)
-- ---------------------------------------------------------------------------
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM admin_roles WHERE name = 'admin'),
    id
FROM admin_permissions
WHERE permission_key NOT IN (
    'settings.update',
    'admins.manage',
    'roles.manage',
    'roles.view'
);

-- =============================================================================
-- END OF MIGRATION 002
-- =============================================================================
