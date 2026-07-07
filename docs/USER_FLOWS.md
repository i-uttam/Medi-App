# User Flows — Online Pharmacy Platform (Customer)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-07  

---

## How to Read This Document

Each flow documents:
- **Entry Point** — where the flow begins
- **Steps** — numbered, sequential actions
- **Decision Points** — conditions that branch the flow
- **Success Destination** — where the user lands on success
- **Failure Destination** — where the user lands on failure
- **Recovery Behaviour** — how the user recovers from failure

---

## Flow 1: First App Launch

**Entry Point:** App icon tapped for the first time.

**Steps:**
1. App loads; splash screen displayed.
2. System checks SecureStore for session token.
3. No token found.
4. Navigate to Login screen.

**Decision Points:**
- Token present? → No → Login screen.

**Success Destination:** Login screen.

**Failure Destination:** Login screen (same destination; splash error is silent).

**Recovery Behaviour:** N/A.

---

## Flow 2: New User Registration

**Entry Point:** Login screen — no existing account.

**Steps:**
1. User enters mobile number and taps "Send OTP".
2. System validates phone format.
3. System sends OTP via Supabase Auth SMS.
4. OTP entry screen displayed with 60-second countdown.
5. User enters 6-digit OTP and taps "Verify".
6. System verifies OTP.
7. System checks `customers` table for profile row.
8. No profile found → navigate to Profile Setup screen.
9. User enters name (required) and email (optional).
10. User taps "Save".
11. System creates `customers` row.
12. Navigate to Home screen.

**Decision Points:**
- Valid phone format? → No → show "Please enter a valid mobile number."
- OTP send success? → No → show error; re-enable button.
- OTP correct? → No → show "Incorrect OTP. X attempts remaining."
- OTP expired? → show "OTP has expired. Please request a new one." → return to step 1.
- Profile row exists? → Yes → Flow 3 (Existing User Login) from step 7.

**Success Destination:** Home screen.

**Failure Destination:**
- Invalid phone: stays on Login screen.
- OTP failure: stays on OTP screen.
- Profile save failure: stays on Profile Setup with error toast.

**Recovery Behaviour:**
- OTP resend: available after 60-second countdown.
- Profile save failure: form remains populated; user can retry.

---

## Flow 3: Existing User Login

**Entry Point:** Login screen — existing account.

**Steps:**
1. User enters mobile number and taps "Send OTP".
2. OTP sent and entered (steps 1–7 from Flow 2).
3. System finds existing `customers` row.
4. Navigate to Home screen.

**Decision Points:**
- Account blocked? → show "Your account has been disabled. Please contact support." → no navigation.

**Success Destination:** Home screen.

**Failure Destination:** Login screen on repeated failure.

**Recovery Behaviour:** Contact support for blocked account.

---

## Flow 4: Browse Medicine

**Entry Point:** Home screen or Categories tab.

**Steps:**
1. User is on Home screen.
2. User sees featured medicine section.
3. User taps a medicine card.
4. Medicine Detail screen loads.
5. User reads medicine details.

**Decision Points:**
- Medicine active? → No → show "Product no longer available."

**Success Destination:** Medicine Detail screen.

**Failure Destination:** Medicine Detail error state with retry option.

**Recovery Behaviour:** Retry button on load error; back button to return to listing.

---

## Flow 5: Search Medicine

**Entry Point:** Search icon tapped from any main screen.

**Steps:**
1. Search screen displayed; keyboard opens on search bar.
2. Recent searches shown (if any).
3. User types query (≥ 2 characters).
4. System debounces 300ms; sends search request.
5. Results displayed as paginated list.
6. User applies optional filters or sort.
7. User taps a medicine card.
8. Navigate to Medicine Detail screen.

**Decision Points:**
- Query < 2 characters? → show recent searches, no search request sent.
- No results? → show "No results for [query]."
- Search API error? → show error with retry.

**Success Destination:** Medicine Detail screen.

**Failure Destination:** Error state with retry.

