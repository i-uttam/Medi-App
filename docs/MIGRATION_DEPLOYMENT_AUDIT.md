# Migration Deployment Audit
## Online Pharmacy Platform — Supabase Connection & Deployment Report

**Generated:** 2026-07-07  
**Audited by:** STEP 4 — Connect & Deploy  
**Node.js:** v24.13.0  
**Supabase CLI:** v2.109.0 (via npx)

---

## LOCAL MIGRATIONS EXIST

**Status:** 25 local migration files confirmed in `supabase/migrations/`.

## REMOTE MIGRATIONS NOT YET VERIFIED

**Status:** No Supabase project has been linked. Remote state is unknown. Required secrets have not been configured.

---

## 1. Local Supabase Initialization State

| Item | Status | Detail |
|---|---|---|
| Supabase CLI installed | ✅ YES | v2.109.0 via npx |
| `supabase/config.toml` | ✅ CREATED | Created by `supabase init` during STEP 4 audit |
| `supabase/.gitignore` | ✅ CREATED | Created by `supabase init` |
| `supabase/migrations/` | ✅ EXISTS | 25 migration files |
| `supabase/tests/` | ⚠️ PARTIAL | `database_verification.sql` exists; security test files created in STEP 4 |
| `.supabase/` state dir | ❌ MISSING | Created only after `supabase link` runs |

---

## 2. Remote Linking State

| Item | Status | Detail |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | ❌ NOT CONFIGURED | Required for non-interactive CLI auth |
| `SUPABASE_DB_PASSWORD` | ❌ NOT CONFIGURED | Required for `db push` |
| `SUPABASE_PROJECT_ID` | ❌ NOT CONFIGURED | Required for `supabase link` |
| `SUPABASE_URL` | ❌ NOT CONFIGURED | Required for client applications |
| `SUPABASE_ANON_KEY` | ❌ NOT CONFIGURED | Required for client applications |
| Remote link state | ❌ NOT LINKED | `supabase link` has not been run |

**Blocker:** All three CLI secrets must be added to Replit Secrets before any remote operation can proceed.

---

## 3. Local Migration Count

**Total:** 25 migrations

---

## 4. Ordered Migration List

| # | Filename | Step | Description |
|---|---|---|---|
| 001 | `001_extensions_and_types.sql` | STEP 2 | Extensions (uuid-ossp, pg_trgm), all ENUMs |
| 002 | `002_profiles_and_admin.sql` | STEP 2 | profiles, admin_users, admin_roles, admin_permissions, admin_role_permissions, admin_user_roles; seeds all permissions and super_admin role |
| 003 | `003_catalog.sql` | STEP 2 | categories, brands, manufacturers, products |
| 004 | `004_inventory.sql` | STEP 2 | inventory, inventory_transactions (without order_id FK) |
| 005 | `005_cart.sql` | STEP 2 | carts, cart_items |
| 006 | `006_addresses.sql` | STEP 2 | user_addresses (with partial unique index for is_default) |
| 007 | `007_coupons.sql` | STEP 2 | coupons, coupon_usage (without order FK) |
| 008 | `008_orders.sql` | STEP 2 | orders, order_items, order_status_history, payments; resolves deferred FKs for inventory_transactions and coupon_usage |
| 009 | `009_notifications.sql` | STEP 2 | notifications, user_notifications |
| 010 | `010_content_and_settings.sql` | STEP 2 | banners, app_settings |
| 011 | `011_audit_logs.sql` | STEP 2 | admin_activity_logs |
| 012 | `012_indexes.sql` | STEP 2 | Performance indexes |
| 013 | `013_updated_at_triggers.sql` | STEP 2 | updated_at auto-update triggers on all tables |
| 014 | `014_security_helpers.sql` | STEP 3 | 9 SECURITY DEFINER helper functions + assert guards |
| 015 | `015_enable_rls.sql` | STEP 3 | ENABLE + FORCE ROW LEVEL SECURITY on all 25 tables |
| 016 | `016_customer_rls_policies.sql` | STEP 3 | RLS SELECT policies for 10 customer-owned tables |
| 017 | `017_catalog_rls_policies.sql` | STEP 3 | RLS SELECT policies for 12 catalogue/content tables |
| 018 | `018_admin_rbac_policies.sql` | STEP 3 | Permission-gated admin RLS policies on all tables |
| 019 | `019_secure_profile_functions.sql` | STEP 3 | `update_my_profile`, `get_my_profile` RPCs |
| 020 | `020_secure_cart_functions.sql` | STEP 3 | 7 cart management SECURITY DEFINER RPCs |
| 021 | `021_secure_address_functions.sql` | STEP 3 | 4 address management SECURITY DEFINER RPCs |
| 022 | `022_secure_inventory_functions.sql` | STEP 3 | `admin_adjust_inventory`, `get_product_availability` RPCs |
| 023 | `023_secure_order_functions.sql` | STEP 3 | Coupon validation, order cancel/status RPCs, notification RPCs; defines `coupon_validation_result` composite type |
| 024 | `024_secure_admin_functions.sql` | STEP 3 | Block/unblock customer, archive product, update app setting RPCs |
| 025 | `025_security_privileges.sql` | STEP 3 | Final REVOKE/GRANT sweep; anon role policy |

