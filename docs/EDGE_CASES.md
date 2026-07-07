# Edge Case Matrix — Online Pharmacy Platform

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-07  

---

## How to Read This Document

Each edge case documents:
- **Scenario** — what condition has occurred
- **Risk** — potential negative outcome if not handled
- **Expected System Behaviour** — what the backend/system must do
- **User-Facing Behaviour** — what the customer or admin sees
- **Backend Behaviour** — server-side handling details
- **Recovery Strategy** — how the system or user recovers
- **Logging Requirement** — what must be logged

---

## Authentication & Session Edge Cases

---

### EC-AUTH-01: User Loses Internet During Login (OTP Request)

**Scenario:** Customer taps "Send OTP" but the network drops before the request completes.

**Risk:** Request appears to hang; customer attempts multiple retries; OTP may or may not have been sent.

**Expected System Behaviour:** TanStack Query or Supabase Auth client times out the request after a reasonable period.

**User-Facing Behaviour:** "Send OTP" button re-enabled after timeout. Error message: "No internet connection. Please check your network and try again." Countdown timer not started (OTP may not have been sent).

**Backend Behaviour:** If the request never reached Supabase Auth, no OTP is sent. If it reached Supabase Auth but the response was lost, the OTP was sent; the customer can request again after the rate limit window.

**Recovery Strategy:** Customer re-establishes network connection and taps "Send OTP" again. Supabase Auth rate limiting prevents OTP spam.

**Logging Requirement:** Client-side timeout logged to app error tracker with network status at time of failure.

---

### EC-AUTH-02: OTP Expires

**Scenario:** Customer waits longer than 5 minutes before entering the OTP.

**Risk:** Customer submits expired OTP; verification fails; customer is confused.

**Expected System Behaviour:** Supabase Auth rejects the OTP with an expiry error.

**User-Facing Behaviour:** Error message: "OTP has expired. Please request a new one." OTP input cleared. "Request New OTP" button shown.

**Backend Behaviour:** Supabase Auth returns expiry error code; client maps this to a human-readable message.

**Recovery Strategy:** Customer taps "Request New OTP"; flow restarts at OTP request step.

**Logging Requirement:** No special logging required; standard auth failure log sufficient.

---

### EC-AUTH-03: OTP Is Incorrect

**Scenario:** Customer enters an incorrect OTP.

**Risk:** Multiple incorrect attempts could indicate credential stuffing; customer becomes locked out.

**Expected System Behaviour:** Supabase Auth rejects the OTP. After 3 incorrect attempts, Supabase Auth's built-in lockout triggers.

**User-Facing Behaviour:**
- Attempt 1–2: "Incorrect OTP. [X] attempts remaining."
- Attempt 3: "Too many failed attempts. Please request a new OTP." Input disabled.

**Backend Behaviour:** Supabase Auth tracks attempt count. After threshold, OTP is invalidated.

**Recovery Strategy:** Customer must request a new OTP. Wait period may apply before a new OTP can be requested.

**Logging Requirement:** Failed OTP attempts logged by Supabase Auth. Repeated failures from same number flagged.

---

### EC-AUTH-04: User Account Is Blocked

**Scenario:** Admin has blocked the customer's account. Customer attempts to log in.

**Risk:** Blocked customer accesses the app.

**Expected System Behaviour:** After OTP verification, backend checks `customers.is_blocked`. If true, reject with 403.

**User-Facing Behaviour:** Error message: "Your account has been suspended. Please contact support." No navigation beyond login.

**Backend Behaviour:** OTP verification succeeds (Supabase Auth level), but application-level middleware rejects the session based on `is_blocked` check. Session token is invalidated immediately.

**Recovery Strategy:** Customer contacts support. Admin unblocks the account via the admin panel.

**Logging Requirement:** Blocked account access attempt logged with customer ID, timestamp, and IP address.

---

### EC-AUTH-05: Session Expires While App Is In Use

