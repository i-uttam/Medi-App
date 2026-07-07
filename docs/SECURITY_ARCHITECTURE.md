# Security Architecture

## Overview

This document describes the Row Level Security (RLS), Role-Based Access Control (RBAC), and secure authorization model for the Online Pharmacy Platform. All security is implemented at the PostgreSQL / Supabase layer — the API server is a thin HTTP gateway; trust decisions are never made in application code.

---

## 1. Authentication Model

| Subject | Auth mechanism | Identity column |
|---|---|---|
| Customer (mobile app) | Supabase Auth OTP (phone) | `auth.uid()` = `profiles.id` |
| Admin (web panel) | Supabase Auth (email+password) | `auth.uid()` → `admin_users.user_id` |

Roles used at the database level:

| PostgreSQL role | Description |
|---|---|
| `anon` | Unauthenticated / pre-login requests. Extremely limited access. |
| `authenticated` | Any Supabase Auth session (customer or admin). RLS policies discriminate further. |
| `service_role` | Backend Edge Functions / API server (bypasses RLS completely). Used only for order placement, payment processing, and admin setup. |

---

## 2. Helper Functions (Migration 014)

All helpers are `SECURITY DEFINER`, `STABLE`, `SET search_path = public`. They are revoked from `PUBLIC` and granted only to `authenticated`.

| Function | Returns | Purpose |
|---|---|---|
| `current_user_id()` | `uuid` | `auth.uid()` — the caller's auth identity |
| `is_authenticated()` | `bool` | `auth.uid() IS NOT NULL` |
| `is_admin()` | `bool` | Exists in `admin_users` (any status) |
| `is_active_admin()` | `bool` | In `admin_users` with `status = 'active'` |
| `has_admin_permission(key text)` | `bool` | Resolves permission through role chain |
| `is_super_admin()` | `bool` | Has a role named `super_admin` |
| `is_active_customer()` | `bool` | `profiles.status = 'active'` for caller |
| `assert_active_customer()` | `void` | Raises exception if not active customer |
| `assert_active_admin(key text)` | `void` | Raises if not active admin or missing permission |

`assert_*` functions are used as guards inside SECURITY DEFINER RPCs. They produce structured exceptions with a machine-readable error code (`SQLSTATE P0001`) and a `HINT` field that the API layer surfaces to clients.

---

## 3. Table Classification Matrix

### 3.1 Customer-Owned Tables (Migration 016)

These tables store personal data. `FORCE ROW LEVEL SECURITY` is applied so even the `postgres` role is subject to policies when connecting as `authenticated`.

| Table | Customer access | Mutations |
|---|---|---|
| `profiles` | SELECT own row | Via `update_my_profile()` RPC only |
| `carts` | SELECT own row | Via cart RPCs only |
| `cart_items` | SELECT via cart JOIN | Via cart RPCs only |
| `user_addresses` | SELECT own rows | Via address RPCs only |
| `orders` | SELECT own rows | Created by Place Order Edge Function (service role) |
| `order_items` | SELECT via order JOIN | Immutable after creation |
| `order_status_history` | SELECT via order JOIN | Append-only via RPCs |
| `payments` | SELECT via order JOIN | Immutable after creation |
| `coupon_usage` | SELECT own rows | Created by Edge Function; deleted by cancel RPCs |
| `user_notifications` | SELECT own rows + UPDATE (mark read) | Created by Edge Function |

### 3.2 Catalogue Tables (Migration 017)

Public read for authenticated customers; all writes admin-only.

| Table | Customer access | Condition |
|---|---|---|
| `categories` | SELECT | `is_active = TRUE` |
| `brands` | SELECT | `is_active = TRUE` |
| `manufacturers` | SELECT | `is_active = TRUE` |
| `products` | SELECT | `is_active = TRUE AND archived_at IS NULL` |
| `product_images` | SELECT | Parent product must be customer-visible |
| `product_compositions` | SELECT | Parent product must be customer-visible |
| `inventory` | SELECT | Parent product must be customer-visible |
| `inventory_transactions` | **DENIED** | Admin only |
| `banners` | SELECT | `is_active AND within date window` |
| `app_settings` | SELECT | `is_public = TRUE` only |
| `coupons` | **DENIED** | Validation via `validate_my_coupon()` RPC only |
| `notifications` | **DENIED** | Accessed through `user_notifications` |

### 3.3 Admin-Only Tables (Migration 018)

All admin access requires `has_admin_permission(key)` or `is_super_admin()`.

| Table | Permission key | Admin access |
|---|---|---|
| `admin_users` | — | Own row only; super admin sees all |
| `admin_roles` | `roles.view` | SELECT |
| `admin_permissions` | `roles.view` | SELECT |
| `admin_role_permissions` | `roles.view` | SELECT |
| `admin_user_roles` | `roles.view` | SELECT |
| `admin_activity_logs` | `audit_logs.view` | Own logs; super admin sees all |

### 3.4 Catalogue Admin Policies

