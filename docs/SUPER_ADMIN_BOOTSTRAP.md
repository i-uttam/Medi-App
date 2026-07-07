# Super Admin Bootstrap Guide
## Online Pharmacy Platform

**Version:** 1.0  
**Last Updated:** 2026-07-07  

---

## Overview

This guide covers the one-time manual process to create the first Super Admin user. This cannot be automated because:

1. The `admin_users` table has no direct INSERT policy for the `authenticated` role.
2. No Edge Function exists yet for admin creation.
3. Super Admin credentials must be provisioned by a human with Supabase Dashboard access.

**IMPORTANT:** Never hardcode a Super Admin email or UUID in migrations or source code.

---

## Prerequisites

Before bootstrapping a Super Admin:

- [ ] All 26 migrations applied (`supabase db push` succeeded)
- [ ] Admin roles and permissions seeded (migration 002 handles this)
- [ ] You have access to Supabase Dashboard → Authentication → Users
- [ ] You have access to Supabase SQL Editor (as `postgres`)

---

## Step 1: Create an Auth User for the Super Admin

In **Supabase Dashboard → Authentication → Users → Add User**:

| Field | Value |
|---|---|
| Email | Your real admin email |
| Password | Strong password (min 12 chars, mixed case, numbers, symbols) |
| Auto Confirm | ✅ Yes (skip email verification for the first admin) |
| Phone | (optional) |

Copy the generated **UUID** (`id` column in auth.users).

---

## Step 2: Insert into admin_users via SQL Editor

Open **Supabase Dashboard → SQL Editor** and run:

```sql
-- Replace the UUID below with the real auth.users.id
-- DO NOT hardcode this in any source file
--
-- NOTE: admin_users stores only (user_id, status).
-- full_name and email live in the profiles table (auto-created by trigger).

INSERT INTO public.admin_users (user_id, status)
VALUES (
    '<UUID_FROM_STEP_1>',   -- auth.users.id for the admin
    'active'
)
RETURNING id;
```

Copy the returned `admin_users.id` value.

---

## Step 3: Assign the super_admin Role

Still in SQL Editor:

```sql
-- Get the super_admin role ID
SELECT id FROM public.admin_roles WHERE name = 'super_admin';
-- Copy the role UUID

-- Assign the role
INSERT INTO public.admin_user_roles (admin_user_id, role_id)
VALUES (
    '<ADMIN_USER_ID_FROM_STEP_2>',
    '<SUPER_ADMIN_ROLE_ID>'
);
```

---

## Step 4: Verify the Super Admin

```sql
-- Verify the admin user exists and has the super_admin role
SELECT
    au.full_name,
    au.email,
    au.status,
    r.name AS role_name,
    COUNT(arp.permission_id) AS permission_count
FROM public.admin_users au
JOIN public.admin_user_roles aur ON aur.admin_user_id = au.id
JOIN public.admin_roles r ON r.id = aur.role_id
LEFT JOIN public.admin_role_permissions arp ON arp.role_id = r.id
WHERE au.user_id = '<UUID_FROM_STEP_1>'
GROUP BY au.full_name, au.email, au.status, r.name;

-- Expected: permission_count = 31 (all permissions via super_admin role)
```

---

## Step 5: Verify is_super_admin() works

In SQL Editor, set the auth context and verify:

```sql
-- Simulate the admin's auth context
SET LOCAL request.jwt.claims TO '{"sub":"<UUID_FROM_STEP_1>","role":"authenticated"}';

-- This should return TRUE
SELECT public.is_super_admin();

-- This should return TRUE for any permission key
SELECT public.has_admin_permission('orders.cancel');
```

---

## Step 6: Configure Admin Auth in Supabase Dashboard

1. **Auth → Providers → Email**: Ensure email/password is enabled for admin login.
2. **Auth → Providers → Phone**: Enable for customer OTP (separate from admin auth).
3. **Auth → URL Configuration**: Set the admin panel URL in "Site URL" and "Redirect URLs".

---

## Security Notes

- **Never** store the Super Admin email or UUID in source code, `.env.example`, or documentation.
- The Super Admin's auth credentials are managed entirely in Supabase Auth (not in the codebase).
- The `admin_users` table uses `status` field (active/inactive/suspended), not `profiles.status`.
- To deactivate an admin: `UPDATE admin_users SET status = 'inactive' WHERE id = '<id>';`
- To suspend an admin (temporary block): `UPDATE admin_users SET status = 'suspended' WHERE id = '<id>';`
- Password reset is handled through Supabase Dashboard or the `supabase.auth.admin.generateLink()` API.

---

## Adding Additional Admin Users

After the first Super Admin exists, additional admins can be created via:

1. The admin panel UI (when built) using a service-role Edge Function.
2. Or manually via the same SQL steps above (Steps 1–4).

The `admins.manage` permission key controls who can create/edit admin users via the panel.

---

## Role Architecture

| Role | Permission Count | Description |
|---|---|---|
| `super_admin` | 31 (all) | Full access to every feature |
| Custom roles | Variable | Granted specific permission keys only |

Super admins bypass per-permission checks because `is_super_admin()` returns TRUE and all policy checks use `OR public.is_super_admin()`.