**Scenario:** Customer's Supabase Auth session token expires while the app is open (e.g., very long session).

**Risk:** Customer continues to make requests; receives 401; may lose in-progress cart state.

**Expected System Behaviour:** Supabase Auth SDK automatically refreshes the token if within the refresh window. If token cannot be refreshed (refresh token also expired), the next API call returns 401.

**User-Facing Behaviour:** On 401 response from any API call, display: "Your session has expired. Please log in again." Clear local session; navigate to Login screen. Cart is persisted server-side and will be available after re-login.

**Backend Behaviour:** All endpoints validate JWT. 401 returned for invalid/expired JWT. Cart row is preserved in the database; linked to customer ID, not session.

**Recovery Strategy:** Customer logs in again; cart is restored because it is stored server-side.

**Logging Requirement:** Session expiry events logged at warning level.

---

## Home & Catalogue Edge Cases

---

### EC-HOME-01: Home API Fails

**Scenario:** One or all of the Home screen API calls (banners, categories, featured medicines) fail due to a server error.

**Risk:** Customer sees a broken home screen; may abandon the app.

**Expected System Behaviour:** Each section's query is independent. Failure of one section does not block others.

**User-Facing Behaviour:** Failed sections display a per-section error state with a "Retry" button. Successfully loaded sections are fully rendered and functional.

**Backend Behaviour:** Backend errors are structured and returned with HTTP 5xx codes.

**Recovery Strategy:** Customer taps "Retry" on the failed section. TanStack Query also retries automatically up to 3 times with exponential backoff before showing the error state.

**Logging Requirement:** All 5xx errors logged server-side with request context.

---

### EC-CAT-01: Product Is Deleted While Visible

**Scenario:** A medicine is archived by an admin while a customer is viewing it in the listing or detail screen.

**Risk:** Customer attempts to add an archived medicine to cart.

**Expected System Behaviour:** The listing will continue to show the medicine until the next refresh (stale query). On cart add attempt, backend validates product status and rejects if inactive or archived.

**User-Facing Behaviour:** On cart add attempt: "This product is no longer available." On next screen refresh or navigation: product disappears from listing.

**Backend Behaviour:** Cart add endpoint validates `is_active = true AND is_archived = false`. Returns 422 if not.

**Recovery Strategy:** Customer browses to find an alternative product.

**Logging Requirement:** Standard API validation log.

---

## Cart Edge Cases

---

### EC-CART-01: Product Becomes Inactive While in Cart

**Scenario:** Admin deactivates a medicine that a customer has in their active cart.

**Risk:** Customer proceeds to checkout with an unavailable product.

**Expected System Behaviour:** On next cart load, backend detects that the medicine's `is_active = false`. Cart item is flagged as "No longer available."

**User-Facing Behaviour:** Cart item shown with a warning banner: "This product is no longer available and must be removed before checkout." "Proceed to Checkout" button is disabled until the item is removed.

**Backend Behaviour:** Cart load endpoint joins `cart_items` with `medicines` and checks `is_active`. Flagged items returned with an `availability_status = 'inactive'` field.

**Recovery Strategy:** Customer removes the flagged item and proceeds to checkout with remaining items.

**Logging Requirement:** No special logging; standard cart load response.

---

### EC-CART-02: Product Becomes Out of Stock While in Cart

**Scenario:** Another customer's order or an admin inventory reduction causes a cart item to become out of stock.

**Risk:** Customer attempts checkout with zero-stock item.

**Expected System Behaviour:** On cart load, backend checks `inventory.quantity`. If `quantity = 0`, item flagged as "Out of stock."

**User-Facing Behaviour:** Cart item shown with "Out of stock" warning. Checkout blocked until item is removed.

**Backend Behaviour:** Cart load checks inventory. Place Order Edge Function also validates stock — provides a second safety net.

**Recovery Strategy:** Customer removes out-of-stock items; proceeds with remaining items.

