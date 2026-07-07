/**
 * Home screen — main landing screen for MediGo.
 *
 * Sections (each loads independently — one section failing does not block others):
 *  - Delivery location header + notification bell
 *  - Search bar (tapping navigates to search)
 *  - Promotional banners (hidden if none)
 *  - Shop by Category (horizontal scroll)
 *  - Featured Medicines (horizontal scroll, hidden if none)
 *  - Best Sellers (horizontal scroll, hidden if none)
 *
 * Data: real Supabase queries via catalog hooks.
 * Empty database → professional empty state, no fake content.
 */

import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryCardSkeleton, ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { AppIconButton } from '@/components/ui/AppIconButton';
import { AppSearchBar } from '@/components/ui/AppSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductCard } from '@/components/cards/ProductCard';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { Feather } from '@expo/vector-icons';
import { FONT_FAMILY, FONT_SIZE, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useActiveBanners, useBestSellerProducts, useCategories, useFeaturedProducts } from '@/features/catalog/catalog.hooks';
import type { CatalogProductListItem } from '@/features/catalog/catalog.types';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Compact inline error for a home section — does not take over the whole screen. */
function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={sectionErrorStyles.row}>
      <Feather name="alert-circle" size={14} color={colors.error} />
      <Text style={[sectionErrorStyles.text, { color: colors.mutedForeground }]}>{message}</Text>
      <Text
        onPress={onRetry}
        style={[sectionErrorStyles.retry, { color: colors.primary }]}
        accessibilityRole="button"
      >
        Retry
      </Text>
    </View>
  );
}

const sectionErrorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  text: { flex: 1, fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.regular },
  retry: { fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.medium },
});

function toProductCardData(item: CatalogProductListItem) {
  return {
    id: item.id,
    name: item.name,
    manufacturer: item.manufacturerName ?? item.brandName ?? undefined,
    packSize: item.packSize ?? undefined,
    pricePaise: item.sellingPricePaise,
    mrpPaise: item.mrpPaise !== item.sellingPricePaise ? item.mrpPaise : undefined,
    imageUrl: item.primaryImageUrl ?? undefined,
    inStock: item.inStock,
    isFeatured: item.isFeatured,
  };
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.itemCount());

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // ── Real catalog queries (each independent) ─────────────────────────────────
  const {
    data: banners = [],
    isLoading: bannersLoading,
    isError: bannersError,
    refetch: refetchBanners,
  } = useActiveBanners();
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: featured = [],
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedProducts();
  const {
    data: bestSellers = [],
    isLoading: bestSellersLoading,
    isError: bestSellersError,
    refetch: refetchBestSellers,
  } = useBestSellerProducts();

  // Catalog is empty only when all sections loaded successfully with no data.
  const allLoaded = !bannersLoading && !categoriesLoading && !featuredLoading && !bestSellersLoading;
  const anyError = bannersError || categoriesError || featuredError || bestSellersError;
  const catalogIsEmpty =
    allLoaded &&
    !anyError &&
    banners.length === 0 &&
    categories.length === 0 &&
    featured.length === 0 &&
    bestSellers.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Sticky header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {/* Delivery location row */}
        <View style={styles.locationRow}>
          <View style={styles.locationLeft}>
            <Text style={[styles.deliverTo, { color: colors.mutedForeground }]}>Deliver to</Text>
            <Text
              style={[styles.locationText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              Select delivery address
            </Text>
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
        {/* ── Catalog empty state ── */}
        {catalogIsEmpty && (
          <EmptyState
            icon="package"
            title="Catalogue coming soon"
            description="Products and categories will appear here once the catalogue is set up."
            style={{ marginTop: SPACING['3xl'] }}
          />
        )}

        {/* ── Banner section ── */}
        {(bannersLoading || banners.length > 0) && (
          <View style={styles.bannerSection}>
            {bannersLoading ? (
              <Skeleton
                height={160}
                borderRadius={RADIUS.lg}
                style={{ width: '100%', backgroundColor: colors.primarySoft }}
              />
            ) : (
              <BannerCarousel banners={banners} />
            )}
          </View>
        )}

        {/* ── Shop by Category ── */}
        {(categoriesLoading || categoriesError || categories.length > 0) && (
          <View style={styles.section}>
            <SectionHeader
              title="Shop by Category"
              onSeeAll={() => router.push('/(tabs)/categories')}
            />
            {categoriesError ? (
              <SectionError
                message="Could not load categories."
                onRetry={refetchCategories}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {categoriesLoading
                  ? Array.from({ length: 6 }, (_, i) => <CategoryCardSkeleton key={i} />)
                  : categories.map((cat) => (
                      <CategoryCard
                        key={cat.id}
                        category={{ id: cat.id, name: cat.name, imageUrl: cat.imageUrl ?? undefined }}
                        onPress={() => router.push(`/category/${cat.id}`)}
                      />
                    ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── Featured Medicines ── */}
        {(featuredLoading || featuredError || featured.length > 0) && (
          <View style={styles.section}>
            <SectionHeader title="Featured Medicines" />
            {featuredError ? (
              <SectionError
                message="Could not load featured medicines."
                onRetry={refetchFeatured}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {featuredLoading
                  ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
                  : featured.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={toProductCardData(product)}
                        onPress={() => router.push(`/product/${product.id}`)}
                      />
                    ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── Best Sellers ── */}
        {(bestSellersLoading || bestSellersError || bestSellers.length > 0) && (
          <View style={styles.section}>
            <SectionHeader title="Best Sellers" />
            {bestSellersError ? (
              <SectionError
                message="Could not load best sellers."
                onRetry={refetchBestSellers}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {bestSellersLoading
                  ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
                  : bestSellers.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={toProductCardData(product)}
                        onPress={() => router.push(`/product/${product.id}`)}
                      />
                    ))}
              </ScrollView>
            )}
          </View>
        )}
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
  section: { marginTop: SPACING.xl },
  horizontalList: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
});
