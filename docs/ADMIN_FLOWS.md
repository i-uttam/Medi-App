# Admin Flows — Online Pharmacy Platform

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-07  

---

## How to Read This Document

Each flow documents:
- **Required Permission** — role required to perform this action
- **Entry Point** — where the flow begins
- **Steps** — numbered, sequential actions
- **Validation** — checks performed
- **Database Effect** — tables and columns affected
- **Audit Log Requirement** — what is recorded in `admin_activity_logs`
- **Success Feedback** — what the admin sees on success
- **Failure Behaviour** — what happens if the action fails

---

## Flow 1: Admin Login

**Required Permission:** `admin` or `super_admin` role.

**Entry Point:** Admin Panel login URL.

**Steps:**
1. Admin navigates to admin panel URL.
2. Login form displayed (email + password).
3. Admin enters credentials and taps "Sign In".
4. System sends credentials to Supabase Auth `signInWithPassword`.
5. Supabase returns JWT on success.
6. System decodes JWT and checks for role claim (`admin` or `super_admin`).
7. If valid role, store admin session and navigate to Dashboard.
8. If no valid role, immediately sign out and display error.

**Validation:**
- Email format valid.
- Password non-empty.
- JWT role claim must be `admin` or `super_admin`.

**Database Effect:** Supabase Auth session created. `admin_users.last_login_at` updated.

**Audit Log Requirement:** `admin_login` action logged with `admin_user_id` and `ip_address`.

**Success Feedback:** Redirect to Dashboard.

**Failure Behaviour:**
- Invalid credentials: "Invalid email or password."
- Account disabled: "Your account has been disabled."
- Insufficient role: "Your account does not have admin access."

---

## Flow 2: Dashboard Review

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Post-login redirect; or clicking "Dashboard" in the navigation.

**Steps:**
1. Dashboard mounts.
2. System sends parallel aggregated queries:
   - Orders placed today (count).
   - Pending orders (count).
   - Total active customers (count).
   - Low stock medicines (count).
   - Revenue today (sum of `total_amount` for `delivered` orders today).
3. Each metric card renders independently as its data resolves.
4. Admin reviews metrics.
5. Admin can click quick-link on a card (e.g., "View Pending Orders") to navigate to the relevant module.

**Validation:** N/A.

**Database Effect:** Read-only aggregations.

**Audit Log Requirement:** None (read-only).

**Success Feedback:** All metric cards populated with real data.

**Failure Behaviour:** Per-card error indicator with "Retry" button. Other cards unaffected.

---

## Flow 3: Create Medicine

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Medicine Management → "New Medicine" button.

**Steps:**
1. Admin taps "New Medicine".
2. New Medicine form displayed.
3. Admin fills: name, generic name (optional), category (select), brand (select), manufacturer (select), MRP, selling price, description, composition (optional), initial stock quantity, images (upload).
4. Admin uploads at least one medicine image.
5. Admin taps "Save".
6. System validates all required fields.
7. System uploads images to Supabase Storage; receives public URLs.
8. System inserts `medicines` row with `is_active = false`, `is_archived = false`.
9. System inserts `inventory` row with provided initial quantity (default 0 if not specified).
10. Audit log entry created.
11. Navigate to medicine detail/edit page.

**Validation:**
- Name: required, max 200 characters, unique.
- MRP: required, > 0.
- Selling price: required, > 0, ≤ MRP.
- Category: required, must reference an existing active category.
- Brand: required, must reference an existing brand.
- At least one image: required.
- Initial stock: optional, ≥ 0.

**Database Effect:** INSERT into `medicines`; INSERT into `inventory`.

**Audit Log Requirement:** `medicine_created` with `entity_id = new medicine ID` and summary of key fields.

**Success Feedback:** Toast: "Medicine created successfully." Navigate to medicine edit page.

**Failure Behaviour:**
- Validation error: per-field error messages; form not submitted.
- Image upload failure: toast: "Image upload failed." Images not stored; medicine not created.
- Database error: toast: "Failed to save medicine. Please try again." Uploaded images cleaned up.

---

## Flow 4: Edit Medicine

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Medicine list → tapping a medicine → Edit mode.

**Steps:**
1. Admin navigates to medicine edit page.
2. Form pre-filled with current medicine data.
3. Admin modifies desired fields.
4. If changing images: upload new images; optionally remove existing images.
5. Admin taps "Save Changes".
6. System validates all fields.
7. System updates `medicines` row.
8. If new images uploaded, update image URLs; if images removed, delete from Supabase Storage.
9. Audit log entry created.