**Logging Requirement:** No special logging.

---

### EC-CART-03: Stock Becomes Lower Than Cart Quantity

**Scenario:** Cart has 5 units of a medicine, but available stock drops to 2 (due to another order or admin adjustment).

**Risk:** Customer places an order for 5 units when only 2 are available.

**Expected System Behaviour:** On cart load, backend detects discrepancy. Cart item quantity is capped to available stock (2). Item flagged with a warning.

**User-Facing Behaviour:** Warning banner: "Only 2 units available. Your quantity has been updated." Cart quantity updated to 2 in the UI.

**Backend Behaviour:** Cart load endpoint compares `cart_items.quantity` with `inventory.quantity`. If cart quantity > available, update `cart_items.quantity = min(cart_quantity, available_stock)` and return the adjusted value with a flag.

**Recovery Strategy:** Customer reviews updated quantity and proceeds.

**Logging Requirement:** Quantity adjustment logged at info level.

---

### EC-CART-04: Product Price Changes While in Cart

**Scenario:** Admin updates the selling price of a medicine that a customer has in their cart.

**Risk:** Customer is surprised by a different price at checkout.

**Expected System Behaviour:** On cart load, backend returns current selling price from `medicines` table, not a cached price.

**User-Facing Behaviour:** Updated price shown for the item on cart load. No explicit notification of the change. Customer sees the current price.

**Backend Behaviour:** Cart load always fetches fresh prices. `cart_items` table does not store price; price comes from `medicines.selling_price` on each load.

**Recovery Strategy:** No recovery needed; customer simply sees updated price.

**Logging Requirement:** No special logging.

---

### EC-CART-05: Product Price Changes During Checkout

**Scenario:** Price changes between the moment the customer loads the Checkout screen and when they tap "Place Order."

**Risk:** Customer expects one price but backend calculates a different total.

**Expected System Behaviour:** The Place Order Edge Function recalculates all prices from the current `medicines.selling_price`. If the new calculated total differs from the client's expected total:
- If price decreased: proceed silently with the lower price.
- If price increased: reject the order.

**User-Facing Behaviour:** On price-increased rejection: "Prices have changed since you opened checkout. Please review your cart." Customer returned to Checkout/Cart with updated prices.

**Backend Behaviour:** Backend is the authoritative source of price. Client-provided totals are never trusted.

**Recovery Strategy:** Customer reviews updated prices and re-confirms the order.

**Logging Requirement:** Price discrepancy logged at info level with old and new values.

---

## Coupon Edge Cases

---

### EC-COUP-01: Coupon Expires While in Cart

**Scenario:** Customer has applied a coupon during checkout, but the coupon's `end_date` passes before they tap Place Order.

**Risk:** Discount applied to an expired coupon.

**Expected System Behaviour:** Place Order Edge Function validates coupon at order creation time. If expired, coupon is rejected.

**User-Facing Behaviour:** Place Order fails. Error: "The applied coupon has expired. Please remove it and try again." Coupon removed from checkout UI; total recalculated.

**Backend Behaviour:** Coupon validation in the Edge Function checks `end_date >= now()`.

**Recovery Strategy:** Customer removes expired coupon and places order without discount; or uses a different coupon.

**Logging Requirement:** Standard validation failure log.

---

### EC-COUP-02: Coupon Usage Limit Is Reached

**Scenario:** Another customer uses the last available use of a coupon while the current customer is at checkout.

**Risk:** Customer applies a coupon that is now exhausted.

**Expected System Behaviour:** Place Order Edge Function checks `coupons.used_count < usage_limit` at the time of order creation. If the limit is now reached, coupon is rejected.

**User-Facing Behaviour:** Error: "This coupon has reached its usage limit." Coupon removed from UI.

**Backend Behaviour:** Coupon usage count checked and incremented atomically within the order creation transaction.

**Recovery Strategy:** Customer proceeds without the coupon.

