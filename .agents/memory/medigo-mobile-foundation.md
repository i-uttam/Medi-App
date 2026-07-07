---
name: MediGo Mobile App Foundation
description: Architecture decisions and gotchas from building the Step 4 customer app UI/UX foundation (Expo, design system, screens, stores).
---

## What was built
- `artifacts/customer-app` — Expo SDK 54 / React Native 0.81 mobile app
- 7 infrastructure files: `constants/theme.ts`, `constants/colors.ts`, `lib/supabase.ts`, `lib/money.ts`, `lib/errors.ts`, `stores/cart.ts`, `stores/toast.ts`
- 25+ UI components across `components/ui/` and `components/cards/`
- 4 layout containers in `components/layout/Screen.tsx`
- 19 screens (auth, tabs, stack routes)

## Key architecture decisions

**State management:**
- Cart: Zustand v5 + AsyncStorage persist (`stores/cart.ts`) — `medigo-cart-v1` storage key
- Toast: Zustand in-memory (`stores/toast.ts`) — no persistence needed
- Server data: TanStack Query v5 (mutations retry=0 — avoids duplicate commerce ops)

**Color tokens:**
- All colors via `useColors()` hook → `constants/colors.ts` (light mode only, dark mode pending)
- Primary: `#0A7EA4` (deep medical teal), background: `#F7F8FA`
- NEVER hardcode hex values in components — code review will fail

**Tab navigation pattern:**
- `isLiquidGlassAvailable()` from `expo-glass-effect` → NativeTabs (iOS 26+)
- Fallback: Classic Tabs with BlurView (iOS) / solid (Android/web)
- Web tab bar height: 84; top content needs 67px padding on web

**Address card UX (critical):**
- `AddressCard.onPress` = SELECT the address
- `AddressCard.onEdit` = EDIT (separate explicit action, propagation stopped)
- These must NEVER be conflated — spec requirement

**Order safety:**
- Checkout screen has NO direct Supabase INSERT to orders table
- Place Order is blocked pending `create_order` secure RPC (migration 023)

**Forms:**
- Address create/edit: `react-hook-form` v7 + Zod + `@hookform/resolvers`
- Address type chips use `accessibilityRole="radio"` + `accessibilityState={{ checked }}`

## Packages added in Step 4
```
zustand @supabase/supabase-js react-hook-form @hookform/resolvers
```
All added as `devDependencies` (Expo monorepo convention).

## Supabase client
- Requires `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` Replit Secrets
- Gracefully warns in `__DEV__` if missing — app works without them for UI shell
- NEVER use service role key in mobile client

## Money
- All prices stored/received as paise (integers)
- `lib/money.ts`: `formatPaise()`, `formatRupees()`, `discountPercent()`
- INR locale: `Intl.NumberFormat('en-IN', { currency: 'INR' })`

## Known web renderer warnings (non-blocking)
- `"shadow*" style props deprecated` — RN web renderer; native shadow props used for iOS/Android; can address with Platform-specific boxShadow if needed
- `useNativeDriver` fixed with `Platform.OS !== 'web'` check in Skeleton

## What's pending for next steps
- Supabase env vars (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- Real auth flow (phone OTP via Supabase)
- Data queries (categories, products, orders via RLS-protected RPC)
- Push notifications (expo-notifications + Supabase)
- App icon is at `assets/images/icon.png` (generated teal medical cross)

**Why:** These decisions follow the pharmacy platform build spec and established Expo monorepo conventions. Future steps should not introduce new state libraries without updating this document.