**Recovery Behaviour:** Retry button; modify search query.

---

## Flow 6: Browse by Category

**Entry Point:** Categories section on Home or dedicated Categories tab.

**Steps:**
1. User taps a category card.
2. Category medicine listing loads with category name as header.
3. Results paginated; user scrolls to load more.
4. User applies optional filters within the category.
5. User taps a medicine card.
6. Navigate to Medicine Detail screen.

**Decision Points:**
- Category has no active medicines? → show "No medicines in this category."

**Success Destination:** Medicine Detail screen.

**Failure Destination:** Category listing error state.

**Recovery Behaviour:** Retry; navigate back.

---

## Flow 7: View Medicine Details

**Entry Point:** Any medicine card (Home, category, search result).

**Steps:**
1. User taps medicine card.
2. Medicine Detail screen loads.
3. System records product view in `recently_viewed`.
4. Full details shown: images, name, composition, manufacturer, brand, MRP, selling price, discount, stock status.
5. Cart quantity controls shown if item in cart; "Add to Cart" shown if not.

**Decision Points:**
- Medicine inactive or archived? → show "Product no longer available." Cart actions disabled.
- Medicine out of stock? → show "Out of stock" badge; Add to Cart disabled.

**Success Destination:** User views full medicine detail.

**Failure Destination:** Error state: "Unable to load product."

**Recovery Behaviour:** Retry button; back navigation.

---

## Flow 8: Add Medicine to Cart

**Entry Point:** Medicine Detail screen or medicine card on listing.

**Steps:**
1. User taps "Add to Cart".
2. Button disabled; spinner shown.
3. System validates product availability and stock.
4. Cart item created (or incremented) on backend.
5. Cart query invalidated; cart badge updated.
6. "Add to Cart" replaced with quantity controls (− 1 +).

**Decision Points:**
- Product inactive/out of stock? → show appropriate error message; button re-enabled.
- Network error? → show network error; button re-enabled.

**Success Destination:** Quantity controls displayed on the same screen.

**Failure Destination:** Error toast; button restored.

**Recovery Behaviour:** User can retry after resolving the issue.

---

## Flow 9: Modify Cart

**Entry Point:** Cart screen.

**Steps:**
1. User navigates to Cart tab.
2. Cart loads with all items, prices, and stock validation.
3. User taps "+" to increase quantity.
4. User taps "−" to decrease quantity; if quantity reaches 0, item is removed.
5. User taps trash icon to remove item directly (with confirmation).
6. Totals update after each action.

**Decision Points:**
- Item out of stock? → flagged with warning; checkout blocked.
- Item inactive/archived? → flagged as unavailable; checkout blocked.
- Cart empty after modifications? → empty cart state shown.

**Success Destination:** Cart updated; proceed to checkout when ready.

**Failure Destination:** Per-item error toast; UI restored on failure.

**Recovery Behaviour:** Retry individual actions; remove problematic items.

---

## Flow 10: Add First Address

**Entry Point:** Addresses screen or triggered from Checkout when no addresses exist.

**Steps:**
1. User taps "Add New Address".
2. Address form displayed.
3. User fills: label, full name, phone, address line 1, city, state, postal code.
4. User taps "Save".
5. System validates all fields.
6. Address saved; set as default (first address always default).
7. Address list updated.

**Decision Points:**
- Validation failure? → per-field error messages; form not submitted.
- Save API failure? → toast error; form remains populated.

**Success Destination:** Address list with new address shown as default.

**Failure Destination:** Address form with validation errors.

**Recovery Behaviour:** Fix validation errors and retry.

---

## Flow 11: Select Existing Address (at Checkout)

**Entry Point:** Checkout screen.

**Steps:**
1. Checkout screen shows pre-selected default address.
2. User taps "Change Address".
3. Address selection list shown.
4. User taps an address card to select it.
5. Selected address highlighted; checkout screen updated.

