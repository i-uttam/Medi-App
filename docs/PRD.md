# Product Requirements Document — Online Pharmacy Platform

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-07  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Product Scope](#2-product-scope)
3. [User Roles](#3-user-roles)
4. [Customer Application Modules](#4-customer-application-modules)
5. [Admin Panel Modules](#5-admin-panel-modules)
6. [Order Status System](#6-order-status-system)
7. [Inventory Business Rules](#7-inventory-business-rules)
8. [Pricing Business Rules](#8-pricing-business-rules)
9. [Order Creation Rules](#9-order-creation-rules)
10. [Data Ownership Rules](#10-data-ownership-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)

---

## 1. Product Overview

### 1.1 Product Purpose

The platform is a production-ready online pharmacy system that enables customers to discover, browse, and order medicines from their mobile device, while administrators manage catalogue, inventory, orders, and customers from a web-based control panel. All data flows through a single shared backend and PostgreSQL database.

### 1.2 Main Customer Problem

Patients and caregivers face friction when purchasing medicines: physical pharmacies have limited hours, inconsistent stock, and no price transparency. There is no reliable, safe way to quickly order common medicines with home delivery and real-time order tracking.

### 1.3 Product Solution

A mobile-first medicine ordering system where:
- Customers browse a structured medicine catalogue, manage a cart, apply coupons, and place Cash on Delivery (COD) orders with address selection and real-time order tracking.
- Admins manage the full product lifecycle, inventory levels, order fulfilment workflow, customer accounts, promotions, and platform configuration from a responsive web panel.

### 1.4 Target Users

| Persona | Description |
|---------|-------------|
| **Patient** | Individual managing their own medication needs |
| **Caregiver** | Family member ordering medicines on behalf of a patient |
| **Admin** | Pharmacy operations staff managing orders and inventory |
| **Super Admin** | Platform owner managing all system configuration and admin users |

### 1.5 Customer Mobile Application

- Built with React Native + Expo + TypeScript
- Routing via Expo Router
- Server state via TanStack Query
- Client state via Zustand
- Form management via React Hook Form + Zod
- Communicates exclusively with the shared backend via authenticated REST API calls

### 1.6 Admin Panel

- Built with Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Server state via TanStack Query
- Form management via React Hook Form + Zod
- Communicates exclusively with the shared backend via authenticated REST API calls
- Responsive web application accessible from desktop and tablet

### 1.7 Shared Backend Architecture

- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Authentication: Supabase Auth (phone/OTP for customers, email/password for admins)
- File Storage: Supabase Storage (medicine images, banners)
- Business logic: Supabase Edge Functions for secure server-side operations (order placement, inventory management, coupon validation)
- All application state is persisted in PostgreSQL; no ephemeral state outside the database

---

## 2. Product Scope

### 2.1 Current Version Scope

#### Customer Mobile App
- Phone-based OTP authentication
- Medicine browsing (home, categories, search)
- Medicine detail view
- Cart management (add, increase, decrease, remove)
- Address management (add, edit, delete, set default)
- Coupon application and removal
- Checkout with address selection and coupon
- Cash on Delivery order placement
- Order history and detail view
- Order timeline tracking
- Order cancellation (eligible statuses only)
- Reorder from past orders
- Customer profile management
- Push notification display
- Help and support contact actions
- Account deletion

#### Admin Panel
- Admin authentication (email/password)
- Dashboard with summary metrics
- Medicine management (create, edit, activate, deactivate, archive)
- Category management
- Brand management
- Manufacturer management
- Inventory management (adjust stock, view history, view low stock)
- Order management (view, search, filter, update status, cancel)
- Customer management (view, block, unblock)
- Banner management (create, schedule, activate, deactivate)
- Coupon management (create, edit, activate, deactivate)
- Push notification creation and dispatch
- Application configuration management
- Admin user management
- Role and permission management
- Admin activity log review

### 2.2 Future Version Scope

The following features are **explicitly deferred** and must not appear in any current module, flow, API, or database schema beyond what is necessary for future migration:

- Prescription upload by customer
- Prescription image management
- Prescription verification workflow
- Prescription-required product flagging
- Billing system
- Point of Sale (POS) system
- Online payment gateway integration
- Delivery partner API integration
- Loyalty points / rewards system
- Product reviews and ratings
- Product recommendations / ML personalisation

### 2.3 Explicit Exclusions from Current Version

| Feature | Reason for Exclusion |
|---------|----------------------|
| Prescription upload | Deferred to future version |
| Prescription verification | Deferred to future version |
| Prescription management | Deferred to future version |
| Billing / invoicing system | Deferred to future version |
| POS system | Deferred to future version |
| Online payment | Only COD is supported in this version |
| Mock data / demo data | All data must be real and admin-managed |

---

## 3. User Roles

### 3.1 Customer

**Authentication:** Phone number + OTP via Supabase Auth.

| Action | Scope |
|--------|-------|
| **View** | Own profile, own orders, own addresses, own cart, own notifications, public medicine catalogue, active banners, active categories |
| **Create** | Own profile data, cart items, addresses, orders (COD only), coupon application |
| **Update** | Own profile (name, email), own addresses, cart item quantities |
| **Delete** | Own addresses, own cart items, own account |
| **Cannot** | View other customers' data; access admin panel; modify orders after cancellation window; view inactive or archived medicines |

### 3.2 Admin

**Authentication:** Email + password via Supabase Auth. Must belong to the `admin` role.

| Action | Scope |
|--------|-------|
| **View** | All medicines (including inactive/archived), all categories, all brands, all manufacturers, all inventory, all orders, all customers, all banners, all coupons, all notifications, activity logs for own actions, app configuration |
| **Create** | Medicines, categories, brands, manufacturers, inventory adjustments, banners, coupons, notifications |
| **Update** | Medicine details/status, category details, brand details, manufacturer details, inventory (with reason), order status (valid transitions only), banner status/schedule, coupon status/limits, app configuration |
| **Delete** | Soft-delete only (archive medicines, deactivate banners/coupons). No hard deletes |
| **Cannot** | Create or delete admin users; assign or change roles; view Super Admin audit logs; access other admins' account settings |

### 3.3 Super Admin

**Authentication:** Email + password via Supabase Auth. Must belong to the `super_admin` role.

| Action | Scope |
|--------|-------|
| **View** | Everything an Admin can view, plus all admin users, all role assignments, full activity log for all admins |
| **Create** | Admin user accounts, custom roles (future) |
| **Update** | Admin user details, role assignments, own profile |
| **Delete** | Admin user accounts (soft-delete / deactivate); deactivate admin access |
| **Manage** | Platform-wide configuration; full audit log access |

**Permission inheritance:** Super Admin inherits all Admin permissions in addition to their own.

---

## 4. Customer Application Modules

### 4.1 Splash and App Initialization

**Purpose:** Display branding during cold start, initialise session, and route the user to the appropriate screen.

| Attribute | Detail |
|-----------|--------|
| **User actions** | None (passive display) |
| **System behaviour** | Check for stored session token → validate with Supabase Auth → route to Home if valid; route to Login if invalid or absent |
| **Required data** | Stored auth session |
| **Loading state** | Splash screen with app logo |
| **Empty state** | N/A |
| **Error state** | If session validation fails due to network error, route to Login; do not block on session check indefinitely |
| **Success state** | Navigate to Home |
| **Validation rules** | Session token must be non-expired; re-validate with Supabase Auth |
| **Security** | Session token must be stored in secure storage (Expo SecureStore), never in AsyncStorage |
| **Database interaction** | None during splash; Supabase Auth validates session token |
| **Admin dependencies** | None |

---

### 4.2 Authentication

**Purpose:** Allow new and returning customers to authenticate via phone OTP. No passwords are used.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Enter phone number → request OTP → enter OTP → confirm |
| **System behaviour** | Phone number is normalised and submitted to Supabase Auth OTP flow; upon successful verification, check if a customer profile row exists; if not, prompt profile creation |
| **Required data** | Phone number (E.164 format), OTP (6 digits) |
| **Loading state** | Button disabled and shows spinner during OTP request and verification |
| **Empty state** | Phone field empty; OTP field hidden until OTP is sent |
| **Error state** | Invalid phone format, OTP incorrect, OTP expired, account blocked — each shows a distinct error message |
| **Success state** | Navigate to Home (returning user) or Profile Setup (new user) |
| **Validation rules** | Phone must be a valid E.164 number; OTP must be exactly 6 digits; OTP expires in 5 minutes |
| **Security** | OTP delivered via SMS by Supabase Auth; rate-limiting on OTP requests; max 3 incorrect OTP attempts before lockout |
| **Database interaction** | Supabase Auth user table; `customers` table checked/created on first login |
| **Admin dependencies** | Admin can block a customer account, which prevents authentication |

---

### 4.3 Home

**Purpose:** Entry point after login; surfaces featured banners, popular categories, and featured/promoted medicines.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap banner (navigate to target), tap category (navigate to category listing), tap medicine card (navigate to detail), pull-to-refresh |
| **System behaviour** | Load active banners ordered by sort position, active categories, and featured medicines in a single or parallel API call |
| **Required data** | Active banners, active categories (top-level), featured medicines |
| **Loading state** | Skeleton placeholders for each section |
| **Empty state** | Sections hidden individually if no data exists |
| **Error state** | Retry button shown; partial sections shown if only one section fails |
| **Success state** | All sections rendered with real data |
| **Validation rules** | Banners must have `is_active = true` and be within `start_date`/`end_date` if scheduled |
| **Security** | Only authenticated users can access home |
| **Database interaction** | `banners`, `categories`, `medicines` tables |
| **Admin dependencies** | Banners and featured flags managed by Admin |

---

### 4.4 Search

**Purpose:** Allow customers to find medicines by name, generic name, or brand.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Type query, select suggestion, clear query, apply filters, apply sort, tap result |
| **System behaviour** | Debounce input by 300ms; send search query to backend; display results; persist recent searches locally |
| **Required data** | Search query string, optional filters (category, price range), optional sort |
| **Loading state** | Activity indicator while results are loading |
| **Empty state** | "No results for [query]" message with suggestion to try different terms |
| **Error state** | "Search failed" with retry action |
| **Success state** | Paginated medicine list matching query |
| **Validation rules** | Minimum 2 characters before sending request; max 100 characters |
| **Security** | Backend sanitises query to prevent injection |
| **Database interaction** | `medicines` table with full-text search |
| **Admin dependencies** | Medicine names and search metadata managed by Admin |

---

### 4.5 Categories

**Purpose:** Allow customers to browse medicines organised by therapeutic or product category.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap a category card to view its medicine listing; navigate sub-categories if present |
| **System behaviour** | Load active top-level categories; on selection, load medicines belonging to that category |
| **Required data** | `categories` with `is_active = true`, associated medicines |
| **Loading state** | Category grid skeleton |
| **Empty state** | "No categories available" |
| **Error state** | Retry option |
| **Success state** | Category grid with icon/image and name |
| **Validation rules** | Only `is_active = true` categories are shown |
| **Security** | Authenticated access only |
| **Database interaction** | `categories`, `medicines` tables |
| **Admin dependencies** | Category creation, editing, and activation managed by Admin |

---

### 4.6 Medicine Listing

**Purpose:** Display a paginated, filterable, sortable list of medicines within a context (category, search result, or featured).

| Attribute | Detail |
|-----------|--------|
| **User actions** | Scroll to paginate, apply filter, apply sort, tap card to view details, tap Add to Cart |
| **System behaviour** | Cursor-based or offset pagination; filters applied server-side; sort applied server-side |
| **Required data** | Medicines: name, image, MRP, selling price, discount %, stock status, `is_active`, `is_archived` |
| **Loading state** | Initial skeleton; inline spinner on next-page load |
| **Empty state** | "No medicines found" |
| **Error state** | Retry button |
| **Success state** | Medicine cards with name, image, price, discount, add-to-cart control |
| **Validation rules** | Only `is_active = true` and `is_archived = false` medicines displayed to customers |
| **Security** | Authenticated access only |
| **Database interaction** | `medicines`, `inventory` tables |
| **Admin dependencies** | Medicine activation and pricing managed by Admin |

---

### 4.7 Medicine Details

**Purpose:** Display full information for a single medicine to support informed purchase decisions.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View images, read details, tap Add to Cart, adjust quantity in cart, share |
| **System behaviour** | Load full medicine record; record product view in `recently_viewed` for this customer |
| **Required data** | Medicine: name, images, description, composition, manufacturer, brand, MRP, selling price, discount, stock status |
| **Loading state** | Full-screen skeleton |
| **Empty state** | N/A (arrived via navigation with valid ID) |
| **Error state** | "Unable to load product" with back navigation |
| **Success state** | Full detail view with add-to-cart control reflecting current cart state |
| **Validation rules** | If medicine is inactive or archived, show "Product no longer available" and disable cart actions |
| **Security** | Authenticated access only |
| **Database interaction** | `medicines`, `inventory`, `recently_viewed`, `cart_items` tables |
| **Admin dependencies** | All medicine content managed by Admin |

---

### 4.8 Cart

**Purpose:** Maintain the customer's selected items before checkout.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View items, increase quantity, decrease quantity, remove item, proceed to checkout |
| **System behaviour** | Cart is persisted server-side; prices refreshed from DB on cart load; unavailable items flagged |
| **Required data** | `cart_items`, current prices and stock from `medicines`/`inventory` |
| **Loading state** | Cart skeleton |
| **Empty state** | "Your cart is empty" with Browse Medicines CTA |
| **Error state** | Per-item error flags for out-of-stock or inactive items; toast for mutation failures |
| **Success state** | Item list with real-time price subtotals |
| **Validation rules** | Quantity ≥ 1; quantity ≤ available stock; maximum per-item quantity = `max_per_order` if configured |
| **Security** | Cart is customer-scoped; customers can only see and modify their own cart |
| **Database interaction** | `carts`, `cart_items`, `medicines`, `inventory` tables |
| **Admin dependencies** | Product active status and inventory levels affect cart validity |

---

### 4.9 Saved Addresses

**Purpose:** Allow customers to manage delivery addresses.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Add address, edit address (via explicit Edit button only), delete address, set as default |
| **System behaviour** | Address list loaded from backend; default address flagged |
| **Required data** | `addresses` table: label, full name, phone, address line 1, address line 2, city, state, postal code, is_default |
| **Loading state** | List skeleton |
| **Empty state** | "No saved addresses" with Add Address CTA |
| **Error state** | Mutation failure toast |
| **Success state** | List with default indicator; success toast on add/edit/delete |
| **Validation rules** | All required fields must be non-empty; phone must be valid; postal code must be valid Indian format |
| **Security** | Addresses are customer-scoped; only the owning customer may view, edit, or delete them |
| **Database interaction** | `addresses` table |
| **Admin dependencies** | None |

**Critical UX Rule:** Tapping an address card selects the address (in checkout context) or opens the address detail view. It does NOT enter edit mode. Edit mode is only activated when the customer explicitly taps a dedicated "Edit" button or icon.

---

### 4.10 Checkout

**Purpose:** Allow the customer to review their order, select a delivery address, apply a coupon, and place a COD order.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Select/change delivery address, apply coupon, remove coupon, tap Place Order |
| **System behaviour** | Refresh cart prices from backend; validate stock at checkout init; calculate totals server-side; on Place Order, call backend order-creation Edge Function |
| **Required data** | Validated cart items with fresh prices, selected address ID, coupon code (optional), customer auth token |
| **Loading state** | Spinner during price refresh; Place Order button disabled and shows spinner during order creation |
| **Empty state** | N/A (reached from non-empty cart only) |
| **Error state** | Per-item flags for stock or pricing issues; coupon error inline; Place Order failure toast with human-readable message |
| **Success state** | Navigate to Order Success screen with order ID |
| **Validation rules** | At least one item in cart; address selected; all items in stock; coupon valid (if applied) |
| **Security** | Place Order request authenticated; backend re-validates all data; client-calculated totals are informational only |
| **Database interaction** | `cart_items`, `medicines`, `inventory`, `addresses`, `orders`, `order_items`, `coupons`, `coupon_usages`, `inventory_transactions`, `order_status_history` |
| **Admin dependencies** | Coupon configuration, product pricing, inventory levels |

---

### 4.11 Coupons

**Purpose:** Allow customers to apply discount coupons during checkout.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Enter coupon code, tap Apply, tap Remove |
| **System behaviour** | Send code to backend for validation; if valid, return discount details; apply to order total at checkout |
| **Required data** | Coupon code string |
| **Loading state** | Inline spinner next to Apply button |
| **Empty state** | Coupon code input is empty |
| **Error state** | Inline error: invalid code, expired, minimum order not met, usage limit reached |
| **Success state** | Coupon name and discount amount shown; total updated |
| **Validation rules** | Code must exist; `is_active = true`; within valid date range; customer has not exceeded per-customer usage limit; order total meets minimum order value |
| **Security** | Validation always performed server-side; client display is informational |
| **Database interaction** | `coupons`, `coupon_usages` tables |
| **Admin dependencies** | Coupon creation and configuration managed by Admin |

---

### 4.12 Cash on Delivery

**Purpose:** Provide the sole payment method for this version.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Confirm COD selection (pre-selected by default) |
| **System behaviour** | Order created with `payment_method = 'cod'` and `payment_status = 'pending'` |
| **Required data** | Checkout state; COD is the only available payment method |
| **Validation rules** | No additional validation; COD is always available if the app configuration enables it |
| **Security** | N/A (no payment credentials involved) |
| **Database interaction** | `orders` table: `payment_method`, `payment_status` columns |
| **Admin dependencies** | Admin can toggle COD availability via app configuration |

---

### 4.13 Orders

**Purpose:** Allow customers to review their order history.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View order list, tap order to view details |
| **System behaviour** | Fetch orders owned by the authenticated customer; sorted by creation date descending; paginated |
| **Required data** | `orders`, `order_items` tables |
| **Loading state** | Order list skeleton |
| **Empty state** | "No orders yet" with Browse Medicines CTA |
| **Error state** | Retry button |
| **Success state** | Order cards with order ID, date, status badge, and item count |
| **Validation rules** | Only orders belonging to the authenticated customer are returned |
| **Security** | Backend enforces customer-scoping; Customer A cannot access Customer B's orders |
| **Database interaction** | `orders`, `order_items` tables |
| **Admin dependencies** | Order status updated by Admin |

---

### 4.14 Order Tracking

**Purpose:** Allow customers to track the current status and history of an order.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View order timeline, view order items, view delivery address |
| **System behaviour** | Load order record with full status history; display timeline with timestamps |
| **Required data** | `orders`, `order_status_history`, `order_items` tables |
| **Loading state** | Detail skeleton |
| **Empty state** | N/A |
| **Error state** | "Unable to load order details" with retry |
| **Success state** | Timeline with all status transitions and their timestamps; current status highlighted |
| **Validation rules** | Order must belong to authenticated customer |
| **Security** | Backend enforces ownership check |
| **Database interaction** | `orders`, `order_status_history`, `order_items` tables |
| **Admin dependencies** | Status updated by Admin triggers history record |

---

### 4.15 Order Cancellation

**Purpose:** Allow customers to cancel orders that are in a cancellable state.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap Cancel Order button on eligible orders; confirm cancellation in dialog |
| **System behaviour** | Validate order belongs to customer; validate order is in `pending` or `confirmed` status; call backend to cancel; restore inventory |
| **Required data** | Order ID, customer auth token |
| **Loading state** | Confirmation dialog with spinner on submit |
| **Empty state** | N/A |
| **Error state** | "Order cannot be cancelled" if status is ineligible; generic failure toast |
| **Success state** | Order status updated to `cancelled`; toast confirmation |
| **Validation rules** | Only orders with status `pending` or `confirmed` may be cancelled by the customer |
| **Security** | Backend validates order ownership and status eligibility |
| **Database interaction** | `orders`, `order_status_history`, `inventory`, `inventory_transactions` tables |
| **Admin dependencies** | None (customer-initiated cancellation) |

---

### 4.16 Reorder

**Purpose:** Allow customers to quickly add all items from a past order back into their cart.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap Reorder button on a past order |
| **System behaviour** | Fetch order items; for each item, check if the medicine is still active and in stock; add available items to cart; warn about unavailable items |
| **Required data** | Order items; current medicine availability |
| **Loading state** | Spinner on Reorder button |
| **Empty state** | N/A |
| **Error state** | Partial success: available items added, unavailable items listed in a warning dialog |
| **Success state** | Navigate to cart with items added; toast showing count added |
| **Validation rules** | Inactive or archived medicines are skipped; out-of-stock medicines are skipped |
| **Security** | Backend validates ownership of source order |
| **Database interaction** | `order_items`, `medicines`, `inventory`, `cart_items` tables |
| **Admin dependencies** | Product status affects reorder availability |

---

### 4.17 Profile

**Purpose:** Allow customers to view and edit their personal profile.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View name, email, phone; edit name and email; navigate to address management; navigate to settings |
| **System behaviour** | Load customer profile from `customers` table; submit updates |
| **Required data** | `customers` table: name, email, phone |
| **Loading state** | Profile skeleton |
| **Empty state** | N/A |
| **Error state** | Update failure toast |
| **Success state** | Success toast; updated data reflected immediately |
| **Validation rules** | Name: 2–100 characters; email: valid format (optional field); phone: read-only (set at registration) |
| **Security** | Customers can only edit their own profile; phone cannot be changed |
| **Database interaction** | `customers` table |
| **Admin dependencies** | Admins can view customer profiles; Super Admin can view all |

---

### 4.18 Notifications

**Purpose:** Display in-app notifications sent by Admin.

| Attribute | Detail |
|-----------|--------|
| **User actions** | View notification list, tap to view full notification, mark as read |
| **System behaviour** | Load notifications for authenticated customer; mark as read on tap or on read action |
| **Required data** | `notifications` table filtered to current customer or all-customer broadcasts |
| **Loading state** | Notification list skeleton |
| **Empty state** | "No notifications yet" |
| **Error state** | Retry option |
| **Success state** | List with read/unread indicators |
| **Validation rules** | Only notifications targeting the current customer or broadcast notifications are shown |
| **Security** | Backend filters by customer ID |
| **Database interaction** | `notifications`, `notification_reads` tables |
| **Admin dependencies** | Notifications created and dispatched by Admin |

---

### 4.19 Help and Support

**Purpose:** Allow customers to reach support through available channels.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap phone number to call, tap email to compose, tap WhatsApp to open |
| **System behaviour** | Open native phone/email/WhatsApp handler using contact details from app configuration |
| **Required data** | Support contact details from `app_configuration` table |
| **Loading state** | N/A |
| **Error state** | If configuration not loaded, show default fallback contact |
| **Success state** | Native handler opens |
| **Validation rules** | Contact details must be non-empty |
| **Security** | Authenticated access only |
| **Database interaction** | `app_configuration` table |
| **Admin dependencies** | Contact details configured by Admin |

---

### 4.20 App Settings

**Purpose:** Allow customers to manage in-app preferences.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Toggle notification preferences (if applicable), view app version |
| **System behaviour** | Load and save preferences locally or to `customers` table |
| **Required data** | Customer preferences |
| **Validation rules** | N/A |
| **Security** | Authenticated access only |
| **Database interaction** | `customers` table (preferences column) |
| **Admin dependencies** | None |

---

### 4.21 Account Deletion

**Purpose:** Allow customers to permanently delete their account and associated data.

| Attribute | Detail |
|-----------|--------|
| **User actions** | Tap Delete Account; confirm in dialog |
| **System behaviour** | Call backend to soft-delete or anonymise customer record; revoke Supabase Auth session; clear local storage |
| **Required data** | Customer auth token |
| **Loading state** | Spinner on confirm button |
| **Error state** | "Account deletion failed" toast; account remains active |
| **Success state** | Navigate to Login screen; local session cleared |
| **Validation rules** | Cannot delete account while an order is in a non-terminal status (`pending`, `confirmed`, `processing`, `packed`, `shipped`, `out_for_delivery`). Customer must be informed of active orders |
| **Security** | Backend validates token and checks for active orders before proceeding |
| **Database interaction** | `customers`, Supabase Auth |
| **Admin dependencies** | Admin can view deletion events in activity log |

---

## 5. Admin Panel Modules

### 5.1 Admin Authentication

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Secure login for Admin and Super Admin users |
| **Admin actions** | Enter email + password, submit |
| **System behaviour** | Authenticate via Supabase Auth; verify role claim in JWT; redirect to Dashboard |
| **Validation** | Email required; password required; role must be `admin` or `super_admin` |
| **Database interaction** | Supabase Auth; `admin_users` table |
| **Permission requirements** | Must have `admin` or `super_admin` role |
| **Loading states** | Button disabled with spinner |
| **Empty states** | N/A |
| **Error states** | "Invalid credentials", "Account disabled" |
| **Success feedback** | Redirect to Dashboard |

---

### 5.2 Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Provide at-a-glance operational metrics |
| **Admin actions** | View metrics, navigate to specific modules from quick links |
| **System behaviour** | Aggregate queries: total orders today, pending orders count, total customers, low stock medicines count, revenue today (COD orders delivered) |
| **Validation** | N/A |
| **Database interaction** | Aggregated queries across `orders`, `customers`, `inventory` tables |
| **Permission requirements** | Any admin role |
| **Loading states** | Metric card skeletons |
| **Error states** | Per-card error with retry |
| **Success feedback** | Real-time metric values |

---

### 5.3 Medicine Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full lifecycle management of the medicine catalogue |
| **Admin actions** | Create medicine, edit medicine details, upload images, activate, deactivate, archive |
| **System behaviour** | Create/update medicine record; upload image to Supabase Storage; update medicine status |
| **Validation** | Name required; MRP > 0; selling price > 0 and ≤ MRP; at least one image; category required; brand required |
| **Database interaction** | `medicines`, `categories`, `brands`, `manufacturers` tables; Supabase Storage for images |
| **Permission requirements** | `admin` or `super_admin` |
| **Loading states** | Form field-level and save button spinner |
| **Empty states** | "No medicines yet" |
| **Error states** | Per-field validation errors; save failure toast |
| **Success feedback** | Toast: "Medicine saved", list updated |

**Status definitions:**
- `is_active = true`: Visible to customers, purchasable
- `is_active = false`: Hidden from customers
- `is_archived = true`: Permanently removed from catalogue; cannot be reactivated

---

### 5.4 Category Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage the medicine browsing taxonomy |
| **Admin actions** | Create category, edit name/image/sort order, activate, deactivate |
| **System behaviour** | Create/update category record |
| **Validation** | Name required and unique; image optional |
| **Database interaction** | `categories` table |
| **Permission requirements** | `admin` or `super_admin` |
| **Error states** | Duplicate name error |
| **Success feedback** | Toast |

---

### 5.5 Brand Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage medicine brands |
| **Admin actions** | Create brand, edit name |
| **Validation** | Name required and unique |
| **Database interaction** | `brands` table |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.6 Manufacturer Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage medicine manufacturers |
| **Admin actions** | Create manufacturer, edit name and contact details |
| **Validation** | Name required |
| **Database interaction** | `manufacturers` table |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.7 Inventory Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Control medicine stock levels with full audit history |
| **Admin actions** | Add stock, reduce stock, correct stock (absolute set), view inventory history per medicine, view low stock alert list |
| **System behaviour** | All inventory changes create a corresponding `inventory_transactions` record with admin ID, type, quantity delta, reason, and timestamp |
| **Validation** | Reason required for all adjustments; quantity must not result in negative stock |
| **Database interaction** | `inventory`, `inventory_transactions` tables |
| **Permission requirements** | `admin` or `super_admin` |
| **Low stock threshold** | Configurable per medicine or globally via `app_configuration` |
| **Error states** | "Adjustment would result in negative stock" |
| **Success feedback** | Toast; inventory history updated |

---

### 5.8 Order Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full operational order management |
| **Admin actions** | View order list, search by order ID/customer, filter by status, view order details, update order status, cancel order |
| **System behaviour** | Status updates must follow the allowed transition matrix; each update creates `order_status_history` record |
| **Validation** | Invalid transitions rejected with reason |
| **Database interaction** | `orders`, `order_items`, `order_status_history`, `customers`, `addresses` tables |
| **Permission requirements** | `admin` or `super_admin` |
| **Loading states** | Table skeleton |
| **Error states** | Invalid transition error inline |
| **Success feedback** | Status badge updated; history record shown |

---

### 5.9 Customer Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | View customer accounts; manage account status |
| **Admin actions** | View customer list, search by name/phone, view customer profile, block customer, unblock customer |
| **System behaviour** | Block sets `is_blocked = true` on customer record; blocked customers cannot authenticate |
| **Validation** | Block reason required |
| **Database interaction** | `customers` table |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.10 Banner Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage home screen promotional banners |
| **Admin actions** | Create banner, upload image, set link target, set sort order, schedule start/end dates, activate, deactivate |
| **System behaviour** | Backend evaluates `is_active`, `start_date`, and `end_date` to determine customer visibility |
| **Validation** | Image required; sort order must be unique |
| **Database interaction** | `banners` table; Supabase Storage for images |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.11 Coupon Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create and manage discount coupons |
| **Admin actions** | Create coupon, edit, activate, deactivate, view usage statistics |
| **System behaviour** | Coupon validation enforced server-side at checkout; usage count tracked in `coupon_usages` |
| **Validation** | Code unique; discount type: `percentage` or `fixed`; if percentage, max discount cap optional; minimum order value optional; start/end date optional; total usage limit optional; per-customer limit optional |
| **Database interaction** | `coupons`, `coupon_usages` tables |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.12 Notification Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create and send in-app notifications to customers |
| **Admin actions** | Create notification (title, body, target: all customers or specific customer), send |
| **System behaviour** | Insert notification record; mark as sent; delivery via Supabase push or in-app polling |
| **Validation** | Title required; body required |
| **Database interaction** | `notifications` table |
| **Permission requirements** | `admin` or `super_admin` |

---

### 5.13 App Configuration

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage platform-wide operational settings |
| **Admin actions** | Edit configuration values |
| **Configurable settings** | Minimum order value, free delivery threshold, delivery charge, COD enabled/disabled, support phone/email/WhatsApp, low stock threshold, OTP expiry, max OTP attempts |
| **System behaviour** | Single-row or key-value configuration table; changes take effect immediately |
| **Validation** | Numeric fields must be non-negative |
| **Database interaction** | `app_configuration` table |
| **Permission requirements** | `super_admin` only |

---

### 5.14 Admin User Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create and manage admin accounts |
| **Admin actions** | Create admin user (name, email, role), deactivate admin, reset password (send reset email) |
| **Validation** | Email unique; role must be `admin` or `super_admin` |
| **Database interaction** | `admin_users` table; Supabase Auth |
| **Permission requirements** | `super_admin` only |

---

### 5.15 Role Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Assign and change roles for admin users |
| **Admin actions** | Change an admin user's role |
| **Validation** | Valid roles only: `admin`, `super_admin` |
| **Database interaction** | `admin_users` table; Supabase Auth custom claims |
| **Permission requirements** | `super_admin` only |

---

### 5.16 Admin Activity Logs

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Provide an immutable audit trail of all admin actions |
| **Admin actions** | View log list with filters (admin user, action type, date range) |
| **System behaviour** | Every mutating admin action records: `admin_user_id`, `action_type`, `entity_type`, `entity_id`, `payload_summary`, `ip_address`, `timestamp` |
| **Validation** | Logs are append-only; no deletes |
| **Database interaction** | `admin_activity_logs` table |
| **Permission requirements** | Admin sees own logs; Super Admin sees all logs |

---

## 6. Order Status System

### 6.1 Official Order Statuses

| Status | Description |
|--------|-------------|
| `pending` | Order placed by customer; awaiting admin confirmation |
| `confirmed` | Admin has confirmed the order |
| `processing` | Order is being prepared |
| `packed` | Order has been packed |
| `shipped` | Order has been handed to courier |
| `out_for_delivery` | Order is on the delivery vehicle |
| `delivered` | Order has been delivered to customer |
| `cancelled` | Order has been cancelled by customer or admin |

### 6.2 Allowed Status Transition Matrix

| From \ To | pending | confirmed | processing | packed | shipped | out_for_delivery | delivered | cancelled |
|-----------|---------|-----------|------------|--------|---------|-----------------|-----------|-----------|
| **pending** | — | ✅ Admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Customer / Admin |
| **confirmed** | ❌ | — | ✅ Admin | ❌ | ❌ | ❌ | ❌ | ✅ Customer / Admin |
| **processing** | ❌ | ❌ | — | ✅ Admin | ❌ | ❌ | ❌ | ✅ Admin only |
| **packed** | ❌ | ❌ | ❌ | — | ✅ Admin | ❌ | ❌ | ✅ Admin only |
| **shipped** | ❌ | ❌ | ❌ | ❌ | — | ✅ Admin | ❌ | ❌ |
| **out_for_delivery** | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅ Admin | ❌ |
| **delivered** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ |
| **cancelled** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

Any transition not marked ✅ must be rejected by the backend with an appropriate error.

### 6.3 Customer Cancellation Rules

- Customer may cancel an order only when status is `pending` or `confirmed`.
- Customer cannot cancel orders in `processing`, `packed`, `shipped`, `out_for_delivery`, `delivered`, or `cancelled` status.
- On successful cancellation: status set to `cancelled`; `order_status_history` record created; inventory restored; coupon usage reversed if applicable.

### 6.4 Admin Cancellation Rules

- Admin may cancel orders in `pending`, `confirmed`, `processing`, or `packed` status.
- Admin cannot cancel orders in `shipped`, `out_for_delivery`, `delivered`, or `cancelled` status.
- Cancellation reason is required from admin.
- On successful cancellation: same inventory restoration and coupon reversal as customer cancellation.

### 6.5 Delivered Order Behaviour

- `delivered` is a terminal status.
- No further status transitions are possible.
- Inventory is not restored.
- COD payment status remains `pending` (physical collection is outside system scope in this version).

---

## 7. Inventory Business Rules

### 7.1 Stock States

| State | Condition | Customer Behaviour |
|-------|-----------|-------------------|
| **Available** | `quantity > low_stock_threshold` | Full purchase capability |
| **Low Stock** | `0 < quantity ≤ low_stock_threshold` | Purchase allowed; optional "Low Stock" badge |
| **Out of Stock** | `quantity = 0` | Add to Cart disabled; product visible but not purchasable |

### 7.2 Quantity Validation

- Customer cannot add more than available stock to cart.
- If a customer's cart quantity exceeds current stock (due to a subsequent inventory change), the cart is flagged at load time with a stock warning.
- Cart update mutation validates stock before accepting new quantity.

### 7.3 Cart Stock Validation

- On every cart load, the backend cross-references each `cart_item` quantity against current `inventory`.
- Items where inventory has dropped below cart quantity are flagged as "quantity reduced to available" and quantity is capped.
- Items that have become inactive or archived are flagged as "no longer available" and must be removed before checkout can proceed.

### 7.4 Checkout Stock Validation

- At checkout initialisation, the backend re-validates all cart items against current inventory.
- At Place Order time (Edge Function), the backend performs a second stock validation before reducing inventory.

### 7.5 Inventory Reduction

- Inventory is reduced atomically as part of the order creation transaction.
- Each reduction creates an `inventory_transactions` record with type `order_deduction`, referencing the order ID.

### 7.6 Inventory Restoration After Cancellation

- On order cancellation, inventory for each order item is restored.
- Each restoration creates an `inventory_transactions` record with type `order_cancellation_reversal`.
- If inventory restoration fails, the order is still cancelled but the failure is logged for manual correction; a system alert is raised.

### 7.7 Preventing Negative Stock

- The inventory update SQL must use a `CHECK` constraint or conditional UPDATE (`WHERE quantity >= delta`) to prevent negative stock.
- If a concurrent checkout would result in negative stock, the later request fails with an "insufficient stock" error.

### 7.8 Manual Admin Inventory Adjustment

- Admins may perform three adjustment types: `add` (increase by amount), `reduce` (decrease by amount), `correct` (set absolute value).
- A reason is required for all adjustments.
- The adjustment is rejected if it would result in `quantity < 0`.
- Each adjustment creates an `inventory_transactions` record with type `admin_adjustment`, `admin_user_id`, and `reason`.

### 7.9 Concurrent Checkout Behaviour

- The Place Order Edge Function uses a database-level row lock (`SELECT ... FOR UPDATE`) on the relevant inventory rows to serialise concurrent checkouts for the same product.
- If two customers attempt to purchase the last unit simultaneously, the first to acquire the lock succeeds; the second receives an "insufficient stock" error.

---

## 8. Pricing Business Rules

### 8.1 Price Fields

| Field | Definition |
|-------|-----------|
| **MRP** | Maximum Retail Price as declared on the medicine; stored on medicine record |
| **Selling Price** | Actual price charged; ≤ MRP; stored on medicine record |
| **Discount %** | Calculated as `((MRP - selling_price) / MRP) × 100`; stored for display only |
| **Coupon Discount** | Applied at checkout; validated server-side; may be fixed or percentage of order subtotal |
| **Delivery Charge** | From `app_configuration`; set to 0 if order subtotal ≥ `free_delivery_threshold` |
| **Minimum Order Value** | From `app_configuration`; order rejected if subtotal < this value |
| **Final Payable Amount** | `subtotal - coupon_discount + delivery_charge`; rounded to 2 decimal places |

### 8.2 Price Calculation Authority

**The client application must never be trusted to calculate the authoritative order total.**

- Client-side calculations are informational and used for display only.
- The backend (Place Order Edge Function) always recalculates all prices from current database values.
- The order record stores the prices at the time of order creation as a snapshot.

### 8.3 Price Rounding

- All monetary values rounded to 2 decimal places using banker's rounding (round half to even).

### 8.4 Price Changes in Cart

- If selling price changes while a product is in a customer's cart, the new price is reflected on next cart load.
- The customer is not notified of the price change automatically; the updated price is simply shown.

### 8.5 Price Changes During Checkout

- If selling price changes between cart load and Place Order, the backend detects the discrepancy and either:
  - Proceeds with the current (lower or equal) price if favourable to the customer.
  - Rejects the order with a "prices have changed, please review your cart" error if the new price is higher.

### 8.6 Historical Order Pricing

- `order_items` stores `unit_price_at_order` (selling price at time of order) and `mrp_at_order` for each item.
- These values are immutable after order creation.

---

## 9. Order Creation Rules

### 9.1 Place Order — Backend Sequence (Atomic Transaction)

The backend (Supabase Edge Function) executes the following steps in a single database transaction:

1. Validate authenticated user session.
2. Validate that the specified address belongs to the authenticated customer.
3. Fetch the customer's active cart with all items.
4. Fetch the latest product information (status, availability) for all cart items.
5. Validate that all products are `is_active = true` and `is_archived = false`.
6. Validate stock: for each item, `inventory.quantity >= cart_item.quantity`.
7. Validate current prices: recalculate subtotal from current selling prices.
8. Validate coupon (if provided): active, not expired, usage limits not exceeded, minimum order value met.
9. Calculate coupon discount.
10. Calculate delivery charge based on subtotal and `free_delivery_threshold`.
11. Calculate final total: `subtotal - coupon_discount + delivery_charge`.
12. Create the `orders` record with all computed fields and `payment_method = 'cod'`.
13. Create `order_items` records with price snapshots for each cart item.
14. Reduce inventory for each item (using row-level lock to handle concurrency).
15. Create `inventory_transactions` records for each deduction.
16. Create initial `order_status_history` record with status `pending`.
17. If coupon used, create `coupon_usages` record and increment coupon `used_count`.
18. Clear the customer's cart (delete all `cart_items` for the cart).
19. Return the created order object.

### 9.2 Transactional Behaviour

- If any step from 3 to 18 fails, the entire transaction is rolled back.
- The customer receives a specific error message based on the failure point.
- No partial state is persisted.

### 9.3 Duplicate Place Order Prevention

- The client disables the Place Order button immediately on first tap and displays a loading indicator.
- An idempotency key (UUID v4) is generated client-side once when the customer first loads the Checkout screen. It persists for the lifetime of that checkout session and is reused on any retry within the same session.
- The key is sent in the `X-Idempotency-Key` HTTP request header on every Place Order request.
- The backend stores the idempotency key alongside the created order. Before creating a new order, the backend checks: does an order exist for this `customer_id` with this `X-Idempotency-Key` created within the last 60 seconds?
- If a matching order is found: return the existing order ID (HTTP 200) without executing any side effects (no new order, no inventory deduction, no cart clear).
- If no matching order is found: proceed with the full order creation sequence.
- The idempotency key is the sole de-duplication mechanism. Cart-content comparison ("cart fingerprint") is not used.

---

## 10. Data Ownership Rules

### 10.1 Customer Data Isolation

- Customer A must never be able to read, modify, or delete Customer B's data.
- Supabase Row Level Security (RLS) policies enforce this at the database level.
- All backend queries include the authenticated customer's user ID in the WHERE clause.

### 10.2 Ownership by Entity

| Entity | Owner | Access Rule |
|--------|-------|-------------|
| Customer profile | Customer | Customer sees/edits own; Admin reads all; Super Admin reads all |
| Addresses | Customer | Customer sees/edits/deletes own; Admin reads in order context only |
| Cart | Customer | Customer sees/edits own; no admin access to cart |
| Orders | Customer | Customer sees/cancels own; Admin sees/updates all |
| Notifications | Customer | Customer sees own + broadcasts; Admin creates; Admin does not read individual read status |
| Inventory | System/Admin | Customers cannot directly access; seen indirectly via availability |
| App configuration | Super Admin | Admins read; Super Admin writes |

### 10.3 Admin Access

- Admins can read all customer profiles and order data for operational purposes.
- Admins cannot read another admin's account credentials or activity.

### 10.4 Super Admin Access

- Super Admin has unrestricted read access to all data.
- Super Admin can manage admin accounts and roles.

---

## 11. Non-Functional Requirements

### 11.1 Security

- All API endpoints require a valid Supabase JWT.
- JWT claims include user role; backend validates role for protected routes.
- Row Level Security (RLS) is enabled on all customer-facing tables.
- Admin actions are validated against role claims, not only RLS.
- Supabase Auth handles credential storage; no passwords stored in application database.
- OTP brute-force protection: max 3 attempts per OTP; cooldown before new OTP can be requested.
- HTTPS enforced for all API and storage requests.

### 11.2 Performance

- Home screen must load within 3 seconds on a 4G connection.
- Medicine listing pagination: ≤ 20 items per page.
- Search results must respond within 1 second after debounce.
- Admin dashboard metrics should be precomputed or cached where possible.

### 11.3 Scalability

- Supabase managed Postgres scales automatically.
- Edge Functions are stateless and horizontally scalable.
- Heavy query results (dashboard metrics) should use database views or materialised views in future.

### 11.4 Maintainability

- All database schema changes use Supabase migrations.
- All business logic in Edge Functions; no business logic in client applications.
- Shared types generated from a single source of truth (TypeScript type definitions or OpenAPI spec).

### 11.5 Accessibility

- Admin panel: WCAG 2.1 AA colour contrast for all text elements.
- Mobile app: accessible labels on all interactive elements.

### 11.6 Reliability

- Supabase SLA covers database and auth; target uptime 99.9%.
- Order creation uses database transactions; partial failures leave no inconsistent state.

### 11.7 Error Handling

- All API errors return structured JSON: `{ error: { code, message, details? } }`.
- Client applications display human-readable error messages; raw backend messages never shown to customers.
- Unhandled errors logged to Supabase logs with request context.

### 11.8 Logging and Auditability

- All admin mutating actions recorded in `admin_activity_logs`.
- Supabase built-in logging captures Edge Function invocations.
- Order status changes stored immutably in `order_status_history`.
- Inventory changes stored immutably in `inventory_transactions`.

### 11.9 Database Integrity

- Foreign key constraints on all relational fields.
- CHECK constraints on `quantity >= 0` for inventory.
- NOT NULL constraints on all required fields.
- Unique constraints on coupon codes, admin emails.

### 11.10 Mobile Network Resilience

- TanStack Query configured with retry (3 attempts) and exponential backoff for network errors.
- Place Order idempotency key prevents duplicate orders on network timeout + retry.
- Cart state is server-side; loss of local state does not affect cart.
- App gracefully handles offline state with a visible banner and disabled mutation triggers.

### 11.11 Slow Network Conditions

- All screens show loading indicators; no blank screens.
- Critical mutations (Place Order) have a 30-second timeout; after timeout the client polls for order status using the idempotency key.