---

## 5. STEP 2 Migration Range

Migrations **001–013** (13 files).

---

## 6. STEP 3 Migration Range

Migrations **014–025** (12 files).

---

## 7. Migration Dependency Chain

```
001  Extensions and ENUMs (no deps)
 └── 002  profiles + admin tables (depends: 001 ENUMs)
 └── 003  catalog tables (depends: 001 ENUMs)
 └── 004  inventory (depends: 003 products)
 └── 005  cart (depends: 003 products, auth.users)
 └── 006  addresses (depends: auth.users)
 └── 007  coupons (depends: 001 ENUMs; coupon_usage has no order FK yet)
 └── 008  orders (depends: all prior; resolves 004/007 deferred FKs)
 └── 009  notifications (depends: auth.users)
 └── 010  content + settings (no FK deps)
 └── 011  audit_logs (depends: 002 admin_users)
 └── 012  indexes (depends: all tables exist)
 └── 013  triggers (depends: all tables exist)
 └── 014  security helpers (depends: 002 admin_users, 003 profiles, auth schema)
 └── 015  enable RLS (depends: all 001–013 tables)
 └── 016  customer policies (depends: 014 helpers, 015 RLS)
 └── 017  catalog policies (depends: 014 helpers, 015 RLS)
 └── 018  admin RBAC policies (depends: 014 helpers, 015 RLS, 016, 017)
 └── 019  profile RPCs (depends: 014 helpers, 015–018 RLS)
 └── 020  cart RPCs (depends: 014, 015–018)
 └── 021  address RPCs (depends: 014, 015–018; uses address_type enum from 001)
 └── 022  inventory RPCs (depends: 014, 015–018; uses inventory_transaction_type enum from 001)
 └── 023  order RPCs (depends: 014, 015–018; defines coupon_validation_result type)
 └── 024  admin mgmt RPCs (depends: 014, 015–018, 023 order_status enum)
 └── 025  privileges (depends: all 001–024 tables and functions)
```

---

## 8. Potential Migration Conflicts

| Risk | Severity | Detail |
|---|---|---|
| Deferred FK: inventory_transactions.order_id | RESOLVED | FK deferred to 008; circular dep handled correctly |
| Deferred FK: coupon_usage.order_id | RESOLVED | FK deferred to 008; same strategy |
| auth.users FK references | LOW | Supabase manages auth schema; all FK references to auth.users are valid in Supabase |
| `supabase init` project_id | NOTE | Set to "workspace" (directory name); overwritten by `supabase link` |

---

## 9. Potential Circular Dependencies

None detected. Circular deps between `inventory_transactions↔orders` and `coupon_usage↔orders` are explicitly resolved via deferred FK creation in migration 008.

---

## 10. Duplicate Object Risks

| Check | Result |
|---|---|
| Duplicate policy names | ✅ NONE |
| Duplicate function signatures | ✅ NONE |
| Duplicate trigger names | ✅ NONE |
| Duplicate index names | ✅ NONE |
| Duplicate type names | ✅ NONE |
| Duplicate table names | ✅ NONE |

---

## 11. Static SQL Audit Findings (Pre-Push)

### BUGS IDENTIFIED AND FIXED IN STEP 4 (before any remote push)

These bugs were found during static audit and corrected **before any migration was applied remotely**. No migration repair is needed.

