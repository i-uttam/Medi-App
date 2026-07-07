# Row Level Security (RLS) Security Plan
## Online Pharmacy Platform — STEP 3 Implementation Guide

**Version:** 1.0  
**Status:** Plan (not yet implemented — to be applied in STEP 3)  
**Last Updated:** 2026-07-07  

---

## Critical Warning

> **The Supabase service role key must NEVER be included in the customer mobile application or the browser admin panel bundle.**
>
> The service role key bypasses all RLS policies. It must only exist in:
> - Supabase Edge Functions (server-side, not shipped to clients)
> - CI/CD pipelines and migration runners
> - Supabase Dashboard (admin use only)
>
> The anon key and authenticated user JWT are safe to include in client applications. They are subject to RLS.

---

## RLS Enablement Requirement

Until STEP 3 is applied, **no client application must be given access to the Supabase database**. The Supabase anon key must not be distributed to any client until all RLS policies documented here are implemented and tested.

Enable RLS on every table before granting any client access:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;
```

`FORCE ROW LEVEL SECURITY` ensures that even the table owner (postgres role) is subject to policies. Use it on all customer-facing tables.

---

## Authentication Model

- **Customer**: authenticated via Supabase Auth phone/OTP. JWT contains `sub` = `auth.uid()`. No custom claims.
- **Admin**: authenticated via Supabase Auth email/password. JWT contains custom claim `role` = `'admin'` or `'super_admin'`. Claims set by Edge Function using service role key after verifying `admin_users` table.
- **Service role**: used only by Edge Functions. Never shipped to clients.

---

## Helper Functions Required

Define these in STEP 3 before policies:

```sql
-- Returns the authenticated user's admin_user record (if any)
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN ...

-- Returns TRUE if the authenticated user has super_admin role
CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS BOOLEAN ...