**Validation:** Same as Create Medicine.

**Database Effect:** UPDATE `medicines` row.

**Audit Log Requirement:** `medicine_updated` with changed fields summary.

**Success Feedback:** Toast: "Medicine updated successfully."

**Failure Behaviour:** Validation errors per-field; save failure toast.

---

## Flow 5: Deactivate Medicine

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Medicine detail or medicine list — toggle or "Deactivate" button.

**Steps:**
1. Admin taps "Deactivate".
2. Confirmation dialog: "Deactivating this medicine will hide it from customers. Continue?"
3. Admin confirms.
4. System PATCH: `medicines.is_active = false`.
5. Medicine immediately hidden from all customer-facing views.
6. Audit log entry created.

**Validation:** Medicine must currently be active.

**Database Effect:** UPDATE `medicines.is_active = false`.

**Audit Log Requirement:** `medicine_deactivated` with medicine ID.

**Success Feedback:** Toast: "Medicine deactivated." Status badge updated to "Inactive".

**Failure Behaviour:** Toast: "Failed to deactivate medicine." Status unchanged.

---

## Flow 6: Archive Medicine

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Medicine detail — "Archive" button (only shown for inactive medicines).

**Steps:**
1. Admin taps "Archive".
2. Warning dialog: "Archived medicines cannot be reactivated and will be permanently removed from the catalogue. Are you sure?"
3. Admin confirms.
4. System PATCH: `medicines.is_archived = true`, `medicines.is_active = false`.
5. Medicine permanently removed from customer catalogue.
6. Existing orders containing this medicine are unaffected.
7. Audit log entry created.

**Validation:** Medicine must be inactive (`is_active = false`) before archiving.

**Database Effect:** UPDATE `medicines.is_archived = true, is_active = false`.

**Audit Log Requirement:** `medicine_archived` with medicine ID.

**Success Feedback:** Toast: "Medicine archived." Medicine removed from active list.

**Failure Behaviour:** Toast: "Failed to archive medicine."

---

## Flow 7: Create Category

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Category Management → "New Category".

**Steps:**
1. Admin taps "New Category".
2. Form displayed: name, image (optional), sort order, parent category (optional for sub-categories).
3. Admin fills fields and taps "Save".
4. System validates name uniqueness.
5. Uploads image if provided.
6. Inserts `categories` row with `is_active = true` by default.
7. Audit log entry created.

**Validation:**
- Name: required, unique across all categories.
- Sort order: numeric, ≥ 0.

**Database Effect:** INSERT into `categories`.

**Audit Log Requirement:** `category_created`.

**Success Feedback:** Toast: "Category created." Category appears in list.

**Failure Behaviour:** Duplicate name: "A category with this name already exists." Other: save failure toast.

---

## Flow 8: Edit Category

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Category list → edit icon.

**Steps:**
1. Category edit form pre-filled.
2. Admin modifies name, image, or sort order.
3. Admin taps "Save".
4. System validates uniqueness of new name (excluding own row).
5. UPDATE `categories` row.
6. Audit log entry.

**Validation:** Name unique (excluding self).

**Database Effect:** UPDATE `categories`.

**Audit Log Requirement:** `category_updated`.

**Success Feedback:** Toast: "Category updated."

---

## Flow 9: Create Brand

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Brand Management → "New Brand".

**Steps:**
1. Admin enters brand name.
2. Taps "Save".
3. System validates name uniqueness.
4. Inserts `brands` row.
5. Audit log entry.

**Validation:** Name required, unique.

**Database Effect:** INSERT into `brands`.

**Audit Log Requirement:** `brand_created`.

**Success Feedback:** Toast: "Brand created."

---

## Flow 10: Create Manufacturer

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Manufacturer Management → "New Manufacturer".

**Steps:**
1. Admin enters manufacturer name, address (optional), contact details (optional).
2. Taps "Save".
3. System validates name required.
4. Inserts `manufacturers` row.
5. Audit log entry.

**Validation:** Name required.

**Database Effect:** INSERT into `manufacturers`.

**Audit Log Requirement:** `manufacturer_created`.

**Success Feedback:** Toast: "Manufacturer created."

---

## Flow 11: Add Inventory

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Inventory Management → select medicine → "Add Stock".