**Decision Points:**
- No saved addresses? → prompt to add a new address.
- User taps "Add New Address" from within the selector? → open Add Address form; on save, return to address selector.

**CRITICAL:** Tapping the address card selects it. It does not open edit mode.

**Success Destination:** Checkout with selected address.

**Failure Destination:** N/A (address selection is a client-side operation at this step).

---

## Flow 12: Apply Coupon

**Entry Point:** Checkout screen.

**Steps:**
1. User taps the coupon code input field.
2. User types coupon code.
3. User taps "Apply".
4. Apply button disabled; inline spinner shown.
5. Backend validates coupon.
6. If valid, coupon name and discount amount displayed; total updated.
7. If invalid, inline error message shown.

**Decision Points:**
- Coupon valid? → discount applied to checkout total.
- Coupon invalid (any reason)? → show specific error message.

**Success Destination:** Checkout with coupon discount applied.

**Failure Destination:** Inline error; Apply button re-enabled.

**Recovery Behaviour:** User corrects code or removes coupon.

---

## Flow 13: Checkout

**Entry Point:** Cart screen — "Proceed to Checkout" button.

**Steps:**
1. Verify all cart items are available (cart validation check).
2. Navigate to Checkout screen.
3. Prices refreshed from backend.
4. Default address pre-selected (or user prompted to select).
5. COD payment method shown (pre-selected; no alternatives in this version).
6. Optional: apply coupon.
7. Review order summary: items, subtotal, delivery charge, coupon discount, total.
8. Verify minimum order value is met.
9. User taps "Place Order".

**Decision Points:**
- Cart items unavailable? → show warnings; block checkout until resolved.
- No address selected? → disable Place Order; prompt to select/add address.
- Minimum order value not met? → show required amount; disable Place Order.

**Success Destination:** Flow 14 (Place Order) or Flow 15 (Cash on Delivery order).

**Failure Destination:** Checkout screen with error states.

**Recovery Behaviour:** Resolve cart issues, add address, adjust cart to meet minimum.

---

## Flow 14 & 15: Cash on Delivery Order / Successful Order

**Entry Point:** Checkout screen — user taps "Place Order".

**Steps:**
1. "Place Order" button disabled; "Placing Order..." spinner shown.
2. Idempotency key sent with request.
3. Backend executes atomic order creation (see PRD Section 9.1).
4. Success response received with order object.
5. Navigate to Order Success screen.
6. Order ID displayed; "Track Order" and "Continue Shopping" CTAs shown.
7. Cart badge count resets to 0.

**Decision Points:**
- Backend returns stock error? → navigate back to Checkout/Cart with specific error.
- Backend returns coupon error? → navigate back to Checkout with coupon error.
- Network timeout? → poll for order status using idempotency key for up to 30 seconds.

**Success Destination:** Order Success screen.

**Failure Destination:** Checkout screen with error toast.

**Recovery Behaviour:** For timeout: advise user to check Orders page. For other errors: specific guidance shown.

---

## Flow 16: Failed Order Creation

**Entry Point:** "Place Order" tapped; backend returns error.

**Steps:**
1. Backend returns specific error.
2. "Place Order" button re-enabled (after appropriate delay).
3. Error presented to user with actionable guidance.

**Error → Message Mapping:**

| Error Cause | Message Shown |
|-------------|--------------|
| Stock insufficient | "Some items are out of stock. Please review your cart." |
| Product inactive | "Some products are no longer available. Please review your cart." |
| Price changed (increased) | "Prices have changed. Please review your cart." |
| Coupon invalid | "The applied coupon is no longer valid. Please remove it and try again." |
| Address invalid | "Selected delivery address is invalid. Please choose another." |
| Minimum order not met | "Your order does not meet the minimum order value of ₹X." |
| Unknown server error | "Something went wrong. Please try again." |

**Recovery Behaviour:** User is returned to Checkout or Cart to resolve the specific issue.

---

## Flow 17: Duplicate Place Order Attempt