**Logging Requirement:** Coupon limit-reached event logged.

---

### EC-COUP-03: Coupon Becomes Inactive

**Scenario:** Admin deactivates a coupon while a customer has it applied at checkout.

**Risk:** Inactive coupon processed.

**Expected System Behaviour:** Place Order validates `coupons.is_active = true`. If false, order is rejected.

**User-Facing Behaviour:** Error: "The applied coupon is no longer valid. Please remove it." Checkout state updated.

**Backend Behaviour:** Validation in Edge Function covers all invalidation conditions.

**Recovery Strategy:** Customer removes invalid coupon and places order without it.

**Logging Requirement:** Standard validation failure log.

---

## Address Edge Cases

---

### EC-ADDR-01: Default Address Is Deleted

**Scenario:** Customer deletes their default address.

**Risk:** Checkout has no pre-selected address; customer confused.

**Expected System Behaviour:** On delete of default address, backend assigns the next available address (by creation date or sort order) as the new default. If no other addresses exist, no default is set.

**User-Facing Behaviour:** If another address exists: that address becomes default; checkout pre-selects it. If no addresses remain: checkout shows "Add an address to continue"; checkout cannot proceed.

**Backend Behaviour:** Address delete endpoint checks if deleted address was `is_default = true`. If so, UPDATE the next address to `is_default = true` within the same transaction.

**Recovery Strategy:** Customer adds a new address at checkout.

**Logging Requirement:** No special logging.

---

### EC-ADDR-02: Checkout Address Does Not Belong to the Authenticated User

**Scenario:** A client submits a Place Order request with an `address_id` belonging to a different customer (e.g., a manipulated API request).

**Risk:** Order created with another customer's address; data leak.

**Expected System Behaviour:** Place Order Edge Function validates: `SELECT id FROM addresses WHERE id = ? AND customer_id = auth.uid()`. If not found, reject.

**User-Facing Behaviour:** Error: "Invalid delivery address." Order not placed.

**Backend Behaviour:** Supabase RLS and explicit query filter prevent cross-customer address access. Returns 403 or 422.

**Recovery Strategy:** Client displays error. Legitimate customer selects their own address.

**Logging Requirement:** Unauthorised address access attempt logged at warning level with customer ID, attempted address ID, and IP address.

---

## Order Placement Edge Cases

---

### EC-ORDER-01: User Double Taps Place Order

**Scenario:** Customer taps "Place Order" twice in rapid succession.

**Risk:** Two orders created with identical contents; double inventory deduction; customer charged twice (COD).

**Expected System Behaviour:**
- Client-side: "Place Order" button is disabled and shows spinner immediately after first tap. Second tap is ignored.
- Server-side: If two requests somehow arrive (e.g., due to a race with a slow spinner), the idempotency key mechanism returns the existing order for the duplicate request.

**User-Facing Behaviour:** Only one order is created. Customer sees the Order Success screen once.

**Backend Behaviour:** Idempotency key (UUID generated per checkout session) stored with the order. Duplicate request with same key within 60 seconds returns existing order ID (HTTP 200) without creating a new order.

**Recovery Strategy:** No recovery needed; mechanism prevents the problem.

**Logging Requirement:** Duplicate idempotency key attempts logged at info level.

---

### EC-ORDER-02: Place Order Request Times Out After Backend Creates the Order

**Scenario:** The order is created successfully on the backend, but the network response is lost before the client receives it. Customer sees a spinner indefinitely or gets a generic network error.

**Risk:** Customer believes the order failed and places a duplicate order; customer is confused about order status.

**Expected System Behaviour:**
1. Client detects timeout after 30 seconds.
2. Client polls the backend using the idempotency key: `GET /orders?idempotency_key=<key>`.
3. If an order is found: navigate to Order Success with that order ID.
4. If no order is found after 30 seconds of polling: display: "Order placement timed out. Please check your Orders page to confirm if your order was placed."

