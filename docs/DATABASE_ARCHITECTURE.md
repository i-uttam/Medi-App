# Database Architecture
## Online Pharmacy Platform — Supabase PostgreSQL

**Version:** 1.0  
**Status:** Implemented (migrations 001–013)  
**Last Updated:** 2026-07-07  

---

## Table of Contents

1. [Existing Database State](#1-existing-database-state)
2. [Migration Strategy](#2-migration-strategy)
3. [Final Schema Overview](#3-final-schema-overview)
4. [Data Ownership Strategy](#4-data-ownership-strategy)
5. [Historical Data Strategy](#5-historical-data-strategy)
6. [Inventory Strategy](#6-inventory-strategy)
7. [Order Snapshot Strategy](#7-order-snapshot-strategy)
8. [Audit Strategy](#8-audit-strategy)
9. [Key Architecture Decisions](#9-key-architecture-decisions)
10. [Money Handling](#10-money-handling)
11. [Full-Text Search Architecture](#11-full-text-search-architecture)
12. [Circular FK Resolution](#12-circular-fk-resolution)
13. [Constraint Audit Summary](#13-constraint-audit-summary)
14. [Actions Requiring Human Configuration](#14-actions-requiring-human-configuration)

---

## 1. Existing Database State

**Assessment performed:** 2026-07-07

| Component | State | Notes |
|-----------|-------|-------|
| Supabase project | Not yet created | Requires human action — see Section 14 |
| Supabase migrations directory | Created by this step | `supabase/migrations/` (13 files) |
| Existing SQL migrations | None | No prior migrations existed |
| Drizzle schema (`lib/db/src/schema/index.ts`) | Empty | Scaffold only; no tables defined |
| Mock database / local data | None | Not present; not used |
| Environment variables | `DATABASE_URL` expected by Drizzle | Supabase URL + keys needed for Supabase client |

**Supabase integration:** Not previously set up. This step creates the full schema from scratch.

**Drizzle ORM:** The monorepo includes a `lib/db` package configured with Drizzle ORM. The Supabase migration files are the authoritative schema source. Drizzle can be used for query building in the Express API server (`artifacts/api-server`) pointing at the same Supabase PostgreSQL database via `DATABASE_URL`. See `docs/DATABASE_TYPES_GENERATION.md` for the coexistence strategy.

---

## 2. Migration Strategy

**Approach:** Ordered SQL migration files in `supabase/migrations/`. Applied via `supabase db push` using the Supabase CLI.

**Migration files:**

| File | Content | Dependencies |
|------|---------|--------------|
| `001_extensions_and_types.sql` | PostgreSQL extensions, all ENUM types | None |
| `002_profiles_and_admin.sql` | profiles, admin_users, admin_roles, admin_permissions, admin_role_permissions, admin_user_roles, auto-create profile trigger, system role/permission seeds | 001 |
| `003_catalog.sql` | categories, brands, manufacturers, products, product_images, product_compositions | 001, 002 |
| `004_inventory.sql` | inventory, inventory_transactions (without order FK) | 001, 002, 003 |
| `005_cart.sql` | carts, cart_items | 001, 002, 003 |
| `006_addresses.sql` | user_addresses | 001 |
| `007_coupons.sql` | coupons, coupon_usage (without order FK) | 001 |
| `008_orders.sql` | orders, order_items, order_status_history, payments; resolves deferred FKs on inventory_transactions and coupon_usage | 001, 002, 003, 004, 006, 007 |
| `009_notifications.sql` | notifications, user_notifications | 001, 002 |
| `010_content_and_settings.sql` | banners, app_settings + seed settings | 001 |
| `011_audit_logs.sql` | admin_activity_logs | 001, 002 |
| `012_indexes.sql` | All performance indexes + GIN indexes for FTS | 001–011 |
| `013_updated_at_triggers.sql` | `set_updated_at()` function + triggers; FTS triggers | 001–012 |

**Safe-to-rerun:** Migrations use `CREATE TABLE`, `CREATE TYPE`, `CREATE INDEX`, `CREATE TRIGGER` without `IF NOT EXISTS` guards for strictness — they are meant to be applied once to a clean database. The Supabase CLI migration system tracks which migrations have run and will not re-apply them.

**Client access:** Do not connect any client application to the database until STEP 3 (RLS) is fully applied. See `docs/RLS_SECURITY_PLAN.md`.

---

## 3. Final Schema Overview

```
auth.users (Supabase-managed)
    ├── profiles (1:1, CASCADE)
    ├── admin_users (1:1, RESTRICT)
    ├── carts (1:1 UNIQUE, CASCADE)
    ├── user_addresses (1:many, CASCADE)
    ├── orders (1:many, RESTRICT)
    ├── coupon_usage (1:many, CASCADE)
    └── user_notifications (1:many, CASCADE)

profiles
    └── (no child tables; deleted by CASCADE from auth.users)

admin_users
    ├── admin_user_roles → admin_roles → admin_role_permissions → admin_permissions
    ├── inventory_transactions (admin_user_id, SET NULL)
    ├── order_status_history (changed_by_admin_user_id, SET NULL)
    ├── notifications (created_by_admin_user_id, SET NULL)
    └── admin_activity_logs (admin_user_id, SET NULL)

categories
    └── products (category_id, RESTRICT)

brands
    └── products (brand_id, RESTRICT)

manufacturers
    └── products (manufacturer_id, RESTRICT)

products
    ├── product_images (CASCADE)
    ├── product_compositions (CASCADE)
    ├── inventory (1:1, RESTRICT)
    ├── inventory_transactions (product_id, RESTRICT)
    ├── cart_items (product_id, RESTRICT)
    └── order_items (product_id, SET NULL)

carts
    └── cart_items (CASCADE)

coupons
    ├── coupon_usage (coupon_id, RESTRICT)
    └── orders (coupon_id, SET NULL)

user_addresses
    └── orders (address_id, SET NULL)

orders
    ├── order_items (order_id, RESTRICT)
    ├── order_status_history (order_id, RESTRICT)
    ├── payments (order_id, RESTRICT)
    ├── inventory_transactions (order_id, SET NULL) [deferred FK]
    └── coupon_usage (order_id, SET NULL) [deferred FK]

notifications
    └── user_notifications (notification_id, CASCADE)

banners (standalone)
app_settings (standalone key-value)
admin_activity_logs (standalone append-only)
```

**Total tables: 25**

---

## 4. Data Ownership Strategy

Every customer-owned record traces back to `auth.users(id)` via a foreign key. Row Level Security (STEP 3) will enforce this at the database level using `auth.uid()`.

| Table | Owner FK | Customer isolation |
|-------|----------|--------------------|
| `profiles` | `id = auth.users.id` | `id = auth.uid()` |
| `carts` | `user_id → auth.users` | `user_id = auth.uid()` |
| `cart_items` | via `cart_id → carts.user_id` | Join through cart |
| `user_addresses` | `user_id → auth.users` | `user_id = auth.uid()` |
| `orders` | `user_id → auth.users` | `user_id = auth.uid()` |
| `order_items` | via `order_id → orders.user_id` | Join through order |
| `order_status_history` | via `order_id → orders.user_id` | Join through order |
| `payments` | via `order_id → orders.user_id` | Join through order |
| `coupon_usage` | `user_id → auth.users` | `user_id = auth.uid()` |
| `user_notifications` | `user_id → auth.users` | `user_id = auth.uid()` |

**Admin data isolation:** Admin users can only see their own `admin_activity_logs` entries unless they have `super_admin` role. See `docs/RLS_SECURITY_PLAN.md`.

**Cross-customer access prevention:** No query path from one customer's data to another's exists in the schema. RLS policies (STEP 3) enforce this at the database layer.

---

## 5. Historical Data Strategy

Historical data — particularly orders — must remain accurate regardless of changes to live product, coupon, or address data.

### Order item snapshots

`order_items` stores immutable copies of product data at the time of order creation:

| Snapshot column | Source column | Notes |
|----------------|---------------|-------|
| `product_name_snapshot` | `products.name` | Immutable after INSERT |
| `sku_snapshot` | `products.sku` | Immutable |
| `image_url_snapshot` | Primary image URL | Immutable |
| `pack_size_snapshot` | `products.pack_size` | Immutable |
| `mrp_paise_snapshot` | `products.mrp_paise` | Immutable |
| `selling_price_paise_snapshot` | `products.selling_price_paise` | Immutable |

These columns are written once at order creation and never updated. Product changes after order placement do not affect historical order display.

`product_id` is a nullable FK (`ON DELETE SET NULL`) — in the rare emergency of a hard product deletion, the order item record survives with `product_id = NULL` but all snapshot data intact.

### Order address snapshots

`orders` stores immutable delivery address data in `snapshot_*` columns:

- `snapshot_full_name`, `snapshot_phone`, `snapshot_address_line_1`, `snapshot_address_line_2`, `snapshot_landmark`, `snapshot_city`, `snapshot_state`, `snapshot_postal_code`, `snapshot_country_code`, `snapshot_address_type`

**Decision: inline columns vs separate table.** Inline snapshot columns were chosen over a separate `order_address_snapshots` table because:
1. A separate 1:1 table adds a JOIN for every order query without normalisation benefit.
2. Inline columns keep a complete order record in one row.
3. The `snapshot_` prefix clearly marks these as immutable copies.
4. There is no scenario where snapshot data is shared across orders.

`address_id` is retained as a nullable FK (`ON DELETE SET NULL`) to the original `user_addresses` row for optional reference. When the address is deleted, `address_id` becomes NULL; the snapshot data is unaffected.

### Catalogue record protection

- **Products**: never hard-deleted; soft-archived via `archived_at IS NOT NULL`. Archived products remain in the database for `order_items.product_id` FK references.
- **Categories, brands, manufacturers**: `ON DELETE RESTRICT` prevents deletion while products reference them.
- **Coupons**: `ON DELETE RESTRICT` on `coupon_usage.coupon_id` prevents coupon deletion while historical usage records exist.

---

## 6. Inventory Strategy

### Model

```
available_quantity = physical stock available for new orders
reserved_quantity  = reserved by active workflow (v1: always 0)
```

- `available_quantity` is reduced atomically when an order is placed.
- `available_quantity` is restored atomically when an order is cancelled.
- There is **no cart reservation** in v1. Cart does not hold stock; only confirmed orders reduce inventory.
- `reserved_quantity` is included for schema forward-compatibility (no migration needed to add it later).

### Atomic operations

All inventory changes use a database transaction with a row-level lock:

```sql
SELECT available_quantity FROM inventory WHERE product_id = $1 FOR UPDATE;
-- Validate: quantity >= order_quantity
UPDATE inventory SET available_quantity = available_quantity - $order_qty WHERE product_id = $1;
INSERT INTO inventory_transactions (...) VALUES (...);
```

This pattern serialises concurrent order placements for the same product, preventing negative stock.

### Traceability

Every `available_quantity` change creates one `inventory_transactions` row. The transaction log is:
- Append-only (never updated or deleted in normal workflows)
- Self-consistent: `quantity_after = quantity_before + quantity_change` (CHECK constraint)
- Referenced to the causing order (when applicable) via `order_id` FK

### Low stock detection

Low stock = `inventory.available_quantity <= products.low_stock_threshold`. The threshold is per-product (column on products) with a global default in `app_settings.low_stock_threshold_default`. Evaluated at query time; no separate status column needed.

---

## 7. Order Snapshot Strategy

**See Section 5 above for full detail.**

Summary of decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Address snapshot | Inline `snapshot_*` columns on `orders` | No normalisation gain from 1:1 separate table; avoids JOIN overhead |
| Product snapshot | Separate `order_items` columns | Natural 1:many; normalised correctly |
| Price authority | Backend only (Edge Function) | Client-submitted prices are never trusted |
| Historical price | Stored in `order_items` snapshot columns | Product price changes do not affect past orders |

---

## 8. Audit Strategy

### Inventory audit

Every stock change → one `inventory_transactions` row. Fields:
- `transaction_type`: why the change happened
- `quantity_before` / `quantity_after`: state before and after
- `order_id`: which order caused the change (if applicable)
- `admin_user_id`: which admin made the change (if manual)
- `reason`: required for admin adjustments

### Order status audit

Every status transition → one `order_status_history` row. Fields:
- `from_status` / `to_status`: the transition
- `changed_by_user_id` OR `changed_by_admin_user_id`: who made the change
- `reason`: required for cancellations
- `created_at`: immutable timestamp

### Admin action audit

Every significant admin action → one `admin_activity_logs` row. Fields:
- `admin_user_id`: who performed the action
- `action`: the `admin_activity_action` enum value
- `entity_type` / `entity_id`: what was affected
- `old_values` / `new_values`: JSONB before/after snapshots
- `ip_address`: request IP
- `created_at`: immutable timestamp

**Scrubbing rules for `old_values` / `new_values`:** Edge Functions must never write the following to audit log JSONB: passwords, tokens, API keys, SMS codes, OTP values, `service_role_key`, `anon_key`, or any field containing the word `secret`, `token`, or `password`.

### Append-only enforcement

Audit tables (`inventory_transactions`, `order_status_history`, `admin_activity_logs`) are write-once in normal application workflows. RLS (STEP 3) will deny UPDATE and DELETE from all authenticated clients. Only the service role (Edge Functions) can INSERT; no role may UPDATE or DELETE.

---

## 9. Key Architecture Decisions

### D1: Money stored as integer paise

**Decision:** All monetary values stored as `INTEGER` (paise). 1 rupee = 100 paise.

**Rationale:** Floating-point arithmetic is unsuitable for monetary values. Integer paise eliminates rounding errors in calculations. Standard practice for Indian e-commerce.

**Application rule:** All monetary values divided by 100 for display only. The database, Edge Functions, and API responses all use paise.

### D2: UUID primary keys

**Decision:** All tables use `UUID PRIMARY KEY DEFAULT gen_random_uuid()` except `profiles` (which uses the auth.users UUID) and `app_settings` (TEXT primary key).

**Rationale:** UUIDs are non-enumerable (cannot be guessed or iterated), globally unique, and safe to expose in URLs. `gen_random_uuid()` is a built-in PostgreSQL 13+ function requiring no extension.

### D3: Address snapshot inline on orders

**Decision:** Order delivery address stored as `snapshot_*` inline columns on the `orders` table, not in a separate `order_address_snapshots` table.

**Rationale:** A 1:1 relationship with a separate table adds a JOIN for every order query without normalisation benefit. Inline columns are simpler to query and clearly marked as immutable by the `snapshot_` prefix.

### D4: Cart does not store price

**Decision:** `cart_items` has no price column. Price is always fetched from `products.selling_price_paise` at checkout.

**Rationale:** The backend is the authoritative price source. Storing price in the cart would allow stale prices to persist and would require additional reconciliation logic.

### D5: Deferred FKs for circular dependencies

**Decision:** `inventory_transactions.order_id` and `coupon_usage.order_id` are created without FK constraints in migrations 004 and 007. The FK constraints are added in migration 008 via `ALTER TABLE ... ADD CONSTRAINT` after `orders` is created.

**Rationale:** Breaking the FK at migration time prevents circular dependency during schema creation. The FK constraint is still enforced at runtime; only the schema creation order is affected.

### D6: Profile auto-creation trigger

**Decision:** A `SECURITY DEFINER` trigger function (`handle_new_auth_user`) automatically creates a `profiles` row when a new `auth.users` row is inserted.

**Rationale:** Ensures every authenticated user has a profile row. The function is hardened: it only copies `id`, `phone`, and lowercase email — it never reads `raw_user_meta_data` for any privileged fields, and it cannot assign admin roles.

### D7: System roles and permissions seeded in migration

**Decision:** The `admin` and `super_admin` roles and their permissions are seeded in migration 002.

**Rationale:** These are structural infrastructure records, not runtime business data. The system cannot function without them. They are seeded once and are append-only in normal operations.

### D8: products.search_vector maintained by trigger

**Decision:** `products.search_vector` is a regular `tsvector` column maintained by triggers, not a `GENERATED ALWAYS AS` column.

**Rationale:** PostgreSQL `GENERATED` columns cannot contain subqueries. The search vector requires brand and manufacturer names from related tables. A trigger can legally read related tables via subquery. Cross-table triggers on `brands`, `manufacturers`, and `product_compositions` keep the search vector current when related data changes.

### D9: COD-only payment schema is future-extensible

**Decision:** The `payment_method` enum contains only `cash_on_delivery` in v1. The `payments` table includes `provider`, `provider_payment_id`, and `metadata` columns that are NULL for COD.

**Rationale:** Adding online payment methods in future requires only adding an enum value and populating the provider columns — no schema migration beyond `ALTER TYPE payment_method ADD VALUE '...'`.

---

## 10. Money Handling

| Rule | Detail |
|------|--------|
| Unit | Integer paise (₹1 = 100 paise) |
| Type | `INTEGER` (not NUMERIC, not FLOAT) |
| Storage | Never stored as rupees or decimal |
| Rounding | Applied only at display layer (divide by 100) |
| Constraints | All money columns have `CHECK (col >= 0)` |
| Authority | Backend (Edge Function) calculates all totals; client values are informational only |
| Historical | Order money values stored as snapshots in `order_items` and `orders`; never updated |

---

## 11. Full-Text Search Architecture

### Approach

`products.search_vector` — a `tsvector` column maintained by triggers.

### Text fields and weights

| Field | Weight | Table |
|-------|--------|-------|
| `products.name` | A (highest) | products |
| `brands.name` | B | brands (via trigger) |
| `manufacturers.name` | B | manufacturers (via trigger) |
| `product_compositions.composition_name + strength` | B | product_compositions (via trigger) |
| `products.description` | C | products |
| `products.uses` | C | products |
| `products.pack_size` | D (lowest) | products |

### Trigger chain

1. **Product INSERT/UPDATE** → `update_products_search_vector()` trigger rebuilds `search_vector` using all weighted fields.
2. **Brand name change** → `update_products_search_vector_for_brand()` triggers `UPDATE products` for all referencing products → fires trigger 1.
3. **Manufacturer name change** → `update_products_search_vector_for_manufacturer()` triggers same chain.
4. **Composition INSERT/UPDATE/DELETE** → `update_products_search_vector_for_composition()` triggers `UPDATE products` for the owning product → fires trigger 1.

### Index

`GIN` index on `products.search_vector` (migration 012). Enables fast `@@` operator queries.

### Query pattern

```sql
SELECT id, name, selling_price_paise, ts_rank(search_vector, query) AS rank
FROM products, plainto_tsquery('english', unaccent($1)) AS query
WHERE search_vector @@ query
  AND is_active = TRUE
  AND archived_at IS NULL
ORDER BY rank DESC
LIMIT 20;
```

### Trigram fallback

GIN trigram index on `products.name` and `product_compositions.composition_name` supports `ILIKE '%query%'` for short queries (< 2 characters) or when FTS returns no results.

---

## 12. Circular FK Resolution

Two pairs of tables have a dependency cycle at migration time:

| Table | Column | References | Resolution |
|-------|--------|-----------|-----------|
| `inventory_transactions` | `order_id` | `orders` | Column created nullable in migration 004; FK added in migration 008 |
| `coupon_usage` | `order_id` | `orders` | Column created nullable in migration 007; FK added in migration 008 |

In both cases:
- The column exists from the beginning (nullable)
- The FK constraint is added after `orders` is created
- `ON DELETE SET NULL` is used so that the extremely rare hard-deletion of an order does not cascade to the ledger records

---

## 13. Constraint Audit Summary

### Primary keys
All 25 tables have explicit primary keys. 23 use UUID; `profiles` uses `auth.users.id` UUID; `app_settings` uses TEXT key.

### Foreign keys with intentional ON DELETE behaviour

| FK | ON DELETE | Rationale |
|----|-----------|-----------|
| `profiles.id → auth.users` | CASCADE | Profile follows auth user lifecycle |
| `admin_users.user_id → auth.users` | RESTRICT | Prevents orphaning admin records |
| `carts.user_id → auth.users` | CASCADE | Cart is ephemeral; follows user |
| `user_addresses.user_id → auth.users` | CASCADE | Personal data; follows user |
| `orders.user_id → auth.users` | RESTRICT | Historical business record; must not auto-delete |
| `orders.address_id → user_addresses` | SET NULL | Address deletion OK; snapshot survives |
| `orders.coupon_id → coupons` | SET NULL | Coupon deactivation doesn't break orders |
| `order_items.product_id → products` | SET NULL | Emergency product deletion doesn't break history |
| `order_items.order_id → orders` | RESTRICT | Items are part of the order; must not orphan |
| `inventory.product_id → products` | RESTRICT | Cannot delete product with inventory |
| `inventory_transactions.product_id → products` | RESTRICT | Ledger must not lose product reference |
| `inventory_transactions.order_id → orders` | SET NULL | Emergency order deletion OK; ledger survives |
| `products.category_id → categories` | RESTRICT | Cannot delete category with products |
| `coupon_usage.coupon_id → coupons` | RESTRICT | Historical usage must survive |
| `coupon_usage.order_id → orders` | SET NULL | Emergency order deletion OK |
| `user_notifications.notification_id → notifications` | CASCADE | Delivery records follow notification |
| `admin_activity_logs.admin_user_id → admin_users` | SET NULL | Log survives admin user deactivation |

### Unique constraints

| Table | Unique on | Notes |
|-------|-----------|-------|
| `profiles` | `id` (PK) | 1:1 with auth.users |
| `admin_users` | `user_id` | One admin record per auth user |
| `admin_roles` | `name` | Role names are unique |
| `admin_permissions` | `permission_key` | Dot-notation keys |
| `categories` | `slug` | URL-safe identifier |
| `brands` | `slug` | URL-safe identifier |
| `manufacturers` | `slug` | URL-safe identifier |
| `products` | `slug`, `sku` | Both must be globally unique |
| `product_images` | Partial: `(product_id) WHERE is_primary = TRUE` | One primary per product |
| `carts` | `user_id` | One cart per user |
| `cart_items` | `(cart_id, product_id)` | One row per product per cart |
| `user_addresses` | Partial: `(user_id) WHERE is_default = TRUE` | One default per user |
| `coupons` | `code` | Uppercase; globally unique |
| `orders` | `order_number`, `(user_id, idempotency_key)` | Dedup and human-readable ID |
| `payments` | `order_id` | One payment record per order |
| `user_notifications` | `(notification_id, user_id)` | No duplicate delivery |
| `coupon_usage` | `order_id` | One coupon use per order |

### Check constraints (selected)

| Table | Constraint | Rule |
|-------|-----------|------|
| `products` | `chk_products_mrp_positive` | `mrp_paise > 0` |
| `products` | `chk_products_selling_price_lte_mrp` | `selling_price_paise <= mrp_paise` |
| `products` | `chk_products_archived_is_inactive` | `archived_at IS NULL OR is_active = FALSE` |
| `inventory` | `chk_inventory_available_quantity` | `available_quantity >= 0` |
| `inventory_transactions` | `chk_inv_tx_quantity_math` | `quantity_after = quantity_before + quantity_change` |
| `cart_items` | `chk_cart_items_quantity` | `quantity > 0` |
| `coupons` | `chk_coupons_percentage_range` | `1 <= discount_value <= 100` (for percentage type) |
| `coupons` | `chk_coupons_date_range` | `starts_at < expires_at` (when both set) |
| `orders` | `chk_orders_total` | `total_paise >= 0` |
| `orders` | `chk_orders_cancelled_at` | `cancelled_at IS NULL OR status = 'cancelled'` |
| `order_items` | `chk_order_items_selling_lte_mrp` | `selling_price_paise_snapshot <= mrp_paise_snapshot` |
| `order_status_history` | `chk_order_history_single_actor` | Cannot have both user and admin as actor |
| `user_notifications` | `chk_user_notifications_read_at` | `read_at NOT NULL iff is_read = TRUE` |

### Excluded features

| Feature | Tables | Status |
|---------|--------|--------|
| Prescription upload | None | ✅ Not implemented |
| Prescription management | None | ✅ Not implemented |
| Billing / POS | None | ✅ Not implemented |
| Mock or demo data | None | ✅ No data inserted (except structural seeds) |

---

## 14. Actions Requiring Human Configuration

The following steps cannot be performed by the agent and require a human:

| # | Action | Where |
|---|--------|-------|
| 1 | Create a Supabase project | [supabase.com](https://supabase.com) → New Project |
| 2 | Obtain: Project Reference ID, API URL, Anon Key, Service Role Key | Supabase Dashboard → Project Settings → API |
| 3 | Add secrets to Replit: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF` | Replit → Secrets panel |
| 4 | Install Supabase CLI and link project: `supabase login && supabase link --project-ref <REF>` | Terminal |
| 5 | Apply all migrations: `supabase db push` | Terminal |
| 6 | Configure Supabase Auth: enable Phone provider with an SMS provider (Twilio / MessageBird) | Supabase Dashboard → Auth → Providers |
| 7 | Configure Supabase Auth: enable Email provider for admin accounts | Supabase Dashboard → Auth → Providers |
| 8 | Create Supabase Storage buckets: `product-images` (public), `banner-images` (public) | Supabase Dashboard → Storage |
| 9 | Set storage bucket policies (public read for image buckets; authenticated write only) | Supabase Dashboard → Storage → Policies |
| 10 | Create first Super Admin: add user in Supabase Auth → insert row in `admin_users` → insert row in `admin_user_roles` linking to `super_admin` role | Supabase SQL Editor or Dashboard |
| 11 | Update `app_settings` with real values (support phone, support email, delivery charges) | Admin panel (after STEP 4) or Supabase SQL Editor |
| 12 | Apply STEP 3 RLS policies (see `docs/RLS_SECURITY_PLAN.md`) | STEP 3 of this project |
| 13 | Generate TypeScript types after applying migrations (see `docs/DATABASE_TYPES_GENERATION.md`) | Terminal: `supabase gen types typescript ...` |
