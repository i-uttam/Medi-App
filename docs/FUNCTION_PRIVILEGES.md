# Function Privileges Reference
## Online Pharmacy Platform — SECURITY DEFINER Functions

**Version:** 1.0  
**Last Updated:** 2026-07-07  

---

## Overview

All application functions in this project are `SECURITY DEFINER`. They run with the privilege of the function owner (`postgres`) rather than the calling user. This allows them to bypass RLS to implement business logic safely, while the caller (authenticated user) is validated inside the function body using `auth.uid()`.

Every SECURITY DEFINER function:
- Has `SET search_path = public` to prevent schema injection
- Validates the caller's identity using `auth.uid()` — never trusts a client-supplied user ID
- Is revoked from `PUBLIC` before being granted to `authenticated`
- Is not accessible to `anon` (except `get_product_availability`)

---

## Verification Query

Run this to inspect actual deployed privileges:

```sql
SELECT
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
ORDER BY p.proname;
```

Check for unexpected `PUBLIC EXECUTE`:

```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND grantee = 'PUBLIC';
-- Expected: only get_product_availability
```

---

## Helper Functions (Migration 014)

| Function | Signature | Security | Caller | Revoked from PUBLIC |
|---|---|---|---|---|
| `current_user_id` | `() → uuid` | INVOKER | Any | ❌ (safe — just wraps auth.uid()) |
| `is_authenticated` | `() → bool` | INVOKER | Any | ❌ (safe) |
| `is_admin` | `() → bool` | DEFINER | Any | ✅ |
| `is_active_admin` | `() → bool` | DEFINER | Any | ✅ |
| `has_admin_permission` | `(text) → bool` | DEFINER | Any | ✅ |
| `is_super_admin` | `() → bool` | DEFINER | Any | ✅ |
| `is_active_customer` | `() → bool` | DEFINER | Any | ✅ |
| `assert_active_customer` | `() → void` | DEFINER | Any | ✅ |
| `assert_active_admin` | `(text) → void` | DEFINER | Any | ✅ |

**Grant target:** `authenticated`

---

## Profile Functions (Migration 019)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `update_my_profile` | `(text, text, text) → profiles` | active customer | — | Updates full_name, email, avatar_url only |
| `get_my_profile` | `() → profiles` | active customer | — | Returns caller's own row |

**Grant target:** `authenticated`

---

## Cart Functions (Migration 020)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `get_or_create_my_cart` | `() → carts` | active customer | — | Idempotent |
| `add_product_to_my_cart` | `(uuid) → cart_items` | active customer | — | Increments if already in cart |
| `set_my_cart_item_quantity` | `(uuid, int) → cart_items` | active customer | — | Validates stock |
| `increment_my_cart_item` | `(uuid) → cart_items` | active customer | — | Row lock prevents race |
| `decrement_my_cart_item` | `(uuid) → cart_items` | active customer | — | Returns NULL if item removed |
| `remove_my_cart_item` | `(uuid) → bool` | active customer | — | — |
| `clear_my_cart` | `() → int` | active customer | — | Returns count removed |

**Grant target:** `authenticated`

---

## Address Functions (Migration 021)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `create_my_address` | `(text,text,text,...,address_type) → user_addresses` | active customer | — | First address auto-default; race-safe via profile lock |
| `update_my_address` | `(uuid,text,...,address_type) → user_addresses` | active customer | — | Partial update (NULL = unchanged) |
| `delete_my_address` | `(uuid) → bool` | active customer | — | Promotes next address to default if deleted was default |
| `set_my_default_address` | `(uuid) → user_addresses` | active customer | — | Atomic default switch |

**Grant target:** `authenticated`

---

## Inventory Functions (Migration 022)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `admin_adjust_inventory` | `(uuid, inventory_transaction_type, int, text) → inventory` | active admin | `inventory.adjust` | Only admin_addition/reduction/correction types allowed |
| `get_product_availability` | `(uuid) → table` | any | — | Safe for anon; returns availability/qty/low_stock only |

**Grant target:** `authenticated` + `anon` for `get_product_availability`

---

## Order Functions (Migration 023)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `validate_my_coupon` | `(text) → coupon_validation_result` | active customer | — | Read-only; does NOT create coupon_usage |
| `cancel_my_order` | `(uuid, text) → orders` | active customer | — | Only pending/confirmed; restores inventory |
| `admin_update_order_status` | `(uuid, order_status, text) → orders` | active admin | `orders.update_status` | Enforces transition matrix; rejects 'cancelled' (use admin_cancel_order) |
| `admin_cancel_order` | `(uuid, text) → orders` | active admin | `orders.cancel` | Restores inventory in product_id order (deadlock-safe) |
| `mark_my_notification_read` | `(uuid) → user_notifications` | active customer | — | Idempotent |
| `mark_all_my_notifications_read` | `() → int` | active customer | — | Returns count |

**Grant target:** `authenticated`

---

## Admin Management Functions (Migration 024)

| Function | Signature | Required Role | Permission Key | Notes |
|---|---|---|---|---|
| `admin_block_customer` | `(uuid, text) → profiles` | active admin | `customers.block` | Cannot block admin users |
| `admin_unblock_customer` | `(uuid) → profiles` | active admin | `customers.block` | Validates target is currently blocked |
| `admin_archive_product` | `(uuid, text) → products` | active admin | `products.archive` | Idempotent; sets is_active=false, archived_at=now |
| `admin_update_app_setting` | `(text, jsonb, text) → app_settings` | active admin | `settings.update` | Upsert; is_public immutable via this function |

**Grant target:** `authenticated`

---

## Composite Types

| Type | Created in | Description |
|---|---|---|
| `coupon_validation_result` | Migration 023 | Returned by `validate_my_coupon()`; contains is_valid, error_code, discount details |

---

## Permission Key → Function Mapping

| Permission Key | Functions that require it |
|---|---|
| `inventory.adjust` | `admin_adjust_inventory` |
| `orders.update_status` | `admin_update_order_status` |
| `orders.cancel` | `admin_cancel_order` |
| `customers.block` | `admin_block_customer`, `admin_unblock_customer` |
| `products.archive` | `admin_archive_product` |
| `settings.update` | `admin_update_app_setting` |

---

## Error Code Reference

| SQLSTATE | Error Code | HTTP | Meaning |
|---|---|---|---|
| P0001 | `not_active_customer` | 403 | Caller is blocked or deleted |
| P0001 | `not_active_admin` | 403 | Caller is not an active admin |
| P0001 | `insufficient_permission` | 403 | Admin lacks required permission key |
| P0001 | `product_unavailable` | 400 | Product inactive or archived |
| P0001 | `out_of_stock` | 400 | No available_quantity |
| P0001 | `exceeds_stock` | 400 | Requested qty > available stock |
| P0001 | `order_not_cancellable` | 400 | Order status doesn't allow cancellation |
| P0001 | `invalid_status_transition` | 400 | Admin transition not in allowed matrix |
| P0001 | `validation_error` | 400 | Input validation failed |
| P0001 | `*_not_found` | 404 | Entity not found or not owned by caller |
| P0001 | `already_blocked` | 400 | Customer is already blocked |
| P0001 | `cannot_block_admin` | 400 | Target user is an admin |