**User-Facing Behaviour:** After timeout, client automatically polls. If found: seamless success. If not found: advisory message; link to Orders page.

**Backend Behaviour:** Orders endpoint accepts idempotency key as a query parameter for status lookup.

**Recovery Strategy:** Customer checks Orders page. If the order exists, they can track it normally. If it doesn't exist, they can re-attempt checkout.

**Logging Requirement:** Timeout events logged with idempotency key. Polling requests logged at debug level.

---

### EC-ORDER-03: Two Users Attempt to Purchase the Final Stock Unit

**Scenario:** Product has quantity = 1. Two customers independently reach Place Order at the same instant.

**Risk:** Both orders succeed; inventory goes to -1; product oversold.

**Expected System Behaviour:** The Place Order Edge Function acquires a row-level lock (`SELECT ... FOR UPDATE`) on the inventory row for each product. The second request waits for the first to complete. After the first order reduces quantity to 0, the second request sees quantity = 0 and fails the stock validation check.

**User-Facing Behaviour:**
- First customer: Order placed successfully.
- Second customer: Error: "Insufficient stock. [Product name] is no longer available." Order not placed.

**Backend Behaviour:** PostgreSQL row-level locking serialises concurrent updates. `UPDATE inventory SET quantity = quantity - 1 WHERE id = ? AND quantity >= 1` with affected-row check.

**Recovery Strategy:** Second customer is informed of stock unavailability; can remove the item or wait for restock.

**Logging Requirement:** Concurrent conflict logged at info level.

---

### EC-ORDER-04: Inventory Update Fails During Order Creation

**Scenario:** The inventory deduction step fails (e.g., database error) during the order creation transaction.

**Risk:** Order created without inventory being deducted; stock goes negative or is inconsistent.

**Expected System Behaviour:** The entire order creation transaction is rolled back. No order row, no order items, no inventory change, no coupon usage, and no cart clear is persisted. This is the strict atomicity policy — there is no partial-success path.

**User-Facing Behaviour:** Error: "We were unable to complete your order. Please try again." Customer returned to Checkout. Cart is intact.

**Backend Behaviour:** Supabase Edge Function wraps all operations in a single database transaction. Any step failure — including inventory deduction — triggers a full ROLLBACK. No compensating workflows or partial commits are used.

**Recovery Strategy:** Customer retries checkout. Cart is preserved.

**Logging Requirement:** Transaction rollback logged at error level with failure point and error details.

---

### EC-ORDER-05: Order Item Creation Fails

**Scenario:** The `order_items` INSERT fails during the order creation transaction.

**Risk:** Order exists without line items; partial order state.

**Expected System Behaviour:** Same as EC-ORDER-04 — full transaction rollback.

**User-Facing Behaviour:** Same as EC-ORDER-04.

**Backend Behaviour:** Transaction rollback. No partial order state persisted.

**Recovery Strategy:** Same as EC-ORDER-04.

**Logging Requirement:** Logged at error level.

---

### EC-ORDER-06: Cart Clearing Fails

**Scenario:** The cart-clearing step (DELETE cart_items) fails during the order creation transaction.

**Risk:** If cart clearing were a post-commit operation, the order would be placed but the cart would remain non-empty, confusing the customer and risking duplicate orders.

**Expected System Behaviour:** Cart clearing is inside the same database transaction as all other order creation steps. If the DELETE fails, the entire transaction is rolled back — no order is created, no inventory is deducted, and no cart items are removed. There is no partial-success path.

**User-Facing Behaviour:** Same as EC-ORDER-04 — error message shown; customer returned to Checkout with cart intact.

**Backend Behaviour:** All steps in the Place Order Edge Function — including cart clearing — execute within a single database transaction. Any step failure triggers a full ROLLBACK. Post-commit cleanup jobs are not used for cart clearing.

**Recovery Strategy:** Customer retries checkout. Cart is preserved in full.