**Steps:**
1. Admin opens the inventory adjustment panel for a specific medicine.
2. Selects adjustment type: "Add".
3. Enters quantity to add.
4. Enters reason (required; e.g., "Stock received from supplier").
5. Taps "Save Adjustment".
6. Backend: UPDATE `inventory.quantity = quantity + delta` WHERE medicine_id = X.
7. INSERT `inventory_transactions` record: type = `admin_adjustment_add`, delta, reason, admin_user_id, timestamp.
8. Audit log entry.

**Validation:**
- Quantity: required, > 0, integer.
- Reason: required, non-empty.

**Database Effect:** UPDATE `inventory`; INSERT `inventory_transactions`.

**Audit Log Requirement:** `inventory_adjusted` with medicine ID, type, delta, reason.

**Success Feedback:** Toast: "Stock added. New total: X units." Inventory history updated.

**Failure Behaviour:** Toast: "Failed to update inventory. Please try again."

---

## Flow 12: Reduce Inventory

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Inventory Management → select medicine → "Reduce Stock".

**Steps:**
1. Admin selects adjustment type: "Reduce".
2. Enters quantity to reduce.
3. Enters reason (required; e.g., "Damaged stock disposal").
4. Taps "Save Adjustment".
5. Backend validates: `current_quantity - delta >= 0`. If not: reject.
6. Backend: UPDATE `inventory.quantity = quantity - delta`.
7. INSERT `inventory_transactions` record: type = `admin_adjustment_reduce`.
8. Audit log entry.

**Validation:**
- Quantity > 0.
- Reason required.
- Result must not be negative.

**Database Effect:** UPDATE `inventory`; INSERT `inventory_transactions`.

**Audit Log Requirement:** `inventory_adjusted` with medicine ID, type = reduce, delta, reason.

**Success Feedback:** Toast: "Stock reduced. New total: X units."

**Failure Behaviour:** If would go negative: "This adjustment would result in negative stock. Current stock: X units." Form remains open.

---

## Flow 13: Correct Inventory (Absolute Set)

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Inventory Management → select medicine → "Correct Stock".

**Steps:**
1. Admin selects adjustment type: "Correct".
2. Enters the correct absolute stock value.
3. Enters reason (required; e.g., "Physical stock count reconciliation").
4. Taps "Save Adjustment".
5. Backend: calculates delta = new_value - current_quantity.
6. Backend: UPDATE `inventory.quantity = new_value`.
7. INSERT `inventory_transactions` record: type = `admin_adjustment_correct`, old_quantity, new_quantity, delta, reason.
8. Audit log entry.

**Validation:**
- New value ≥ 0, integer.
- Reason required.

**Database Effect:** UPDATE `inventory`; INSERT `inventory_transactions`.

**Audit Log Requirement:** `inventory_adjusted` with old and new quantities.

**Success Feedback:** Toast: "Stock corrected. New total: X units."

---

## Flow 14: Review Inventory History

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Inventory Management → select medicine → "View History" tab.

**Steps:**
1. Admin opens inventory history for a medicine.
2. List of `inventory_transactions` displayed, sorted by `created_at` DESC.
3. Each row: date, type, delta, resulting quantity, reason, admin user name.
4. Pagination applied (20 rows per page).

**Validation:** N/A (read-only).

**Database Effect:** Read-only SELECT from `inventory_transactions`.

**Audit Log Requirement:** None (read-only).

**Success Feedback:** History table populated.

**Failure Behaviour:** Error state with retry.

---

## Flow 15: Review Low Stock

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Dashboard low stock card → "View Low Stock"; or Inventory Management → "Low Stock" filter.

**Steps:**
1. Admin accesses low stock view.
2. System queries medicines where `inventory.quantity <= low_stock_threshold`.
3. Table displays: medicine name, current quantity, threshold, category.
4. Admin can tap a medicine row to navigate to its inventory adjustment.

**Validation:** N/A.

**Database Effect:** Read-only.

**Audit Log Requirement:** None.

**Success Feedback:** Low stock list displayed.

---

## Flow 16: View New Orders

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Management module.

**Steps:**
1. Admin navigates to Order Management.
2. Default view: all orders, sorted by `created_at` DESC.
3. Admin applies "Pending" status filter to see new unconfirmed orders.
4. Order list shows: order ID, customer name, total, date, status badge.
5. Pagination: 20 orders per page.

**Validation:** N/A (read-only).

**Database Effect:** Read-only SELECT from `orders` with JOIN on `customers`.

**Audit Log Requirement:** None.

**Success Feedback:** Filtered pending orders list.

---

## Flow 17: Search Order

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Management — search bar.