**Entry Point:** User taps "Place Order" a second time (e.g., after thinking the first tap failed).

**Scenario A — Client-side prevention:**
1. Button was already disabled after first tap.
2. Second tap is ignored.

**Scenario B — Network retry from the same Checkout session:**
1. User experiences a network error but does not leave the Checkout screen.
2. The UUID idempotency key is still in checkout session state (it was set when the Checkout screen first loaded).
3. User taps "Place Order" again (button was re-enabled after the failure).
4. The same idempotency key is sent in `X-Idempotency-Key`.
5. If the first request had already created the order: backend returns the existing order ID (HTTP 200); navigate to Order Success.
6. If the first request never reached the backend: order creation proceeds normally.

**Scenario C — App restart after app kill during checkout:**
1. User force-closes app and re-opens; navigates to Checkout.
2. Checkout session state is lost; a new UUID idempotency key is generated.
3. Customer checks Orders page to see if an order was previously placed.

**Recovery Behaviour:** User directed to Orders page if uncertain whether order was placed.

---

## Flow 18: View Order History

**Entry Point:** Orders tab.

**Steps:**
1. Orders screen loads; shows paginated order cards.
2. Each card: order ID, date placed, status badge, number of items, order total.
3. User scrolls to paginate.

**Decision Points:**
- No orders? → "You have no orders yet." with Browse Medicines CTA.

**Success Destination:** Order list populated.

**Failure Destination:** Error state with retry.

---

## Flow 19: Track Order

**Entry Point:** Order list card → tapped → Order Detail screen.

**Steps:**
1. Order Detail screen loads.
2. Order header: ID, date, total, payment method.
3. Delivery address section.
4. Order items section with price snapshots.
5. Order timeline showing all status transitions with timestamps.
6. Current status highlighted.
7. Cancel button shown if status is `pending` or `confirmed`.

**Decision Points:**
- Order in cancellable status? → show Cancel button.
- Order delivered? → timeline complete; no further actions available.

**Success Destination:** Full order detail and timeline displayed.

**Failure Destination:** Error state: "Unable to load order details."

**Recovery Behaviour:** Retry; back to order list.

---

## Flow 20: Cancel Eligible Order

**Entry Point:** Order Detail screen — Cancel Order button.

**Steps:**
1. User taps "Cancel Order".
2. Confirmation dialog: "Are you sure you want to cancel this order? This action cannot be undone."
3. User taps "Yes, Cancel Order".
4. Cancel button shows spinner; disabled.
5. Backend validates eligibility and cancels order.
6. Inventory restored; status history updated.
7. Order Detail refreshed; status shows "Cancelled".
8. Success toast shown.

**Decision Points:**
- Order no longer in cancellable status (race condition)? → error: "This order can no longer be cancelled."
- User taps "No" in dialog? → dialog dismissed; no action.

**Success Destination:** Order Detail with "Cancelled" status.

**Failure Destination:** Error toast; Cancel button re-enabled.

**Recovery Behaviour:** If cancelled too late, contact support (shown in error message).

---

## Flow 21: Reorder

**Entry Point:** Order Detail screen — "Reorder" button.

**Steps:**
1. User taps "Reorder".
2. Spinner shown on Reorder button.
3. System fetches original order items.
4. System checks availability of each item.
5. Available items added to cart.
6. If some items unavailable, dialog: "X items added to cart. Y items are no longer available: [list]."
7. User taps "View Cart" or "Continue".
8. Navigate to Cart screen.

**Decision Points:**
- All items available? → navigate to Cart silently.
- Some items unavailable? → show partial availability dialog.
- All items unavailable? → show: "None of the items in this order are currently available." No Cart navigation.

**Success Destination:** Cart screen with items added.

**Failure Destination:** Toast with error; Reorder button re-enabled.

**Recovery Behaviour:** Remove unavailable items from Cart; adjust quantities.

---

## Flow 22: Edit Profile

**Entry Point:** Profile screen — Edit icon or "Edit Profile" button.