**Logging Requirement:** Cart clear failure (and subsequent rollback) logged at error level with order ID and error details.

---

## Admin Order Management Edge Cases

---

### EC-ADMIN-ORDER-01: Admin Attempts an Invalid Order Status Transition

**Scenario:** Admin tries to update an order from `shipped` to `processing` (backwards transition).

**Risk:** Order status becomes inconsistent; customer and admin see conflicting information.

**Expected System Behaviour:** Backend validates the transition against the allowed transition matrix. Transition is rejected.

**User-Facing Behaviour (Admin):** Error message inline: "Cannot transition from 'shipped' to 'processing'. Only 'out_for_delivery' is allowed from 'shipped'." Order status unchanged.

**Backend Behaviour:** Status update endpoint checks: `allowed_transitions[current_status].includes(new_status)`. If false, returns HTTP 422 with descriptive error.

**Recovery Strategy:** Admin selects the correct status transition.

**Logging Requirement:** Invalid transition attempt logged as a failed admin action in `admin_activity_logs`.

---

### EC-ADMIN-ORDER-02: Admin Changes Stock While Customer Checkout Is Running

**Scenario:** Admin performs an inventory reduction on a product at the same moment a customer is in the Place Order flow.

**Risk:** Customer's order succeeds with more stock than available; negative inventory.

**Expected System Behaviour:** Row-level locking in the Place Order Edge Function ensures that admin inventory adjustments and customer order deductions are serialised. One will block until the other completes.

**Backend Behaviour:** Both the admin inventory adjustment endpoint and the Place Order Edge Function use `SELECT ... FOR UPDATE` on the inventory row. Serialised by the database.

**Recovery Strategy:** Whichever operation acquires the lock second will see the updated quantity and either succeed (if stock sufficient) or fail cleanly (if not).

**Logging Requirement:** Lock contention events logged at debug level.

---

### EC-ADMIN-ORDER-03: Customer Attempts to Cancel a Shipped Order

**Scenario:** Customer tries to cancel an order that is in `shipped` status via the app (e.g., the UI incorrectly shows a cancel button, or a direct API call is made).

**Risk:** Incorrect cancellation of a shipped order; inventory restoration for items already dispatched.

**Expected System Behaviour:** Backend validates: customers may only cancel orders in `pending` or `confirmed` status. If current status is `shipped`, request is rejected.

**User-Facing Behaviour:** Error: "This order can no longer be cancelled. Please contact support." No status change.

**Backend Behaviour:** Cancel endpoint checks: `order.status IN ('pending', 'confirmed') AND order.customer_id = auth.uid()`. Returns 422 if condition not met.

**Recovery Strategy:** Customer contacts support. Admin can handle the case manually.

**Logging Requirement:** Invalid cancellation attempt logged with order ID, customer ID, and current status.

---

### EC-ADMIN-ORDER-04: Cancelled Order Inventory Restoration Fails

**Scenario:** An order is cancelled (by admin or customer), but the inventory restoration step fails.

**Risk:** Stock is not restored; inventory is permanently reduced for a cancelled order.

**Expected System Behaviour:** Inventory restoration is inside the same database transaction as the order status update. If restoration fails, the entire cancellation is rolled back. The order remains in its pre-cancellation status. There is no partial-success path where the order is marked cancelled but inventory is not restored.

**User-Facing Behaviour (Customer):** "Order cancellation failed. Please try again." Order status is unchanged.

**User-Facing Behaviour (Admin):** Inline error: "Cancellation failed. Please try again." Status unchanged.

**Backend Behaviour:** The cancel Edge Function wraps all steps — status update, order_status_history insert, inventory restoration, coupon usage reversal — in a single database transaction. Any step failure triggers a full ROLLBACK.

**Recovery Strategy:** Customer or admin retries the cancellation. If a persistent failure occurs, the admin contacts the engineering team to investigate the database error.

**Logging Requirement:** Transaction rollback during cancellation logged at error level with order ID, affected medicine IDs, and database error details.