**Steps:**
1. Admin enters search term (order ID or customer name/phone).
2. System debounces 300ms; sends search query.
3. Results displayed in order list.

**Validation:** Minimum 3 characters.

**Database Effect:** Read-only search query.

**Audit Log Requirement:** None.

---

## Flow 18: Filter Orders

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Management — filter controls.

**Steps:**
1. Admin selects one or more filters: status, date range.
2. Order list reloads with filters applied (page reset to 1).
3. Active filters shown as visual indicators.

---

## Flow 19: Open Order Details

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order list → tap order row.

**Steps:**
1. Navigate to Order Detail page.
2. Load: order header (ID, customer, date, total), delivery address, order items with price snapshots, current status, order status history timeline, available status actions.

**Validation:** N/A.

**Database Effect:** Read-only.

**Audit Log Requirement:** None.

---

## Flow 20: Confirm Order

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail page — "Confirm Order" button (shown when status is `pending`).

**Steps:**
1. Admin taps "Confirm Order".
2. Confirmation dialog.
3. Admin confirms.
4. Backend validates transition: `pending` → `confirmed`.
5. UPDATE `orders.status = 'confirmed'`.
6. INSERT `order_status_history` record.
7. Audit log entry.

**Validation:** Current status must be `pending`.

**Database Effect:** UPDATE `orders`; INSERT `order_status_history`.

**Audit Log Requirement:** `order_status_updated` with from_status = pending, to_status = confirmed.

**Success Feedback:** Order status badge updated to "Confirmed". Toast: "Order confirmed."

**Failure Behaviour:** If transition invalid: "Cannot confirm this order." Status unchanged.

---

## Flow 21: Process Order

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Mark as Processing" (shown when status is `confirmed`).

**Steps:** Same pattern as Flow 20. Transition: `confirmed` → `processing`.

**Audit Log Requirement:** `order_status_updated` from_status = confirmed, to_status = processing.

---

## Flow 22: Pack Order

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Mark as Packed" (shown when status is `processing`).

**Steps:** Same pattern. Transition: `processing` → `packed`.

---

## Flow 23: Ship Order

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Mark as Shipped" (shown when status is `packed`).

**Steps:** Same pattern. Transition: `packed` → `shipped`.

---

## Flow 24: Mark Out for Delivery

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Out for Delivery" (shown when status is `shipped`).

**Steps:** Same pattern. Transition: `shipped` → `out_for_delivery`.

---

## Flow 25: Mark Delivered

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Mark as Delivered" (shown when status is `out_for_delivery`).

**Steps:**
1. Admin taps "Mark as Delivered".
2. Confirmation dialog.
3. Admin confirms.
4. UPDATE `orders.status = 'delivered'`.
5. INSERT `order_status_history`.
6. Audit log entry.

**Database Effect:** UPDATE `orders`; INSERT `order_status_history`.

**Audit Log Requirement:** `order_status_updated` to delivered.

**Success Feedback:** Order status = "Delivered". This is a terminal state; no further status actions available.

---

## Flow 26: Cancel Order (Admin)

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Order Detail — "Cancel Order" button (shown when status is `pending`, `confirmed`, `processing`, or `packed`).

**Steps:**
1. Admin taps "Cancel Order".
2. Dialog: admin must enter cancellation reason (text input, required).
3. Admin enters reason and confirms.
4. Backend validates transition is valid.
5. UPDATE `orders.status = 'cancelled'`.
6. INSERT `order_status_history` with reason.
7. Restore inventory for each order item:
   - UPDATE `inventory.quantity += order_item.quantity` for each item.
   - INSERT `inventory_transactions` for each item (type = `order_cancellation_reversal`).
8. If coupon was applied, UPDATE `coupon_usages`; decrement `coupons.used_count`.
9. Audit log entry.

**Validation:**
- Cancellation reason: required, non-empty.
- Current status must be `pending`, `confirmed`, `processing`, or `packed`.

**Database Effect:** UPDATE `orders`; INSERT `order_status_history`; UPDATE `inventory`; INSERT `inventory_transactions`; UPDATE `coupons.used_count` if applicable.

**Audit Log Requirement:** `order_cancelled` with reason, cancelled_by = admin_user_id.

**Success Feedback:** Toast: "Order cancelled." Status updated to "Cancelled". Inventory restored.

**Failure Behaviour:**
- Invalid status: "This order cannot be cancelled at its current status."
- Inventory restoration failure: Order is still cancelled; failure logged; alert raised for manual correction.