| Table | Permission key | Admin access |
|---|---|---|
| `categories` | `categories.view` / `categories.manage` | SELECT / INSERT, UPDATE |
| `brands` | `brands.view` / `brands.manage` | SELECT / INSERT, UPDATE |
| `manufacturers` | `manufacturers.view` / `manufacturers.manage` | SELECT / INSERT, UPDATE |
| `products` | `products.view` / `products.create` / `products.update` | SELECT / INSERT / UPDATE |
| `product_images` | `products.view` / `products.update` | SELECT / INSERT, UPDATE, DELETE |
| `product_compositions` | `products.view` / `products.update` | SELECT / INSERT, UPDATE, DELETE |
| `inventory` | `inventory.view` | SELECT only (mutations via RPC) |
| `inventory_transactions` | `inventory.view` | SELECT only |
| `orders` | `orders.view` | SELECT only (mutations via RPC) |
| `order_items` | `orders.view` | SELECT only |
| `order_status_history` | `orders.view` | SELECT only |
| `payments` | `orders.view` | SELECT only |
| `coupon_usage` | `coupons.view` | SELECT only |
| `coupons` | `coupons.view` / `coupons.manage` | SELECT / INSERT, UPDATE |
| `banners` | `banners.view` / `banners.manage` | SELECT / INSERT, UPDATE |
| `app_settings` | `settings.view` | SELECT all (incl. non-public) |
| `notifications` | `notifications.view` / `notifications.send` | SELECT / INSERT |
| `user_notifications` | `notifications.view` | SELECT only |
| `profiles` | `customers.view` | SELECT only (block/unblock via RPC) |

---

## 4. SECURITY DEFINER RPC Catalogue

All RPCs listed here:
- Run with the table-owner (`postgres`) privileges
- `SET search_path = public` — prevents schema injection
- Revoked from `PUBLIC`; granted to `authenticated` only
- Validate caller identity using helper functions (never trust caller-supplied IDs)

### 4.1 Customer Profile (Migration 019)

| RPC | Description |
|---|---|
| `update_my_profile(full_name, email, avatar_url)` | Updates safe profile fields; `id`, `status`, `phone`, `created_at` are immutable |
| `get_my_profile()` | Returns caller's own profile |

### 4.2 Cart Management (Migration 020)

| RPC | Description |
|---|---|
| `get_or_create_my_cart()` | Returns existing cart or creates one atomically |
| `add_product_to_my_cart(product_id)` | Adds product (qty 1) or increments; validates stock |
| `set_my_cart_item_quantity(item_id, qty)` | Sets exact quantity; validates stock ceiling |
| `increment_my_cart_item(item_id)` | +1 with stock check and row lock |
| `decrement_my_cart_item(item_id)` | −1; removes item if qty reaches 0 |
| `remove_my_cart_item(item_id)` | Removes a specific item |
| `clear_my_cart()` | Removes all items; preserves cart row |

### 4.3 Address Management (Migration 021)

| RPC | Description |
|---|---|
| `create_my_address(...)` | Creates address; auto-sets default if first |
| `update_my_address(id, ...)` | Partial update (NULL params = unchanged) |
| `delete_my_address(id)` | Deletes; promotes next-recent as default if needed |
| `set_my_default_address(id)` | Atomically switches default |

### 4.4 Inventory Management (Migration 022)

| RPC | Description |
|---|---|
| `admin_adjust_inventory(product_id, type, qty_change, reason)` | Admin inventory adjustment (admin_addition, admin_reduction, admin_correction only) |
| `get_product_availability(product_id)` | Safe customer/anon stock check (no raw transactions) |

### 4.5 Order Management (Migration 023)

| RPC | Description |
|---|---|
| `validate_my_coupon(code)` | Validates coupon eligibility; does NOT create usage record |
| `cancel_my_order(order_id, reason)` | Customer cancels own order (pending/confirmed only) |
| `admin_update_order_status(order_id, new_status, reason)` | Admin status transitions per matrix; cannot route to `cancelled` |
| `admin_cancel_order(order_id, reason)` | Admin cancellation with inventory restoration |
| `mark_my_notification_read(notification_id)` | Marks one notification read |
| `mark_all_my_notifications_read()` | Bulk mark read |

### 4.6 Admin Management (Migration 024)

| RPC | Description |
|---|---|
| `admin_block_customer(user_id, reason)` | Blocks customer; cannot block admins |
| `admin_unblock_customer(user_id)` | Clears block; validates was blocked first |
| `admin_archive_product(product_id, reason)` | Soft-delete product (is_active=false, archived_at=now) |
| `admin_update_app_setting(key, value)` | Upserts app setting; is_public cannot be changed via RPC |

---

## 5. Order Cancellation Logic

### Customer-Initiated (`cancel_my_order`)
- Allowed from: `pending`, `confirmed` only
- Blocked customers: denied
- Steps (atomic transaction):
  1. Lock order row (validates ownership + status)
  2. Lock inventory rows in `product_id` alphabetical order (deadlock prevention)
  3. Restore `available_quantity` for each order item
  4. Insert `inventory_transactions` records (`order_cancellation_restore`)
  5. Set `orders.status = 'cancelled'`, `cancelled_at = NOW()`
  6. Insert `order_status_history` record
  7. **Delete** `coupon_usage` row (releases usage count for reuse)