---

## Notification Edge Cases

---

### EC-NOTIF-01: Notification Sending Fails

**Scenario:** Admin sends a notification. The push notification dispatch call to the push provider fails.

**Risk:** Customer does not receive the push notification but expects in-app notification.

**Expected System Behaviour:** The `notifications` database record is always inserted first. Push dispatch failure does not prevent the in-app notification from being available. The failure is reported to the admin.

**User-Facing Behaviour (Admin):** Toast: "Notification saved, but push delivery failed. The in-app notification is still active."

**User-Facing Behaviour (Customer):** Customer will see the notification the next time the Notifications screen is loaded (in-app notification is persisted in DB).

**Backend Behaviour:** Push dispatch is a best-effort call after DB insert. Failure is caught, logged, and reported. No transaction rollback for push failure.

**Recovery Strategy:** Admin can re-attempt push dispatch. In-app notification is always available.

**Logging Requirement:** Push failure logged at error level with notification ID, provider response, and timestamp.

---

## Media & Assets Edge Cases

---

### EC-MEDIA-01: Product Image Fails to Load

**Scenario:** Medicine image URL is broken or Supabase Storage returns an error.

**Risk:** Customer sees a broken image; poor user experience.

**Expected System Behaviour:** React Native `Image` component handles load error. Fallback placeholder image shown.

**User-Facing Behaviour:** A generic medicine/placeholder image displayed instead of the broken image. No error message shown; the experience degrades gracefully.

**Backend Behaviour:** No backend action required.

**Recovery Strategy:** Admin re-uploads the image from the Medicine edit page.

**Logging Requirement:** Image load failures logged client-side (if error tracking is configured).

---

### EC-MEDIA-02: Admin Upload Fails

**Scenario:** Admin attempts to upload a medicine image or banner image, and the Supabase Storage upload fails.

**Risk:** Product or banner saved without an image; UI rendered incorrectly.

**Expected System Behaviour:** Upload error is caught before the save operation. If upload fails, the save operation is not attempted.

**User-Facing Behaviour (Admin):** Toast: "Image upload failed. Please try again." Form remains open and populated.

**Backend Behaviour:** Client attempts upload to Supabase Storage. If the upload returns an error, no DB insert/update is made.

**Recovery Strategy:** Admin retries the upload. Common causes: file too large (enforce size limit on client), unsupported file type (enforce JPEG/PNG/WebP on client).

**Logging Requirement:** Upload failures logged with file size, type, and storage error code.

---

## Performance Edge Cases

---

### EC-PERF-01: Database Request Is Slow

**Scenario:** A database query takes longer than expected (e.g., full-text medicine search under load).

**Risk:** API response is slow; customer perceives the app as broken.

**Expected System Behaviour:** All queries have a server-side timeout configured (e.g., 10 seconds for complex queries, 5 seconds for simple reads).

**User-Facing Behaviour:** Loading indicators remain visible throughout. If the request eventually succeeds, the UI updates normally. If it times out, the appropriate error state is shown with a retry option.

**Backend Behaviour:** Supabase configures statement timeout at the database level. Edge Functions have a maximum execution time. Slow queries logged with execution time.

**Recovery Strategy:** Customer retries. Engineering team is alerted to optimise the slow query (add index, materialised view, etc.).

**Logging Requirement:** Queries exceeding 3 seconds logged at warning level with query type and duration.

---

## Mobile App Lifecycle Edge Cases

---

### EC-MOBILE-01: Mobile Application Is Killed During Checkout

**Scenario:** Customer's device kills the app (out-of-memory, force-close) while the Place Order request is in-flight.

**Risk:** Order may or may not have been created; customer has no confirmation.

**Expected System Behaviour:** On next app launch, session is restored. The checkout screen is no longer open. No automatic detection of the in-flight state.

**User-Facing Behaviour:** Customer lands on Home screen. No indication of order status. Customer should check Orders page.