**Steps:**
1. Profile form pre-filled with current name and email.
2. Phone number shown as read-only.
3. User edits name and/or email.
4. User taps "Save".
5. System validates: name 2–100 chars; email valid format (if provided).
6. PATCH request to backend.
7. Success toast; profile data updated.

**Decision Points:**
- Name too short or too long? → inline validation error.
- Email invalid format? → inline validation error.
- Save API failure? → toast error; form remains populated.

**Success Destination:** Profile screen with updated data.

**Failure Destination:** Form with validation errors.

**Recovery Behaviour:** Fix field errors; retry save.

---

## Flow 23: Manage Addresses

**Entry Point:** Profile screen → "My Addresses".

**Steps:**
1. Address list loads.
2. User can:
   - Tap "Add New Address" → Flow 10.
   - Tap "Edit" icon on an address → Edit address form pre-filled (CRITICAL: edit mode only via explicit Edit button).
   - Tap delete icon → confirmation dialog → delete.
   - Tap "Set as Default" → default updated.

**Decision Points:**
- Deleting default address with other addresses present? → next address becomes default.
- Deleting only address? → address deleted; empty state shown.

**Success Destination:** Updated address list.

**Failure Destination:** Per-action toast errors.

**Recovery Behaviour:** Retry failed operations.

---

## Flow 24: Read Notifications

**Entry Point:** Notifications icon in navigation (shows unread badge count).

**Steps:**
1. Notifications screen loads; sorted newest-first.
2. Unread items shown with visual indicator.
3. User taps a notification.
4. Full notification content displayed.
5. Notification marked as read on backend.
6. Unread badge count decremented.

**Decision Points:**
- No notifications? → "No notifications yet."

**Success Destination:** Notification detail view.

**Failure Destination:** Error state with retry.

---

## Flow 25: Contact Support

**Entry Point:** Help & Support screen.

**Steps:**
1. User views available contact options: phone, email, WhatsApp.
2. Support contact details loaded from `app_configuration`.
3. User taps preferred contact method.
4. Native handler opens (dialer, email app, WhatsApp).

**Decision Points:**
- Native handler unavailable (no WhatsApp installed)? → show "WhatsApp is not installed on your device."
- Configuration not loaded? → show fallback default contact or "Support information unavailable."

**Success Destination:** Native handler opened.

**Failure Destination:** Error message; suggest alternative contact method.

---

## Flow 26: Logout

**Entry Point:** Profile screen → "Logout".

**Steps:**
1. Confirmation dialog: "Are you sure you want to log out?"
2. User taps "Logout".
3. Supabase Auth `signOut` called.
4. Session token cleared from SecureStore.
5. TanStack Query cache cleared.
6. Zustand store reset.
7. Navigate to Login screen.

**Decision Points:**
- User taps "Cancel" in dialog? → dismissed; no action.
- `signOut` API fails? → clear local state regardless; navigate to Login.

**Success Destination:** Login screen.

**Failure Destination:** Login screen (even on API failure, local session is cleared).

---

## Flow 27: Delete Account

**Entry Point:** Profile → Settings → "Delete My Account".

**Steps:**
1. User taps "Delete My Account".
2. Warning screen: explains consequences (all data will be deleted, action is irreversible).
3. System checks for active orders.
4. If active orders exist: "You have X active orders. Please wait for them to complete or cancel them before deleting your account." Flow ends.
5. User taps "Permanently Delete Account".
6. Final confirmation dialog.
7. User confirms.
8. Backend soft-deletes account and anonymises PII.
9. Supabase Auth user deleted.
10. Local session cleared.
11. Navigate to Login screen.

**Decision Points:**
- Active orders present? → block deletion; show message.
- User cancels at any confirmation? → dismissed; account unchanged.
- Backend deletion fails? → error toast; account unchanged.

**Success Destination:** Login screen.

**Failure Destination:** Settings screen with error toast.

**Recovery Behaviour:** Cancel active orders first, then retry deletion.