| # | Migration | Problem | Correction | Reason |
|---|---|---|---|---|
| 1 | `023_secure_order_functions.sql` | `from_status` in `order_status_history` INSERT was captured **after** `UPDATE ... RETURNING *`, meaning it stored the new status as `from_status` instead of the prior status | Added `v_prior_status := v_order.status` **before** each UPDATE; used `v_prior_status` in all history INSERTs | `RETURNING *` overwrites the variable with post-update values; prior status must be saved first |
| 2 | `023_secure_order_functions.sql` | `cancel_my_order`: history INSERT used hardcoded `'pending'` as `from_status` and then attempted a second UPDATE to fix it (unreliable approach) | Replaced with `v_prior_status` variable captured before the UPDATE | Clean single-step approach; avoids update-after-insert race |
| 3 | `024_secure_admin_functions.sql` | `admin_update_app_setting` used `'setting_updated'` as `admin_activity_action` value | Corrected to `'app_settings_updated'` | Enum `admin_activity_action` (migration 001) defines `'app_settings_updated'`, not `'setting_updated'` |
| 4 | `024_secure_admin_functions.sql` | `admin_update_app_setting` called `assert_active_admin('settings.manage')` but the seeded permission key is `settings.update` | Corrected to `assert_active_admin('settings.update')` | Migration 002 seeds `settings.update` not `settings.manage`; wrong key would always deny non-super-admins |
| 5 | `021_secure_address_functions.sql` | `create_my_address`: `EXISTS` check + conditional `is_default` is not atomic — two concurrent first-address creates for the same user could both decide `is_default = TRUE` | Added `PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE` before the EXISTS check to serialize concurrent operations per user | Profile row lock prevents ABBA-style race without needing advisory locks |

### NO OTHER ISSUES FOUND

| Check | Result |
|---|---|
| Hardcoded secrets in migrations | ✅ NONE |
| Invalid enum values in audit log inserts | ✅ NONE (verified against 001) |
| Missing GRANT SELECT for tables with RLS policies | ✅ NONE (025 covers all 25 tables) |
| Storage schema references | ✅ NONE (storage is not in migrations) |
| Functions without REVOKE FROM PUBLIC | ✅ ALL REVOKED (verified in 014, 019–024) |
| Nonexistent columns referenced | ✅ NONE |
| Circular FK without deferred resolution | ✅ NONE |
| `FOR UPDATE OF alias` syntax | ✅ VALID (PostgreSQL accepts table aliases in OF clause) |

---

## 12. Missing Files (Referenced by Prompt but Not Found)

| File | Status | Action |
|---|---|---|
| `supabase/tests/security_verification.sql` | MISSING | Created in STEP 4 |
| `supabase/tests/security_audit.sql` | MISSING | Created in STEP 4 |
| `docs/FUNCTION_PRIVILEGES.md` | MISSING | Created in STEP 4 |
| `docs/SUPER_ADMIN_BOOTSTRAP.md` | MISSING | Created in STEP 4 |
| `docs/STORAGE_SECURITY_PLAN.md` | MISSING | Created in STEP 4 |

---

## 13. Existing Remote Deployment Claims

| Document | Claim | Verified? |
|---|---|---|
| `docs/RLS_SECURITY_PLAN.md` | Status: "Plan (not yet implemented)" | ✅ Accurate |
| `docs/DATABASE_TYPES_GENERATION.md` | All steps require human action | ✅ Accurate |
| `docs/SECURITY_ARCHITECTURE.md` | Documents design intent (STEP 3) | ⚠️ Not yet verified against real DB |
| `supabase/config.toml` | `project_id = "workspace"` (local only) | ⚠️ Not a real project reference |

**No document falsely claims remote migration success.**

---

## 14. Actual Verified Deployment Status

| Layer | Status |
|---|---|
| Local migration files | ✅ 25 files present, valid, audited |
| Supabase CLI initialized | ✅ config.toml created |
| Supabase project linked | ❌ NOT LINKED — awaiting secrets |
| Remote migration history | ❌ NOT CHECKED — awaiting link |
| Remote schema verification | ❌ NOT EXECUTED |
| RLS verification | ❌ NOT EXECUTED |
| Security function verification | ❌ NOT EXECUTED |
| Database tests | ❌ NOT EXECUTED |
| TypeScript types generated | ❌ NOT EXECUTED |

---

## 15. Update Log

| Date | Phase | Action |
|---|---|---|
| 2026-07-07 | STEP 4 Phase 1 | Full project inspection complete |
| 2026-07-07 | STEP 4 Phase 2 | This audit document created |
| 2026-07-07 | STEP 4 Phase 3 | `supabase init` run; `config.toml` created |
| 2026-07-07 | STEP 4 Phase 3 | Static SQL audit complete; 5 bugs found and fixed |
| 2026-07-07 | STEP 4 Phase 4 | Awaiting user to configure 3 required Replit Secrets |

*This document will be updated after each subsequent phase.*