---

## Flow 27: View Customer

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Customer Management → tap customer row.

**Steps:**
1. Admin searches or browses customer list.
2. Taps a customer to open their profile view.
3. Customer detail shows: name, phone, email, registration date, order count, total spend, account status (active/blocked).
4. Order list section shows the customer's recent orders.

**Validation:** N/A (read-only).

**Database Effect:** Read-only SELECT from `customers`, `orders`.

**Audit Log Requirement:** None (read-only).

---

## Flow 28: Block Customer

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Customer detail page — "Block Customer" button.

**Steps:**
1. Admin taps "Block Customer".
2. Dialog: admin must enter block reason (required).
3. Admin enters reason and confirms.
4. Backend PATCH: `customers.is_blocked = true`, `customers.block_reason = reason`.
5. Backend revokes customer's active sessions via Supabase Auth.
6. Audit log entry.

**Validation:** Block reason required.

**Database Effect:** UPDATE `customers.is_blocked = true`.

**Audit Log Requirement:** `customer_blocked` with customer ID and reason.

**Success Feedback:** Toast: "Customer blocked." Status badge updated to "Blocked". Block button replaced with "Unblock".

**Failure Behaviour:** Toast: "Failed to block customer."

---

## Flow 29: Unblock Customer

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Customer detail page — "Unblock Customer" button.

**Steps:**
1. Admin taps "Unblock Customer".
2. Confirmation dialog (no reason required).
3. Admin confirms.
4. Backend PATCH: `customers.is_blocked = false`, clear `block_reason`.
5. Audit log entry.

**Validation:** Customer must currently be blocked.

**Database Effect:** UPDATE `customers.is_blocked = false`.

**Audit Log Requirement:** `customer_unblocked` with customer ID.

**Success Feedback:** Toast: "Customer unblocked." Status updated to "Active".

---

## Flow 30: Create Banner

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Banner Management → "New Banner".

**Steps:**
1. Admin fills: image (required), link target (optional), sort order (required, unique).
2. Optionally sets: start date, end date.
3. Taps "Save".
4. Image uploaded to Supabase Storage.
5. INSERT `banners` row with `is_active = false` by default.
6. Audit log entry.

**Validation:**
- Image required.
- Sort order unique across banners.

**Database Effect:** INSERT `banners`; Supabase Storage image upload.

**Audit Log Requirement:** `banner_created`.

**Success Feedback:** Toast: "Banner created." Admin must manually activate it.

---

## Flow 31: Schedule Banner

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Banner edit form.

**Steps:**
1. Admin opens an existing banner.
2. Sets `start_date` and/or `end_date`.
3. Sets `is_active = true`.
4. Saves banner.
5. Backend evaluates: banner shown to customers when `is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now())`.

**Note:** No cron job needed; visibility is evaluated at query time.

**Database Effect:** UPDATE `banners`.

**Audit Log Requirement:** `banner_updated` with schedule dates.

---

## Flow 32: Create Coupon

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Coupon Management → "New Coupon".

**Steps:**
1. Admin fills: code (unique), description, discount type (`percentage` or `fixed`), discount value, minimum order value (optional), usage limit (optional), per-customer limit (optional), start date (optional), end date (optional).
2. Taps "Save".
3. Validates code uniqueness.
4. INSERT `coupons` row with `is_active = false`.
5. Audit log entry.

**Validation:**
- Code: required, unique, uppercase alphanumeric.
- Discount type: `percentage` or `fixed`.
- If percentage: value 1–100.
- If fixed: value > 0.
- Minimum order value ≥ 0.
- Usage limit ≥ 1 if set.

**Database Effect:** INSERT `coupons`.

**Audit Log Requirement:** `coupon_created`.

**Success Feedback:** Toast: "Coupon created." Must be activated to be usable.

---

## Flow 33: Deactivate Coupon

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Coupon list or detail — "Deactivate" toggle.

**Steps:**
1. Admin taps "Deactivate".
2. PATCH `coupons.is_active = false`.
3. Coupon immediately invalid for new applications.
4. Existing orders that used the coupon are unaffected.
5. Audit log entry.

**Database Effect:** UPDATE `coupons.is_active = false`.

**Audit Log Requirement:** `coupon_deactivated`.

**Success Feedback:** Toast: "Coupon deactivated."

---

## Flow 34: Send Notification

**Required Permission:** `admin` or `super_admin`.

**Entry Point:** Notification Management → "New Notification".