### Admin-Initiated (`admin_cancel_order`)
- Allowed from: `pending`, `confirmed`, `processing`, `packed`
- `shipped`, `out_for_delivery`, `delivered` cannot be cancelled
- Steps: identical to customer cancellation + inserts `admin_activity_logs`

---

## 6. Order Status Transition Matrix

```
pending → confirmed → processing → packed → shipped → out_for_delivery → delivered
   ↓           ↓            ↓          ↓
cancelled   cancelled   cancelled  cancelled    (no cancel after shipped)
```

- `admin_update_order_status` enforces this matrix; transitions to `cancelled` raise an error directing the caller to `admin_cancel_order`.
- `delivered_at` is set automatically when status becomes `delivered`.

---

## 7. Coupon Security

- `coupons` table: **no SELECT** for `authenticated` or `anon` (enumeration prevention)
- `validate_my_coupon(code)`: SECURITY DEFINER; normalises code (`UPPER(TRIM(...))`) then checks all eligibility criteria
- Does **not** check `minimum_order_paise` (requires server-calculated cart total — performed by Place Order Edge Function)
- Does **not** create `coupon_usage` (happens only at order creation)
- Returns: `coupon_validation_result` composite (is_valid, error_code, discount details)

---

## 8. Inventory Race Condition Prevention

- Cart RPCs lock the `cart_items` row with `FOR UPDATE` before reading stock
- `admin_adjust_inventory` locks the `inventory` row with `FOR UPDATE`
- Cancel functions lock inventory rows in **alphabetical `product_id` order** across all order items to prevent ABBA-style deadlocks
- Final authoritative stock reservation is done at Place Order time (service role Edge Function) using `SELECT ... FOR UPDATE`

---

## 9. Anon Role Access

| Resource | Access |
|---|---|
| `app_settings` | SELECT where `is_public = TRUE` |
| `get_product_availability(product_id)` | EXECUTE (safe — no PII) |
| All other tables | DENIED |
| All RPCs (except above) | DENIED |

Rationale: the app needs to display basic settings (minimum app version, feature flags) and product availability before the user completes OTP login.

---

## 10. What the Service Role Bypasses

The `service_role` key is used only in Edge Functions and must never be exposed to clients. It bypasses all RLS and can write to any table. It is used for:

- **Place Order Edge Function**: creates `orders`, `order_items`, `payments`, `coupon_usage`, `order_status_history`, decrements inventory
- **Push Notification Edge Function**: creates `notifications` and `user_notifications`
- **Admin Onboarding Edge Function**: creates `admin_users`, `admin_user_roles`
- **Account Deletion Edge Function**: soft-deletes `profiles`, cascades to dependent data

---

## 11. Audit Logging

Every admin mutation (block, unblock, archive, inventory adjust, order status change, order cancel, settings update) creates a row in `admin_activity_logs` with:
- `admin_user_id`: resolved from `auth.uid()` — never trusted from client
- `action`: machine-readable verb
- `entity_type` + `entity_id`: the affected row
- `old_values` / `new_values`: JSONB diff for audit trail
- `created_at`: server-set timestamp

`admin_activity_logs` is append-only: no UPDATE/DELETE via any role.

---

## 12. Migration Dependency Chain

```
001–013  (schema tables and seed data)
    ↓
014  security helper functions
    ↓
015  enable RLS on all tables
    ↓
016  customer RLS policies
017  catalogue RLS policies
018  admin RBAC policies
    ↓
019  update_my_profile, get_my_profile
020  cart RPCs
021  address RPCs
022  inventory RPCs
023  order RPCs
024  admin management RPCs
    ↓
025  final privilege sweep (REVOKE/GRANT)
```

Each migration step is independently rollback-able if applied through Supabase's migration runner.

---

## 13. Error Code Convention

All SECURITY DEFINER RPCs raise structured exceptions using:
```sql
RAISE EXCEPTION 'error_code'
    USING HINT = 'Human-readable message.';
```

The API server maps these to HTTP 400/403/404 responses. The `error_code` (accessible via `SQLSTATE` or by parsing the message) is machine-readable and versioned with the migration.

Common error codes:
| Code | HTTP | Meaning |
|---|---|---|
| `not_active_customer` | 403 | Caller is blocked or deleted |
| `not_active_admin` | 403 | Caller is not an active admin |
| `insufficient_permission` | 403 | Admin lacks required permission key |
| `product_unavailable` | 400 | Product inactive or archived |
| `out_of_stock` | 400 | No available_quantity |
| `exceeds_stock` | 400 | Requested qty > available stock |
| `order_not_cancellable` | 400 | Order status doesn't allow cancellation |
| `invalid_status_transition` | 400 | Admin transition not in allowed matrix |
| `validation_error` | 400 | Input validation failed |
| `*_not_found` | 404 | Entity not found or not owned by caller |
