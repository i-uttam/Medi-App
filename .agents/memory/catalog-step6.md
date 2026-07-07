---
name: MediGo Catalog Step 6 Architecture
description: Architecture decisions and patterns used for the real Supabase catalog integration in the customer mobile app.
---

## Core architecture

All catalog reads go through `artifacts/customer-app/features/catalog/catalog.service.ts`.
Hooks are in `catalog.hooks.ts`. Query keys in `catalog.keys.ts`. Domain types in `catalog.types.ts`.
Screens import hooks — never call Supabase directly.

## Key decisions

**Availability:** Use `get_product_availability()` SECURITY DEFINER RPC. Never query `inventory_transactions` directly (denied by RLS). Customers CAN read `inventory.available_quantity` via RLS (migration 017), so list queries join inventory inline for efficiency.

**Why:** `inventory_transactions` is an internal ledger denied to customers. The RPC provides a safe abstraction.

**Product list query:** Single Supabase query joining `brands`, `manufacturers`, `product_images`, `inventory` for the list projection — avoids N+1 fetches.

**Search:** `.textSearch('search_vector', query, { type: 'websearch', config: 'english' })` — uses `websearch_to_tsquery` which is safe for user input. 400ms debounce before query fires.

**Pagination:** `useInfiniteQuery` with range-based offset (20/page) for category products and search results.

**Banner security:** `link_type = 'url'` is NOT navigated. Only `product` and `category` types navigate, and `linkValue` must pass UUID regex validation before `router.push`.

**Image failures in BannerCarousel:** Failed images are tracked in `failedIds` state and filtered out of the visible list — no blank cells shown.

**Error handling:** Each home section has independent query error state shown as inline `SectionError` with retry. Failed sections do not block other sections.

**Recent searches/recently viewed:** AsyncStorage via `useRecentSearches` and `useRecentlyViewed` hooks. Max 10 entries each.

## Money

All prices stored as integer paise. Use `formatPaise()` and `discountPercent()` from `lib/money.ts`. Never use floating point as money source of truth.

## RLS summary (migration 017)

- `products`: `is_active = TRUE AND archived_at IS NULL` (auto-enforced, also added explicitly in queries)
- `categories`/`brands`/`manufacturers`: `is_active = TRUE`
- `banners`: `is_active + starts_at/ends_at window`
- `inventory`: customers can SELECT `available_quantity`
- `inventory_transactions`: DENIED (no SELECT policy)
- `coupons`: DENIED (use validate_my_coupon RPC)