**Steps:**
1. Admin fills: title (required), body (required), target: "All Customers" or specific customer (search by name/phone).
2. Taps "Send".
3. Validates title and body non-empty.
4. If target = "All Customers": INSERT `notifications` row with `target_type = 'broadcast'`.
5. If target = specific customer: INSERT `notifications` row with `target_type = 'individual'`, `customer_id = X`.
6. Trigger push notification dispatch via Edge Function.
7. Set `sent_at` timestamp.
8. Audit log entry.

**Validation:** Title and body required.

**Database Effect:** INSERT `notifications`; update `sent_at`.

**Audit Log Requirement:** `notification_sent` with target type and customer ID (if individual).

**Success Feedback:** Toast: "Notification sent."

**Failure Behaviour:** If push dispatch fails but DB record was created: toast: "Notification saved, but push delivery failed." In-app notification is still delivered on next app load.

---

## Flow 35: Update Application Settings

**Required Permission:** `super_admin` only.

**Entry Point:** App Configuration section.

**Steps:**
1. Super Admin navigates to App Configuration.
2. Current settings loaded from `app_configuration` table.
3. Super Admin edits: minimum order value, free delivery threshold, delivery charge, COD enabled/disabled, support phone, support email, support WhatsApp, low stock threshold.
4. Taps "Save Settings".
5. All numeric fields validated as non-negative.
6. PATCH `app_configuration` row.
7. Changes take effect immediately on next request (no cache in v1).
8. Audit log entry.

**Validation:** All numeric fields ≥ 0. Support phone valid format.

**Database Effect:** UPDATE `app_configuration`.

**Audit Log Requirement:** `app_configuration_updated` with changed fields.

**Success Feedback:** Toast: "Settings updated."

**Failure Behaviour:** Validation errors per-field; save failure toast.

---

## Flow 36: Create Admin User

**Required Permission:** `super_admin` only.

**Entry Point:** Admin User Management → "New Admin User".

**Steps:**
1. Super Admin fills: name, email, role (`admin` or `super_admin`).
2. Taps "Create".
3. System validates email uniqueness across admin users.
4. Creates Supabase Auth user with provided email; sends password reset/setup email.
5. Sets custom role claim in Supabase Auth JWT.
6. Inserts `admin_users` row.
7. Audit log entry.

**Validation:**
- Email required, unique, valid format.
- Role must be `admin` or `super_admin`.
- Name required.

**Database Effect:** INSERT `admin_users`; Supabase Auth user created.

**Audit Log Requirement:** `admin_user_created` with new user ID and role.

**Success Feedback:** Toast: "Admin user created. A setup email has been sent to [email]."

**Failure Behaviour:** Duplicate email: "An admin with this email already exists." Other: save failure toast; Supabase Auth user creation rolled back if possible.

---

## Flow 37: Assign Role

**Required Permission:** `super_admin` only.

**Entry Point:** Admin User detail → "Change Role" action.

**Steps:**
1. Super Admin selects new role from dropdown.
2. Confirmation dialog: "Change [Admin Name]'s role from [current] to [new]?"
3. Super Admin confirms.
4. PATCH `admin_users.role = new_role`.
5. Update Supabase Auth custom role claim for the user.
6. Affected admin's next request will use updated JWT claims.
7. Audit log entry.

**Validation:** New role must be `admin` or `super_admin`. Cannot change own role.

**Database Effect:** UPDATE `admin_users.role`; Supabase Auth claim updated.

**Audit Log Requirement:** `admin_role_changed` with admin_user_id, old_role, new_role.

**Success Feedback:** Toast: "Role updated."

**Failure Behaviour:** Toast: "Failed to update role."

---

## Flow 38: Review Admin Activity Logs

**Required Permission:** `admin` (own logs only); `super_admin` (all logs).

**Entry Point:** Admin Activity Logs section.

**Steps:**
1. Admin navigates to Activity Logs.
2. Log list loaded; sorted by `timestamp` DESC; paginated.
3. Each row: timestamp, admin user name, action type, entity type, entity ID, payload summary, IP address.
4. Admin can filter by: admin user (Super Admin only), action type, date range.
5. Admin can expand a row to see full payload summary.

**Validation:** N/A (read-only).

**Database Effect:** Read-only SELECT from `admin_activity_logs`.

**Audit Log Requirement:** None (logs are the audit trail itself; reading logs is not logged).

**Success Feedback:** Log table populated.

**Failure Behaviour:** Error state with retry.