**Backend Behaviour:** If the Place Order Edge Function received and processed the request before the app was killed, the order was created normally. Idempotency key (if preserved in local state) may or may not still be available.

**Recovery Strategy:** Customer navigates to Orders page to check for a recently created order. If found, the order is valid. If not found, customer can retry checkout (cart is still server-side).

**Logging Requirement:** No special logging (the backend does not know the app was killed).

---

### EC-MOBILE-02: Mobile Application Restarts After Order Creation

**Scenario:** App is killed or crashes immediately after the backend creates the order but before the client navigates to the Order Success screen.

**Risk:** Customer doesn't see the Order Success screen; believes the order failed.

**Expected System Behaviour:** On next app launch, the order exists in the database. The customer can verify via the Orders page.

**User-Facing Behaviour:** Customer sees Home screen. Customer navigates to Orders and finds the newly created order.

**Backend Behaviour:** No action needed; order is persisted.

**Recovery Strategy:** Customer checks Orders page. A "Your last order is awaiting" prompt on Home (if implementable) would improve UX in future versions.

**Logging Requirement:** No special logging.

---

### EC-MOBILE-03: Customer Logs Into a New Device

**Scenario:** Customer logs in on a second phone or a new device.

**Risk:** Cart or session state missing.

**Expected System Behaviour:** Session is created fresh on Supabase Auth. `customers` row is matched by `auth_user_id`. Cart (stored server-side linked to customer ID) is fully available. Addresses, order history, and notifications all available.

**User-Facing Behaviour:** Customer sees all their data immediately after logging in on the new device. No data loss.

**Backend Behaviour:** All state is server-side; no dependency on device-local storage for business data (SecureStore only holds the session token).

**Recovery Strategy:** No recovery needed; by design.

**Logging Requirement:** New device login can be logged at info level with device metadata if collected.

---

### EC-MOBILE-04: Customer Logs Out While a Cart Mutation Is Pending

**Scenario:** Customer taps Logout immediately after tapping "Add to Cart" or another cart mutation that is still in-flight.

**Risk:** Cart mutation may complete or fail; session is cleared; cart state is uncertain.

**Expected System Behaviour:**
- If the cart mutation completes before logout: cart item is saved server-side; will be visible on next login.
- If the cart mutation is cancelled before reaching the server: cart item is not saved.
- Logout clears local state and session. The pending TanStack Query mutation is cancelled.

**User-Facing Behaviour:** Customer is logged out. On next login, cart reflects whichever state was persisted server-side.

**Backend Behaviour:** Once session is cleared, any in-flight requests that arrive at the backend without a valid JWT are rejected with 401 and not processed.

**Recovery Strategy:** No recovery needed; server-side cart is the source of truth.

**Logging Requirement:** No special logging.

---

## Summary of Risks and Mitigations

| Edge Case | Risk Level | Mitigation |
|-----------|-----------|------------|
| Two users purchasing last stock unit | **Critical** | Row-level lock in Place Order transaction |
| Inventory update fails during order | **Critical** | Full transaction rollback |
| Duplicate Place Order | **High** | Client-side button disable + server-side idempotency key |
| Order timeout with unknown result | **High** | Client polls for order status using idempotency key |
| Checkout address not owned by user | **High** | Backend ownership validation on every order |
| Account blocked | **High** | Application-level check after OTP verification |
| Cart clearing fails | **Medium** | Include in transaction; fallback cleanup job |
| Coupon expires during checkout | **Medium** | Server-side validation at Place Order time |
| Price increases during checkout | **Medium** | Backend recalculates; rejects if higher |
| Inventory restoration fails on cancel | **Medium** | Alert + manual correction by admin |
| OTP expires | **Low** | Clear message; prompt for new OTP |
| Product image fails to load | **Low** | Graceful fallback placeholder |
| App killed during checkout | **Low** | Orders page shows real state; cart preserved |