-- Returns TRUE if the authenticated user has a specific permission
CREATE OR REPLACE FUNCTION auth.has_permission(p_key TEXT) RETURNS BOOLEAN ...
```

These functions should check the `admin_users` and `admin_user_roles` tables via SECURITY DEFINER functions to avoid recursive RLS issues.

---

## RLS Policy Plan by Table

---

### `profiles`

| Operation | Customer (anon/authenticated) | Admin | Super Admin | Notes |
|-----------|-------------------------------|-------|-------------|-------|
| SELECT | Own row only (`id = auth.uid()`) | All rows | All rows | Admin needs for customer support |
| INSERT | Denied (created by trigger) | Denied | Denied | Auto-created by `handle_new_auth_user` trigger |
| UPDATE | Own row only (limited columns: full_name, email, avatar_url) | All rows (status, block_reason) | All rows | Block/unblock via admin |
| DELETE | Denied | Denied | Own auth user deletion only | Soft-delete via Edge Function |

**Access method**: Direct client SELECT allowed for own row. Admin operations via Edge Function with service role.

---

### `admin_users`

| Operation | Customer | Admin | Super Admin | Notes |
|-----------|----------|-------|-------------|-------|
| SELECT | Denied | Own row only | All rows | Admin cannot see other admins |
| INSERT | Denied | Denied | Via Edge Function | Super Admin only, via service role |
| UPDATE | Denied | Denied | Via Edge Function | |
| DELETE | Denied | Denied | Denied | Deactivate (status update), never hard delete |

**Access method**: All access via Edge Function with service role. No direct client access.

---

### `admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_user_roles`

| Operation | Customer | Admin | Super Admin |
|-----------|----------|-------|-------------|
| SELECT | Denied | Read all (for permission checks) | Read all |
| INSERT | Denied | Denied | Via Edge Function |
| UPDATE | Denied | Denied | Via Edge Function |
| DELETE | Denied | Denied | Denied (system roles protected) |

**Access method**: Admin reads via authenticated client. All writes via service role Edge Function.

---

### `categories`

| Operation | Customer | Admin | Super Admin |
|-----------|----------|-------|-------------|
| SELECT | Active rows only (`is_active = TRUE`) | All rows | All rows |
| INSERT | Denied | Via Edge Function | Via Edge Function |
| UPDATE | Denied | Via Edge Function | Via Edge Function |
| DELETE | Denied | Denied | Denied (RESTRICT FK protects) |

**Access method**: Customer reads directly. Admin writes via Edge Function.

---

### `brands`, `manufacturers`

Same pattern as `categories`.

---

### `products`

| Operation | Customer | Admin | Super Admin |
|-----------|----------|-------|-------------|
| SELECT | `is_active = TRUE AND archived_at IS NULL` | All rows | All rows |
| INSERT | Denied | Via Edge Function | Via Edge Function |
| UPDATE | Denied | Via Edge Function (is_active, name, price fields) | Via Edge Function |
| DELETE | Denied | Denied | Denied (soft-archive only) |

**Access method**: Customer reads directly. Admin writes via Edge Function.

---

### `product_images`, `product_compositions`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | If parent product is active and not archived | All rows |
| INSERT | Denied | Via Edge Function |
| UPDATE | Denied | Via Edge Function |
| DELETE | Denied | Via Edge Function |

---

### `inventory`

| Operation | Customer | Admin | Notes |
|-----------|----------|-------|-------|
| SELECT | Read-only, `available_quantity` only (via products join or direct) | All columns | Customer needs stock status |
| INSERT | Denied | Via Edge Function | Created alongside product |
| UPDATE | Denied | Via Edge Function | All adjustments via Edge Function |
| DELETE | Denied | Denied | RESTRICT FK |

**Access method**: Customer may read `available_quantity` directly or via view. Admin writes via service role Edge Function only.

**Critical**: Customer must NEVER be able to directly write to `inventory`. Any attempt to UPDATE inventory via the client is blocked by RLS.

---

### `inventory_transactions`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Denied | Own-scope adjustments; Super Admin all |
| INSERT | Denied | Via Edge Function only (service role) |
| UPDATE | Denied | Denied (append-only) |
| DELETE | Denied | Denied (append-only) |

**Access method**: No direct client SELECT. Admin reads via authenticated admin API. Writes via service role only.

---

### `carts`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own cart only (`user_id = auth.uid()`) | Denied |
| INSERT | Own cart only (one per user) | Denied |
| UPDATE | Own cart only | Denied |
| DELETE | Denied (cleared by Edge Function on order placement) | Denied |

**Access method**: Direct client access for SELECT. Cart mutations (add item, remove item) via Edge Function to enforce business rules (stock validation, price refresh).

---

### `cart_items`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Items in own cart only | Denied |
| INSERT | Via Edge Function (validate stock first) | Denied |
| UPDATE | Via Edge Function (validate stock) | Denied |
| DELETE | Via Edge Function | Denied |

**Access method**: All mutations via Edge Function. SELECT allowed directly for own cart items.

---

### `user_addresses`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own addresses only (`user_id = auth.uid()`) | Via Edge Function (order context only) |
| INSERT | Own addresses only | Denied |
| UPDATE | Own addresses only | Denied |
| DELETE | Own addresses only | Denied |

**Access method**: Direct client access. Business rule validation (default address logic) in Edge Function.

---

### `coupons`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Active coupons only (code lookup for validation) | All rows |
| INSERT | Denied | Via Edge Function |
| UPDATE | Denied | Via Edge Function |
| DELETE | Denied | Denied (deactivate, never delete) |

**Important**: Customer should NOT be able to enumerate all coupon codes. The SELECT policy for customers should be an RPC (Edge Function) that accepts a code and returns validation result — not a direct SELECT on the table.

---

### `coupon_usage`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own usage records only | All records |
| INSERT | Via Edge Function only (service role, part of order transaction) | Via Edge Function |
| UPDATE | Denied | Denied (immutable) |
| DELETE | Denied | Denied |

---

### `orders`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own orders only (`user_id = auth.uid()`) | All orders |
| INSERT | Via Edge Function only (service role, atomic transaction) | Denied |
| UPDATE | Denied (status via Edge Function) | Via Edge Function (status transitions) |
| DELETE | Denied | Denied (historical record) |

**Access method**: Customer reads own orders directly. All mutations via Edge Function with service role.

---

### `order_items`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Items belonging to own orders only | All items |
| INSERT | Via Edge Function only (service role) | Denied |
| UPDATE | Denied (immutable snapshots) | Denied |
| DELETE | Denied | Denied |

---

### `order_status_history`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | History for own orders only | All records |
| INSERT | Via Edge Function only (service role) | Via Edge Function |
| UPDATE | Denied (immutable) | Denied |
| DELETE | Denied | Denied |

---

### `payments`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own payments only | All payments |
| INSERT | Via Edge Function only (service role) | Denied |
| UPDATE | Denied | Via Edge Function (COD status update on delivery) |
| DELETE | Denied | Denied |

---

### `notifications`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Denied (accessed via user_notifications join) | All records |
| INSERT | Denied | Via Edge Function |
| UPDATE | Denied | Via Edge Function |
| DELETE | Denied | Via Edge Function (CASCADE deletes user_notifications) |

---

### `user_notifications`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Own records only (`user_id = auth.uid()`) | All records |
| INSERT | Via Edge Function only | Via Edge Function |
| UPDATE | Own records only (is_read, read_at update only) | Denied |
| DELETE | Denied | Via Edge Function |

**Access method**: Customer reads directly. Mark-as-read allowed directly. Insert via Edge Function.

---

### `banners`

| Operation | Customer | Admin |
|-----------|----------|-------|
| SELECT | Active banners only (is_active = TRUE AND date range) | All rows |
| INSERT | Denied | Via Edge Function |
| UPDATE | Denied | Via Edge Function |
| DELETE | Denied | Denied (deactivate, never delete) |

---

### `app_settings`

| Operation | Customer | Admin | Super Admin |
|-----------|----------|-------|-------------|
| SELECT | Rows where `is_public = TRUE` | All rows | All rows |
| INSERT | Denied | Denied | Via Edge Function |
| UPDATE | Denied | Denied | Via Edge Function |
| DELETE | Denied | Denied | Denied |

---

### `admin_activity_logs`

| Operation | Customer | Admin | Super Admin |
|-----------|----------|-------|-------------|
| SELECT | Denied | Own log entries only | All entries |
| INSERT | Denied | Via Edge Function (service role writes after each action) | Via Edge Function |
| UPDATE | Denied | Denied (append-only) | Denied |
| DELETE | Denied | Denied | Denied |

**Access method**: No direct client INSERT. All log entries written by Edge Functions via service role. Reads via authenticated admin client with RLS.

---

## Edge Function Security Requirements

All mutating Edge Functions must:

1. Validate the caller's JWT before any database operation.
2. Check permissions from `admin_user_roles` → `admin_role_permissions` → `admin_permissions` for admin actions.
3. Use the service role key (server-side only, never in client bundles) for operations that bypass RLS (order creation, inventory deduction, etc.).
4. Return structured error responses; never expose raw database errors to clients.
5. Log all mutating operations to `admin_activity_logs` after success.

---

## STEP 3 Checklist

- [ ] Enable RLS on all 22 tables listed above
- [ ] Apply `FORCE ROW LEVEL SECURITY` to all customer-facing tables
- [ ] Implement `auth.is_admin()` and `auth.is_super_admin()` helper functions
- [ ] Implement `auth.has_permission(key)` helper function
- [ ] Write and test RLS policies for each table per the plan above
- [ ] Verify no customer can read another customer's orders, addresses, or cart
- [ ] Verify no customer can write to inventory, orders, or coupon_usage directly
- [ ] Verify admin cannot access service-role-only tables without correct JWT claims
- [ ] Verify service role key is not present in any client bundle
- [ ] Run database_verification.sql with RLS enabled to confirm constraint behaviour
- [ ] Perform penetration test: attempt to access other customer's data using valid JWT
