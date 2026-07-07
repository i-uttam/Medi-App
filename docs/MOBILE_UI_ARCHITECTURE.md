# MediGo — Mobile UI Architecture

> Generated during Step 4: Customer mobile application foundation.

## Inspection findings

No existing Expo artifact was found. This document describes the architecture established from scratch.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 54 (React Native 0.81) | Pre-configured via `artifacts/customer-app/` |
| Routing | Expo Router v6 (file-based) | Full typed routes, group-based layout |
| State — server | TanStack Query v5 | Queries and mutations, retry=0 for mutations |
| State — local | Zustand v5 + AsyncStorage persistence | Cart (`stores/cart.ts`) and Toast (`stores/toast.ts`) |
| Forms | React Hook Form v7 + Zod + @hookform/resolvers | Address create/edit forms |
| Supabase client | `@supabase/supabase-js` v2 | AsyncStorage session persistence, `EXPO_PUBLIC_` vars only |
| Styling | React Native StyleSheet | Design tokens via `constants/theme.ts`, colors via `useColors()` |
| Icons | `@expo/vector-icons` (Feather, Ionicons, SF Symbols) | Never emoji |
| Typography | Inter (400/500/600/700 via `@expo-google-fonts/inter`) | Pre-loaded, SplashScreen gated |
| Keyboard | `react-native-keyboard-controller` + `KeyboardAwareScrollViewCompat` | Consistent iOS/Android |
| Safe areas | `react-native-safe-area-context` + `useSafeAreaInsets()` | No hardcoded top/bottom padding |
| Tabs | `isLiquidGlassAvailable()` → NativeTabs (iOS 26+) or ClassicTabs | Liquid glass on iOS 26, BlurView fallback |
| Images | `expo-image` | Optimized, supports CDN caching |

## Design tokens

All in `constants/theme.ts`:

- `SPACING` — 4/8/12/16/20/24/32/40/48 scale
- `RADIUS` — sm(4)/md(8)/lg(12)/xl(16)/full
- `FONT_SIZE` — display(32) through tiny(11)
- `FONT_WEIGHT` — regular/medium/semibold/bold
- `FONT_FAMILY` — Inter weight mappings
- `ICON_SIZE` — xs through 2xl
- `CONTROL_HEIGHT` — sm(36)/md(44)/lg(52)
- `LAYOUT` — screen padding, card widths, header/tab heights
- `Z_INDEX` — layering: base→card→header→modal→toast
- `SHADOWS` — sm/md preset shadow objects

Color tokens in `constants/colors.ts`, consumed via `useColors()` hook.

## Color system

Healthcare-oriented medical teal palette:

| Token | Value | Purpose |
|---|---|---|
| `primary` | `#0A7EA4` | Main brand, buttons, links |
| `primaryDark` | `#065F7D` | High-emphasis states |
| `primarySoft` | `#E8F5FA` | Soft backgrounds, chips |
| `background` | `#F7F8FA` | Screen background |
| `surface` | `#FFFFFF` | Cards, sheets, header |
| `foreground` | `#1A1D23` | Primary text |
| `textSecondary` | `#4B5563` | Supporting text |
| `mutedForeground` | `#9CA3AF` | Placeholder, captions |
| `border` | `#E5E7EB` | Dividers, card outlines |
| `success` | `#16A34A` | Delivered, confirmed |
| `warning` | `#D97706` | Pending, attention |
| `error` | `#DC2626` | Failed, cancelled |
| `info` | `#2563EB` | Processing, notices |

## Route structure

