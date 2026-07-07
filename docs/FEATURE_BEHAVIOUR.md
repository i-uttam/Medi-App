# Feature Behaviour Specification — Online Pharmacy Platform

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-07  

---

## Table of Contents

- [Customer Features](#customer-features)
- [Admin Features](#admin-features)

---

## Customer Features

---

### FEATURE: APP INITIALIZATION

**Trigger:** Application cold start or foreground resume.

**Preconditions:** None.

**System Behaviour:**
1. Display splash screen with app logo and brand name.
2. Attempt to retrieve stored session token from Expo SecureStore.
3. If no token exists, navigate to Login screen.
4. If token exists, send silent validation request to Supabase Auth.
5. If token is valid, navigate to Home screen.
6. If token is expired or invalid, clear stored token and navigate to Login screen.

**Loading Behaviour:** Splash screen is shown for the entire duration of session validation. Maximum wait: 5 seconds. After 5 seconds, treat session as unavailable and redirect to Login.

**Success Behaviour:** Home screen is displayed with the authenticated customer's data.

**Failure Behaviour:** Login screen is displayed. Session data is cleared. No error message shown to user (silent re-auth).

**Edge Cases:**
- Network unavailable during session validation: treat as session unavailable, navigate to Login.
- SecureStore read error: treat as no session, navigate to Login.

---

### FEATURE: SESSION RESTORATION

**Trigger:** App returns to foreground after backgrounding.

**Preconditions:** App was previously in the background.

**System Behaviour:**
1. Supabase Auth SDK automatically refreshes the session token if within the refresh window.
2. TanStack Query refetches stale queries on window focus.
3. If session token has expired beyond refresh window, the next API call returns 401.
4. On 401 response, clear local session and redirect to Login.

**Loading Behaviour:** No explicit loading state for background refresh.

**Success Behaviour:** User continues using the app seamlessly.

**Failure Behaviour:** User is redirected to Login with no disruptive error message.

---

### FEATURE: PHONE LOGIN — OTP REQUEST

**Trigger:** User enters phone number and taps "Send OTP".

**Preconditions:** None (unauthenticated).

**System Behaviour:**
1. Validate phone number format on the client (E.164 format, Indian numbers).
2. Disable the "Send OTP" button immediately.
3. Send phone number to Supabase Auth `signInWithOtp` method.
4. Supabase Auth sends OTP via SMS.
5. On success, navigate to OTP entry screen, passing the phone number.
6. Start a 60-second countdown timer for OTP resend.

**Loading Behaviour:** "Send OTP" button shows spinner and is disabled until response received.

**Success Behaviour:** OTP screen displayed. Timer countdown started.

**Failure Behaviour:** Re-enable "Send OTP" button. Display inline error: "Failed to send OTP. Please try again."

**Edge Cases:**
- Invalid phone format: Show "Please enter a valid mobile number" before making any API call.
- Network disconnected: Show "No internet connection. Please check your network."
- Rate limit exceeded: Show "Too many requests. Please wait before trying again."

---

### FEATURE: OTP VERIFICATION

**Trigger:** User enters 6-digit OTP and taps "Verify".

**Preconditions:** OTP has been sent to user's phone.

**System Behaviour:**
1. Validate that OTP field contains exactly 6 digits.
2. Disable "Verify" button immediately.
3. Send phone + OTP to Supabase Auth `verifyOtp` method.
4. On success, receive session token; store in Expo SecureStore.
5. Query the `customers` table for a row matching the authenticated user ID.
6. If customer profile row exists, navigate to Home.
7. If customer profile row does not exist, navigate to Profile Setup (new user flow).

**Loading Behaviour:** "Verify" button shows spinner and is disabled.

**Success Behaviour:** Navigates to Home or Profile Setup.

**Failure Behaviour:**
- Incorrect OTP: Show "Incorrect OTP. X attempts remaining."
- After 3 incorrect attempts: Lock OTP entry; show "Too many failed attempts. Please request a new OTP."
- Expired OTP: Show "OTP has expired. Please request a new one." and navigate back to phone entry.

**Edge Cases:**
- Network disconnected during verification: Re-enable button; show network error.
- User attempts to paste non-numeric characters: Input sanitised to digits only.

---

### FEATURE: NEW PROFILE CREATION

**Trigger:** Successful OTP verification for a new user (no existing customer profile).

**Preconditions:** User is authenticated via Supabase Auth; no customer row exists.

**System Behaviour:**
1. Display profile setup form with name (required) and email (optional).
2. Phone number pre-filled from auth session, read-only.
3. On submit, validate name length (2–100 characters).
4. Insert new row into `customers` table with `auth_user_id`, `phone`, `name`, `email`, `created_at`.
5. Navigate to Home.

**Loading Behaviour:** Submit button shows spinner.

**Success Behaviour:** Home screen displayed.

**Failure Behaviour:** Inline validation errors for each field; toast for server error.

---

### FEATURE: EXISTING USER LOGIN

**Trigger:** OTP verified, customer profile row exists.

**Preconditions:** Customer profile exists in `customers` table.

**System Behaviour:**
1. Session token stored in Expo SecureStore.
2. Customer profile loaded from `customers` table.
3. Navigate to Home.

**Success Behaviour:** Home screen displayed.

---

### FEATURE: LOGOUT

**Trigger:** User taps "Logout" in Profile or Settings.

**Preconditions:** User is authenticated.

**System Behaviour:**
1. Show confirmation dialog: "Are you sure you want to log out?"
2. On confirm, call Supabase Auth `signOut`.
3. Clear session token from Expo SecureStore.
4. Clear all TanStack Query cache.
5. Clear Zustand store state.
6. Navigate to Login screen.

**Loading Behaviour:** Logout button shows spinner.

**Success Behaviour:** Login screen displayed.

**Failure Behaviour:** Even if signOut API fails, clear local state and navigate to Login. Log the API failure silently.

---

### FEATURE: ACCOUNT DELETION

**Trigger:** User taps "Delete Account" and confirms in the confirmation dialog.

**Preconditions:** User is authenticated.

**System Behaviour:**
1. Display confirmation dialog with clear warning text.
2. Check if customer has any active orders (status in `pending`, `confirmed`, `processing`, `packed`, `shipped`, `out_for_delivery`).
3. If active orders exist, display: "You have active orders. Please wait for them to be completed or cancelled before deleting your account."
4. If no active orders, proceed with deletion request.
5. Backend soft-deletes customer: sets `is_deleted = true`, anonymises PII (name, email replaced with placeholders, phone hashed).
6. Backend calls Supabase Auth to delete the auth user.
7. Clear local session, navigate to Login.

**Loading Behaviour:** Confirm button shows spinner.

**Success Behaviour:** Login screen displayed.

**Failure Behaviour:** Toast: "Account deletion failed. Please try again." Account remains active.

**Edge Cases:**
- Network failure during deletion: Account not deleted; show error.
- Active orders detected: Block deletion with clear message.

---

### FEATURE: HOME DATA LOADING

**Trigger:** Home screen mounts or user pulls to refresh.

**Preconditions:** User authenticated.

**System Behaviour:**
1. Send parallel API requests: active banners, active top-level categories, featured medicines.
2. Display skeleton placeholders for each section during load.
3. Render each section as its data resolves (progressive display).
4. If a single section fails, show a retry button for that section only; other sections render normally.

**Loading Behaviour:** Per-section skeleton loaders.

**Success Behaviour:** All sections populated with real data.

**Failure Behaviour:** Per-section error state with retry. Full-page retry if all sections fail.

---

### FEATURE: BANNER INTERACTION

**Trigger:** User taps a banner on the Home screen.

**Preconditions:** Banner is loaded and has a `link_target`.

**System Behaviour:**
1. Read the banner's `link_target` (category ID, medicine ID, or external URL).
2. Navigate to the appropriate screen based on target type.
3. If target is external URL, open in in-app browser.
4. If `link_target` is null, tapping the banner is a no-op.

**Edge Cases:**
- Banner's target category has been deactivated: Navigate to Category screen; show empty state.
- Banner's target medicine has been archived: Navigate to Medicine Detail; show "Product no longer available."

---

### FEATURE: PRODUCT LIST LOADING AND PAGINATION

**Trigger:** Medicine listing screen mounts, or user scrolls to end of list.

**Preconditions:** User authenticated.

**System Behaviour:**
1. Load first page (20 items) with applied context (category ID, search query, or featured flag).
2. Display items as cards.
3. When user scrolls within 3 items of the bottom, fetch the next page.
4. Append next page items to existing list.
5. If no more pages exist, stop fetching.

**Loading Behaviour:** Initial: skeleton cards. Subsequent pages: inline spinner at bottom of list.

**Empty State:** "No medicines found."

**Error State:** Retry button. For pagination errors, show inline retry at bottom.

---

### FEATURE: SEARCH INPUT

**Trigger:** User types in the search bar.

**Preconditions:** Search screen is active.

**System Behaviour:**
1. Capture each keystroke.
2. Debounce by 300ms.
3. If query is ≥ 2 characters, send search API request.
4. If query is < 2 characters, show recent searches or clear results.
5. Display paginated search results.

**Loading Behaviour:** Inline activity indicator next to search bar.

**Empty State:** "No results for '[query]'. Try a different search."

**Error State:** "Search failed. Please try again."

---

### FEATURE: RECENT SEARCHES

**Trigger:** User focuses on search bar with no query typed.

**Preconditions:** User has previously searched.

**System Behaviour:**
1. Load up to 10 most recent search queries from local storage (AsyncStorage).
2. Display as tappable chips.
3. Tapping a chip populates the search bar and executes the search.

**Edge Cases:**
- User clears all recent searches: Show "No recent searches."

---

### FEATURE: SEARCH HISTORY DELETION

**Trigger:** User taps "Clear" or individual delete icon next to a recent search.

**System Behaviour:**
1. Remove the selected entry (or all entries) from AsyncStorage.
2. Update the displayed list immediately.

---

### FEATURE: SEARCH FILTERS AND SORTING

**Trigger:** User applies a filter or sort option.

**System Behaviour:**
1. Filters (category, price range) sent as query parameters to backend.
2. Sort options (price ascending, price descending, discount, newest) sent as query parameters.
3. Results list is reset to page 1 on filter/sort change.
4. Active filters indicated with visual indicators.

---

### FEATURE: PRODUCT DETAILS LOADING

**Trigger:** User taps a medicine card from any listing.

**Preconditions:** User authenticated.

**System Behaviour:**
1. Navigate to Medicine Detail screen with medicine ID.
2. Fetch full medicine record including images, description, composition, brand, manufacturer, inventory status.
3. Record product view: upsert row in `recently_viewed` for this `customer_id` + `medicine_id`.
4. Fetch current cart state to determine if this medicine is already in cart.
5. Render quantity controls if in cart; render Add to Cart button if not.

**Loading Behaviour:** Full-screen skeleton.

**Error State:** "Unable to load product." with retry and back button.

---

### FEATURE: ADD TO CART

**Trigger:** User taps "Add to Cart" on a product card or detail screen.

**Preconditions:**
- User session state is known.
- Product is active (`is_active = true`).
- Product is not archived (`is_archived = false`).
- Product has available stock (`inventory.quantity > 0`).

**System Behaviour:**
1. Disable the "Add to Cart" button immediately.
2. Send POST request to backend: `{ medicine_id, quantity: 1 }`.
3. Backend validates: product active, product in stock.
4. Backend inserts `cart_items` row or increments quantity if row exists.
5. Backend returns updated cart item.
6. Invalidate cart query in TanStack Query.
7. Update product card UI to show quantity controls.
8. Update cart badge count in navigation.

**Loading Behaviour:** Add to Cart button disabled and shows spinner until response received.

**Success Behaviour:** Add to Cart button replaced by quantity controls (− quantity +).

**Failure Behaviour:** Re-enable button. Restore previous UI state. Display toast: "[Reason]" (e.g., "Out of stock", "Product unavailable").

**Edge Cases:**
- Product becomes inactive between page load and tap: Backend rejects; show "This product is no longer available."
- Product becomes out of stock between page load and tap: Backend rejects; show "Out of stock."
- Network disconnects: Re-enable button; show "Network error. Please try again."
- User taps Add rapidly: Button is disabled after first tap; subsequent taps are ignored.
- Database operation fails: Return error; client restores previous state.

---

### FEATURE: INCREASE CART QUANTITY

**Trigger:** User taps "+" next to a cart item.

**Preconditions:** Item is in cart; current quantity < available stock.

**System Behaviour:**
1. Disable the "+" button.
2. Send PATCH request: `{ cart_item_id, quantity: current + 1 }`.
3. Backend validates: new quantity ≤ available stock.
4. Backend updates `cart_items.quantity`.
5. Invalidate cart query.
6. Update displayed quantity and subtotal.

**Failure Behaviour:** Re-enable "+". Toast: "Maximum available quantity reached" or specific error.

**Edge Cases:**
- Current quantity equals available stock: "+" button is visually disabled (greyed out) before tap.

---

### FEATURE: DECREASE CART QUANTITY

**Trigger:** User taps "−" next to a cart item.

**Preconditions:** Item is in cart.

**System Behaviour:**
1. If current quantity > 1:
   - Disable "−" button.
   - Send PATCH request: `{ cart_item_id, quantity: current - 1 }`.
   - On success, update displayed quantity.
2. If current quantity = 1:
   - Trigger Remove Item behaviour (see below).

**Failure Behaviour:** Re-enable "−". Toast with error.

---

### FEATURE: REMOVE CART ITEM

**Trigger:** User taps "−" when quantity is 1, or taps explicit "Remove" / trash icon.

**Preconditions:** Item is in cart.

**System Behaviour:**
1. Show confirmation dialog if tapping trash icon; no confirmation if decrementing from 1.
2. Disable remove control.
3. Send DELETE request: `{ cart_item_id }`.
4. On success, remove item from cart list.
5. Update cart badge and totals.
6. If cart becomes empty, show empty cart state.

**Failure Behaviour:** Restore item in list. Toast with error.

---

### FEATURE: CART PERSISTENCE

**Preconditions:** User is authenticated.

**System Behaviour:**
- Cart state is stored server-side in `cart_items` table.
- Cart persists across app restarts, device switches, and logout/login cycles (the cart belongs to the customer ID).
- No cart data is stored locally.

---

### FEATURE: CART PRICE REFRESH

**Trigger:** Cart screen mounts.

**System Behaviour:**
1. Fetch cart items from backend.
2. Backend joins `cart_items` with current `medicines.selling_price`.
3. If price has changed since item was added, the updated price is returned and displayed.
4. If price increased: display new price. No automatic removal. Customer can proceed to checkout where backend will validate.
5. If price decreased: display new (lower) price.

---

### FEATURE: CART STOCK VALIDATION

**Trigger:** Cart screen mounts.

**System Behaviour:**
1. Backend checks each cart item's quantity against current inventory.
2. Items where `cart_items.quantity > inventory.quantity`: Item is flagged with a warning "Only X units available." Cart quantity is capped to available stock.
3. Items where `inventory.quantity = 0`: Item flagged as "Out of stock." Cannot proceed to checkout until removed.
4. Items where `medicines.is_active = false` or `is_archived = true`: Item flagged as "No longer available." Cannot proceed to checkout until removed.

---

### FEATURE: CART UNAVAILABLE PRODUCT HANDLING

**System Behaviour:**
1. Flagged unavailable items are shown with a visual warning.
2. "Proceed to Checkout" button is disabled if any unavailable items exist.
3. Customer must remove all flagged items to proceed.

---

### FEATURE: ADD ADDRESS

**Trigger:** User taps "Add New Address".

**Preconditions:** User authenticated.

**System Behaviour:**
1. Display address form: label (Home/Work/Other), full name, phone, address line 1, address line 2 (optional), city, state, postal code.
2. Validate all required fields on submit.
3. If this is the customer's first address, set `is_default = true` automatically.
4. POST to backend; insert into `addresses` table with `customer_id`.
5. Refresh address list.

**Validation Rules:**
- Full name: 2–100 characters, required.
- Phone: valid 10-digit Indian mobile number, required.
- Address line 1: required, max 200 characters.
- City: required.
- State: required.
- Postal code: valid 6-digit Indian PIN code, required.

**Success Behaviour:** Address appears in list; success toast.

**Failure Behaviour:** Per-field validation errors; save failure toast.

---

### FEATURE: EDIT ADDRESS

**Trigger:** User taps the dedicated "Edit" button or edit icon on an address card.

**Preconditions:** User authenticated; address belongs to user.

**CRITICAL UX RULE:** Tapping the address card itself does NOT enter edit mode. Edit mode is ONLY activated by tapping the explicit "Edit" button or icon.

**System Behaviour:**
1. Pre-fill address form with existing values.
2. Allow editing of all fields except the address ID.
3. On submit, validate all fields.
4. PATCH to backend; update `addresses` row.
5. Refresh address list.

---

### FEATURE: DELETE ADDRESS

**Trigger:** User taps delete icon on an address.

**Preconditions:** Address does not have active orders referencing it as the exclusive address.

**System Behaviour:**
1. Show confirmation dialog.
2. On confirm, send DELETE request.
3. Backend soft-deletes the address (`is_deleted = true`).
4. If deleted address was `is_default = true`, backend assigns default to the next available address (if any).
5. Refresh address list.

**Edge Cases:**
- Deleting the only address: Address is deleted; customer must add a new address at next checkout.

---

### FEATURE: SET DEFAULT ADDRESS

**Trigger:** User taps "Set as Default" on an address card.

**System Behaviour:**
1. Send PATCH request to set `is_default = true` for selected address.
2. Backend sets `is_default = false` for all other addresses owned by this customer in the same transaction.
3. Refresh address list; show new default indicator.

---

### FEATURE: SELECT CHECKOUT ADDRESS

**Trigger:** User taps an address card during checkout.

**CRITICAL UX RULE:** Tapping the address card in checkout context selects it as the delivery address. It does NOT open edit mode.

**System Behaviour:**
1. Visually highlight selected address with a selected state indicator.
2. Store selected address ID in checkout state (Zustand or local component state).
3. Proceed to checkout with selected address ID.

---

### FEATURE: COUPON APPLICATION

**Trigger:** User enters a coupon code and taps "Apply".

**Preconditions:** User is on checkout screen with a non-empty cart.

**System Behaviour:**
1. Disable Apply button; show inline spinner.
2. Send POST to backend with coupon code and current cart subtotal.
3. Backend validates:
   - Coupon exists.
   - `is_active = true`.
   - Within `start_date` / `end_date` (if set).
   - `used_count < usage_limit` (if set).
   - Customer's usage of this coupon < `per_customer_limit` (if set).
   - Cart subtotal ≥ `minimum_order_value` (if set).
4. If valid, return coupon discount details.
5. Display coupon name, discount description, and updated total.

**Loading Behaviour:** Apply button disabled with spinner.

**Success Behaviour:** Coupon name shown with discount amount; total updated.

**Failure Behaviour:** Inline error message:
- "Invalid coupon code."
- "This coupon has expired."
- "Minimum order value for this coupon is ₹X."
- "Coupon usage limit reached."
- "You have already used this coupon the maximum number of times."

---

### FEATURE: COUPON REMOVAL

**Trigger:** User taps the remove/clear icon next to applied coupon.

**System Behaviour:**
1. Remove coupon from checkout state (client-side only; no backend call at this stage).
2. Recalculate displayed total without coupon discount.
3. Coupon code input is cleared.

---

### FEATURE: CHECKOUT INITIALIZATION

**Trigger:** User taps "Proceed to Checkout" from cart.

**Preconditions:** Cart is non-empty; all cart items are available.

**System Behaviour:**
1. Navigate to Checkout screen.
2. Generate a UUID v4 idempotency key and store it in checkout session state. This key persists until the user leaves the Checkout screen. It is reused on all Place Order retries within this session.
3. Load customer's default address (pre-select if available).
4. Refresh cart prices from backend.
5. Display order summary: items, subtotal, delivery charge, total.
6. Validate minimum order value; if not met, show error and disable Place Order.

**Edge Cases:**
- No saved addresses: Prompt to add an address before proceeding.
- No default address: Show address list for manual selection.

---

### FEATURE: CHECKOUT PRICE REFRESH

**Trigger:** Checkout screen mounts.

**System Behaviour:**
1. Fetch current prices for all cart items from backend.
2. If any price has increased since cart load, display a notice: "Prices have been updated." Highlight changed items.
3. If any price has decreased, update quietly.
4. Recalculate totals with refreshed prices.

---

### FEATURE: PLACE ORDER

**Trigger:** User taps "Place Order".

**Preconditions:**
- Cart is non-empty.
- All items are available and in stock.
- A delivery address is selected.
- Minimum order value is met.

**System Behaviour:**
1. Disable "Place Order" button immediately. Do not re-enable until response received.
2. Retrieve the UUID idempotency key generated when the Checkout screen first loaded (see Checkout Initialization). This key is reused on any retry within the same session.
3. Send POST request to Place Order Edge Function with `{ cart_id, address_id, coupon_code? }` in the body and the idempotency key in the `X-Idempotency-Key` request header, along with the auth token.
4. Backend executes the full atomic order creation sequence (see PRD Section 9.1).
5. On success, receive order object.
6. Navigate to Order Success screen with order ID.

**Loading Behaviour:** "Place Order" button shows spinner and label "Placing Order..."; button is fully disabled.

**Success Behaviour:** Navigate to Order Success screen; cart empty.

**Failure Behaviour:**
- Stock issue: "Some items are out of stock. Please review your cart."
- Price change: "Prices have changed. Please review your cart."
- Coupon invalid: "The applied coupon is no longer valid."
- Network timeout: Do not show generic error immediately; instead poll for order status using idempotency key for up to 30 seconds. If order found, navigate to Order Success. If not found after 30 seconds, show "Order placement timed out. Please check your Orders page."
- Any other failure: Human-readable error toast.

**Edge Cases:**
- User taps Place Order twice: Second tap is ignored (button disabled).
- Network disconnects: Re-enable button after timeout; advise user to check Orders page.

---

### FEATURE: DUPLICATE PLACE ORDER PREVENTION

**System Behaviour:**
1. Idempotency key is generated as a UUID when user first loads the Checkout screen.
2. This key is sent with every Place Order request for this checkout session.
3. Backend checks: if an order exists with this idempotency key and was created within 60 seconds, return the existing order ID (HTTP 200).
4. If the order is in a terminal failure state, return an error.
5. Client navigates to Order Success with the existing order ID.

---

### FEATURE: ORDER SUCCESS HANDLING

**Trigger:** Successful order creation response received.

**System Behaviour:**
1. Navigate to Order Success screen, passing the created order ID.
2. Display order ID, estimated delivery message, and brief summary.
3. Provide "Track Order" CTA linking to order detail, and "Continue Shopping" CTA returning to Home.
4. TanStack Query cache for orders list is invalidated.

---

### FEATURE: ORDER LIST LOADING

**Trigger:** Orders screen mounts.

**System Behaviour:**
1. Fetch orders for authenticated customer; sorted by `created_at` DESC; paginated (20 per page).
2. Display order cards: order ID, date, status badge, item count, order total.

**Empty State:** "You have no orders yet." with Browse Medicines CTA.

**Error State:** Retry button.

---

### FEATURE: ORDER DETAILS LOADING

**Trigger:** User taps an order card.

**System Behaviour:**
1. Navigate to Order Detail screen with order ID.
2. Fetch full order: header, items (with price snapshots), delivery address, timeline.
3. Show "Cancel Order" button if order is in `pending` or `confirmed` status.

---

### FEATURE: ORDER TIMELINE

**System Behaviour:**
1. Load `order_status_history` records for the order, sorted by `created_at` ASC.
2. Display each status transition as a timeline step with label and timestamp.
3. Current status is highlighted/active.
4. Completed steps shown in a "done" style.

---

### FEATURE: CUSTOMER ORDER CANCELLATION

**Trigger:** User taps "Cancel Order" and confirms.

**Preconditions:** Order status is `pending` or `confirmed`.

**System Behaviour:**
1. Show confirmation dialog: "Are you sure you want to cancel this order?"
2. On confirm, disable button; show spinner.
3. Send POST to cancel endpoint with order ID.
4. Backend validates: order belongs to customer; status is cancellable.
5. Backend cancels order; restores inventory; creates status history record.
6. Refresh order detail; show updated status.

**Failure Behaviour:** Toast with reason. Cancel button re-enabled if eligible.

---

### FEATURE: REORDER

**Trigger:** User taps "Reorder" on a past order.

**System Behaviour:**
1. Show spinner on Reorder button.
2. Fetch original order items.
3. For each item, check current availability (active, in stock).
4. Add available items to cart (POST cart_item for each).
5. If some items unavailable, show dialog: "X items added to cart. Y items are unavailable: [list]."
6. Navigate to Cart.

**Failure Behaviour:** If all items unavailable, show: "None of the items in this order are currently available." No navigation to Cart.

---

### FEATURE: PROFILE LOADING AND UPDATE

**Trigger:** Profile screen mounts; user submits edit form.

**System Behaviour:**
1. Load customer row from `customers` table.
2. Display name, email, phone (read-only).
3. On edit submit: validate name (2–100 chars); validate email (valid format if provided).
4. PATCH to backend; update `customers` row.
5. Show success toast.

---

### FEATURE: NOTIFICATION LOADING AND READ STATUS

**Trigger:** Notifications screen mounts; user taps a notification.

**System Behaviour:**
1. Fetch notifications for authenticated customer (own + broadcast).
2. Display list sorted by `created_at` DESC.
3. Unread notifications indicated with visual badge.
4. On tap, navigate to notification detail; PATCH to backend to create/update `notification_reads` record.
5. Notification list badge count decremented.

---

### FEATURE: HELP AND SUPPORT ACTIONS

**Trigger:** User taps a contact option.

**System Behaviour:**
1. Phone: open `tel:` URI using support phone number from `app_configuration`.
2. Email: open `mailto:` URI using support email.
3. WhatsApp: open WhatsApp deep link using support WhatsApp number.

---

---

## Admin Features

---

### FEATURE: ADMIN LOGIN

**Trigger:** Admin submits email/password form.

**System Behaviour:**
1. Validate email format and non-empty password on client.
2. Send to Supabase Auth `signInWithPassword`.
3. On success, decode JWT; verify role claim is `admin` or `super_admin`.
4. If role claim absent or invalid, sign out immediately and show: "Your account does not have admin access."
5. Navigate to Dashboard.

**Failure Behaviour:** "Invalid email or password." / "Account disabled."

---

### FEATURE: ADMIN DASHBOARD LOADING

**Trigger:** Dashboard mounts.

**System Behaviour:**
1. Send parallel queries:
   - Total orders today (count where `created_at >= today start`).
   - Pending orders count.
   - Total active customers count.
   - Low stock medicines count (`inventory.quantity <= low_stock_threshold`).
   - Revenue today (sum of `total_amount` for `delivered` orders created today).
2. Display metric cards with real values.

**Loading Behaviour:** Per-card skeleton.

**Error Behaviour:** Per-card error indicator with retry.

---

### FEATURE: ADMIN PRODUCT CREATION

**Trigger:** Admin submits the New Medicine form.

**Preconditions:** Admin has `admin` or `super_admin` role.

**System Behaviour:**
1. Validate all required fields: name, MRP, selling price, category, brand.
2. Validate selling_price ≤ MRP.
3. Upload medicine images to Supabase Storage; get public URLs.
4. Insert medicine row with `is_active = false` by default (admin must explicitly activate).
5. Insert initial inventory row with quantity from form (0 if not specified).
6. Log to `admin_activity_logs`: action `medicine_created`, entity_id = new medicine ID.

**Success Feedback:** Toast: "Medicine created successfully." Navigate to medicine detail/edit page.

**Failure Behaviour:** Per-field validation errors; save failure toast. Images already uploaded are cleaned up on failure.

---

### FEATURE: ADMIN PRODUCT EDITING

**Trigger:** Admin submits edited medicine form.

**System Behaviour:**
1. Validate fields as per creation rules.
2. PATCH medicine row.
3. If images changed, upload new images; optionally delete removed image files from Supabase Storage.
4. Log to `admin_activity_logs`: action `medicine_updated`, payload summary includes changed fields.

---

### FEATURE: ADMIN PRODUCT ACTIVATION / DEACTIVATION

**Trigger:** Admin taps Activate or Deactivate toggle.

**System Behaviour:**
1. Confirm action in dialog.
2. PATCH `medicines.is_active` to `true` or `false`.
3. Log action.
4. Active medicines immediately visible to customers; inactive immediately hidden.

---

### FEATURE: ADMIN PRODUCT ARCHIVE BEHAVIOUR

**Trigger:** Admin taps "Archive" on a medicine.

**Preconditions:** Medicine must be inactive (`is_active = false`) before archiving.

**System Behaviour:**
1. Display warning: "Archived medicines cannot be reactivated. Are you sure?"
2. On confirm, PATCH `medicines.is_archived = true`, `is_active = false`.
3. Medicine no longer visible to customers; no longer purchasable.
4. Existing orders containing this medicine are unaffected (they reference snapshots).
5. Log action.

---

### FEATURE: ADMIN INVENTORY ADJUSTMENT

**Trigger:** Admin submits inventory adjustment form.

**Preconditions:** Admin selects adjustment type (add / reduce / correct) and enters amount and reason.

**System Behaviour:**
1. Validate: amount > 0; reason non-empty.
2. For `reduce` or `correct` to a lower value: verify resulting quantity ≥ 0.
3. Send to backend Edge Function.
4. Backend updates `inventory.quantity` and inserts `inventory_transactions` record.
5. Log to `admin_activity_logs`.

**Failure Behaviour:** "Adjustment would result in negative stock. Current stock: X." form error.

---

### FEATURE: ADMIN ORDER STATUS UPDATE

**Trigger:** Admin taps a status update action (e.g., "Confirm", "Mark Processing").

**Preconditions:** The transition is valid per the transition matrix.

**System Behaviour:**
1. Validate current status → target status transition.
2. If invalid, return error: "Cannot transition from [current] to [target]."
3. If valid, PATCH `orders.status`.
4. Insert `order_status_history` record.
5. Log to `admin_activity_logs`.
6. Update order detail page with new status.

---

### FEATURE: INVALID ORDER STATUS TRANSITION

**Trigger:** Admin attempts an invalid status transition.

**System Behaviour:**
1. Backend rejects the request with HTTP 422.
2. Error message: "Invalid status transition: cannot move from [status] to [status]."
3. Order status remains unchanged.
4. Admin is shown the error inline.
5. No `order_status_history` record created.
6. Action logged to `admin_activity_logs` as a failed attempt.

---

### FEATURE: ADMIN ORDER CANCELLATION

**Trigger:** Admin taps "Cancel Order" and provides a reason.

**Preconditions:** Order status is `pending`, `confirmed`, `processing`, or `packed`.

**System Behaviour:**
1. Require cancellation reason from admin (text input).
2. PATCH order status to `cancelled`.
3. Restore inventory for each order item.
4. Create `inventory_transactions` records for restoration.
5. If coupon was applied, decrement `coupon_usages`.
6. Insert `order_status_history` record.
7. Log to `admin_activity_logs` with reason.

---

### FEATURE: ADMIN CUSTOMER BLOCK

**Trigger:** Admin taps "Block" on a customer record and confirms.

**Preconditions:** Admin has permission; customer is not already blocked.

**System Behaviour:**
1. Require block reason from admin.
2. PATCH `customers.is_blocked = true`, store reason.
3. Immediately invalidate any active session for the blocked customer (Supabase Auth: revoke session or set custom claim).
4. Log to `admin_activity_logs`.

**Result:** Blocked customer cannot log in; existing sessions receive 401 on next request.

---

### FEATURE: ADMIN CUSTOMER UNBLOCK

**Trigger:** Admin taps "Unblock" on a blocked customer.

**System Behaviour:**
1. PATCH `customers.is_blocked = false`, clear block reason.
2. Log to `admin_activity_logs`.
3. Customer can log in again immediately.

---

### FEATURE: BANNER CREATION

**Trigger:** Admin submits New Banner form.

**System Behaviour:**
1. Validate: image required; sort order unique.
2. Upload image to Supabase Storage.
3. Insert `banners` row with `is_active = false` by default.
4. Admin must explicitly activate or schedule.
5. Log action.

---

### FEATURE: BANNER SCHEDULING

**Trigger:** Admin sets `start_date` and `end_date` on a banner.

**System Behaviour:**
1. Backend evaluates banner visibility: `is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now())`.
2. Banners outside the date window are not shown to customers even if `is_active = true`.
3. No cron job required; visibility is evaluated at query time.

---

### FEATURE: COUPON CREATION

**Trigger:** Admin submits New Coupon form.

**System Behaviour:**
1. Validate code uniqueness.
2. Validate discount type is `percentage` or `fixed`.
3. If `percentage`, validate value is 1–100.
4. If `fixed`, validate value > 0.
5. Insert `coupons` row with `is_active = false` by default.
6. Log action.

---

### FEATURE: ADMIN NOTIFICATION CREATION AND SENDING

**Trigger:** Admin submits notification compose form and taps "Send".

**System Behaviour:**
1. Validate title and body non-empty.
2. Select target: `all` (broadcast) or specific customer (by ID).
3. Insert `notifications` row(s) into database.
4. Trigger push notification dispatch via Supabase Edge Function (if push configured).
5. Set `sent_at` timestamp.
6. Log action.

**Failure Behaviour:** If push dispatch fails, the in-app notification record is still created. Log push failure. Toast: "Notification saved but push delivery failed."

---

### FEATURE: ADMIN ROLE ASSIGNMENT

**Trigger:** Super Admin changes an admin user's role.

**Preconditions:** Actor has `super_admin` role.

**System Behaviour:**
1. Validate new role is `admin` or `super_admin`.
2. PATCH `admin_users.role`.
3. Update Supabase Auth custom claim for the user.
4. Log to `admin_activity_logs` with previous and new role.

---

### FEATURE: ADMIN ACTIVITY LOGGING

**Trigger:** Every mutating admin action (create, update, delete, status change, role change, block/unblock).

**System Behaviour:**
1. After the primary operation succeeds, insert `admin_activity_logs` row.
2. If log insertion fails, the primary operation is NOT rolled back. Log failure silently to Supabase function logs.
3. Log record contains: `admin_user_id`, `action_type` (e.g., `medicine_created`), `entity_type`, `entity_id`, `payload_summary` (JSON diff or key changed fields), `ip_address`, `timestamp`.
4. Logs are append-only; no update or delete operations are permitted on this table.

---

### FEATURE: APP SETTINGS UPDATE

**Trigger:** Super Admin submits the configuration form.

**Preconditions:** Actor has `super_admin` role.

**System Behaviour:**
1. Validate all numeric fields are non-negative.
2. PATCH `app_configuration` row.
3. Changes take effect on next request (no caching layer in v1).
4. Log action.
