---
name: Online Pharmacy RLS Security Layer
description: Key decisions, gotchas, and bug patterns from implementing migrations 014–025 (RLS + RBAC + SECURITY DEFINER RPCs).
---

## admin_activity_action enum values
The `admin_activity_action` enum (migration 001) uses:
- `app_settings_updated` (NOT `setting_updated` — that was a bug caught in review)
- `inventory_adjusted`, `order_status_updated`, `order_cancelled`
- `customer_blocked`, `customer_unblocked`, `product_archived`
Always verify against migration 001 before writing new audit log inserts.

**Why:** Wrong enum value causes runtime exception; migrations 014–024 are already applied and cannot be changed without a new migration.

## from_status bug pattern in order status history
After `UPDATE orders SET status = ... RETURNING * INTO v_order`, the variable `v_order.status` holds the NEW status. Code that reads `v_order.status` for `from_status` in `order_status_history` will record the wrong value.

**Fix:** Capture `v_prior_status := v_order.status` BEFORE the UPDATE, then use `v_prior_status` in the history insert.

**How to apply:** Any future RPC that transitions an order status must capture the prior status before the UPDATE RETURNING statement.

## First-address race condition pattern
`EXISTS ... SELECT ... INSERT with is_default` is not atomic. Two concurrent first-address inserts for the same user can both evaluate EXISTS as FALSE and both try to insert with `is_default = TRUE`.

**Fix:** Lock the user's `profiles` row (`PERFORM 1 FROM profiles WHERE id = auth.uid() FOR UPDATE`) before the EXISTS check. This serializes concurrent address operations per user.

**How to apply:** Any RPC that conditionally sets `is_default` based on a prior-state read must hold a serializing lock. The profiles row lock is the preferred mechanism (avoids advisory locks).

## SECURITY DEFINER + RLS interaction
Functions marked SECURITY DEFINER bypass RLS on tables they query. This is intentional for helpers like `is_admin()` that must query `admin_users` without being subject to admin_users RLS (which would cause infinite recursion). All helpers pin `SET search_path = public` to prevent schema injection.

## Privilege model: SELECT grant required for RLS to apply
Even with RLS enabled, a table needs a `GRANT SELECT TO authenticated` for PostgREST to allow authenticated users to issue SELECT. RLS then filters which rows they see. Migration 025 applies all grants; if a table is missing from 025's grant list, RLS policies on it are unreachable.

## Migration dependency chain (014–025)
014 helpers → 015 RLS enable → 016/017/018 policies → 019–024 RPCs → 025 privilege sweep.
Applying out of order will fail: policies reference helper functions that must exist first.

## Inventory deadlock prevention
Cancel functions (both customer and admin) lock inventory rows in `ORDER BY product_id` (alphabetical UUID) to prevent ABBA deadlocks when multiple orders cancel concurrently and both need to restore stock for overlapping products.

## Coupon security
`coupons` table: no SELECT policy for `authenticated` or `anon`. Validation goes through `validate_my_coupon()` SECURITY DEFINER RPC which returns only eligibility info, not raw coupon rows. This prevents coupon code enumeration.

## anon role access
`anon` can only: SELECT `app_settings WHERE is_public = TRUE`, EXECUTE `get_product_availability()`. Everything else is denied. RLS policy "app_settings: anon read public" created in migration 025.