```
app/
  _layout.tsx              Root layout — providers (SafeArea, QueryClient, GestureHandler, Keyboard)
  (auth)/
    _layout.tsx            Auth stack (no header)
    login.tsx              Phone number entry + India +91 prefix
    verify-otp.tsx         6-digit OTP input + resend timer
  (tabs)/
    _layout.tsx            Bottom tab bar (NativeTabs / ClassicTabs)
    index.tsx              Home — delivery header, search, banners, categories, products
    categories.tsx         Category grid
    orders.tsx             Order history list
    profile.tsx            Account management + menu rows
  search/
    index.tsx              Search — multiple states (initial/typing/loading/results/empty/error)
  category/
    [id].tsx               Category product list with filter/sort foundation
  product/
    [id].tsx               Product detail + sticky add-to-cart
  cart/
    index.tsx              Cart items + price summary + checkout CTA
  addresses/
    index.tsx              Saved addresses list (select ≠ edit)
    create.tsx             Create address — RHF + Zod form
    [id]/
      edit.tsx             Edit address — RHF + Zod form
  checkout/
    index.tsx              Checkout shell (Place Order pending secure engine)
  order/
    success.tsx            Order success (gestureEnabled: false)
    [id].tsx               Order detail + status timeline
  notifications/
    index.tsx              Notification list
  profile/
    edit.tsx               Edit profile (name, email)
  support/
    index.tsx              Help & Support (contact from app_settings)
```

## Component library

### Layout (`components/layout/Screen.tsx`)
- `Screen` — plain flex-1 background wrapper
- `ScrollableScreen` — scrollable with tab-bar-aware bottom padding
- `KeyboardScreen` — keyboard-aware form scrolling via `KeyboardAwareScrollViewCompat`
- `SafeBottomContainer` — sticky bottom action area respecting safe area + Android nav

### UI (`components/ui/`)
`AppButton` · `AppIconButton` · `AppTextInput` · `AppSearchBar` · `AppHeader` · `BackButton` · `Divider` · `Badge` · `StatusBadge` · `PriceDisplay` · `QuantitySelector` · `SectionHeader` · `EmptyState` · `ErrorState` · `LoadingState` · `Skeleton` · `ProductCardSkeleton` · `OrderCardSkeleton` · `CategoryCardSkeleton` · `AppModal` · `ConfirmDialog` · `Toast`

### Cards (`components/cards/`)
`ProductCard` · `CategoryCard` · `AddressCard` · `OrderCard` · `MenuRow`

## Key design decisions

### No direct client Supabase writes for orders
The checkout screen explicitly does NOT perform a direct INSERT to the orders table. This is pending the secure `create_order` RPC implementation in `supabase/migrations/023_secure_order_functions.sql`.

### Address card interaction separation
`AddressCard.onPress` selects the address. `AddressCard.onEdit` is a separate action (explicit Edit button). Pressing the card NEVER enters edit mode. This prevents accidental data entry.

### No fake data
All data-driven sections (banners, categories, products, orders, notifications) show skeleton loaders in the absence of real data. No hardcoded product arrays, fake orders, or mock medicine names exist anywhere in the runtime application code.

### Error display
All user-facing error messages go through `lib/errors.ts`. Raw Supabase errors, PostgreSQL messages, and stack traces are never shown to users.

### Money handling
All prices are stored/received as paise (integers). `lib/money.ts` handles conversion and INR formatting (`Intl.NumberFormat` with `en-IN` locale).

### QuantitySelector debounce
The quantity selector implements a 350ms debounce to prevent mutation spam from rapid taps. This is a UI-layer protection (server validation also required).

## Pending integration

| Feature | Location | Notes |
|---|---|---|
| Supabase phone OTP auth | `app/(auth)/login.tsx`, `verify-otp.tsx` | Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Categories query | `app/(tabs)/categories.tsx` | `useQuery` → Supabase `categories` table |
| Products query | `app/(tabs)/index.tsx`, `app/category/[id].tsx` | `useQuery` → Supabase with RLS |
| Orders query | `app/(tabs)/orders.tsx`, `app/order/[id].tsx` | `useQuery` → `get_my_orders` secure RPC |
| Addresses CRUD | `app/addresses/*.tsx` | Secure RPC from `021_secure_address_functions.sql` |
| Cart sync | `stores/cart.ts` | Currently AsyncStorage-only, sync pending |
| Order placement | `app/checkout/index.tsx` | Pending `create_order` secure RPC |
| Push notifications | `app/notifications/index.tsx` | Pending `expo-notifications` + Supabase integration |
| App settings (support) | `app/support/index.tsx` | Pending `app_settings` table query |
