/**
 * Home screen — main landing screen for MediGo.
 *
 * Structure:
 *  - Delivery location header + notification bell
 *  - Search bar (tapping navigates to search)
 *  - Promotional banner area (skeleton while empty)
 *  - Shop by Category section
 *  - Featured Medicines section
 *  - Best Sellers section
 *
 * Data: sections show skeleton loaders until real API queries are wired.
 * No fake data — skeletons represent the loading state.
 */

import { CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppIconButton } from '@/components/ui/AppIconButton';
import { AppSearchBar } from '@/components/ui/AppSearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FONT_FAMILY, FONT_SIZE, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Placeholder skeletons to show architecture while data is not yet connected
const CATEGORY_SKELETONS = Array.from({ length: 6 }, (_, i) => i);
const PRODUCT_SKELETONS = Array.from({ length: 4 }, (_, i) => i);

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.itemCount());

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Sticky header ── */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Delivery location row */}
        <View style={styles.locationRow}>
          <View style={styles.locationLeft}>
            <Text style={[styles.deliverTo, { color: colors.mutedForeground }]}>Deliver to</Text>
            <Pressable
              style={styles.locationSelector}
              onPress={() => router.push('/addresses')}
              accessibilityRole="button"
              accessibilityLabel="Select delivery address"
            >
              <Text style={[styles.locationText, { color: colors.foreground }]} numberOfLines={1}>
                Select delivery address
              </Text>
              <Feather name="chevron-down" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <AppIconButton
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={22} color={colors.foreground} />
          </AppIconButton>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <AppSearchBar
            value=""
            placeholder="Search medicines, vitamins…"
            onPress={() => router.push('/search')}
          />
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + LAYOUT.tabBarHeight + SPACING['2xl'] }}
      >

        {/* Banner area — skeleton while banners load / are empty */}
        <View style={styles.bannerSection}>
          <Skeleton
            height={160}
            borderRadius={RADIUS.lg}
            style={[styles.banner, { backgroundColor: colors.primarySoft }]}
          />
          {/* Dot indicators */}
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === 0 ? colors.primary : colors.border },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Shop by Category */}
        <View style={styles.section}>
          <SectionHeader
            title="Shop by Category"
            onSeeAll={() => router.push('/(tabs)/categories')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {CATEGORY_SKELETONS.map((i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </ScrollView>
        </View>

        {/* Featured Medicines */}
        <View style={styles.section}>
          <SectionHeader
            title="Featured Medicines"
            onSeeAll={() => router.push('/search')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {PRODUCT_SKELETONS.map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ScrollView>
        </View>

        {/* Best Sellers */}
        <View style={styles.section}>
          <SectionHeader
            title="Best Sellers"
            onSeeAll={() => router.push('/search')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {PRODUCT_SKELETONS.map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: SPACING.md,
    zIndex: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  locationLeft: { flex: 1 },
  deliverTo: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: 2,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    maxWidth: 220,
  },
  searchWrap: {
    paddingHorizontal: SPACING.base,
  },
  scroll: { flex: 1 },
  bannerSection: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.xs,
  },
  banner: { width: '100%' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  section: { marginTop: SPACING.xl },
  horizontalList: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
});
