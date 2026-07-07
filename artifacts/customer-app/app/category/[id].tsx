/**
 * Category product list — shows customer-visible medicines in a category.
 *
 * - Validates the route id before querying.
 * - Loads authoritative category name from Supabase (does NOT trust route params for display).
 * - Infinite scroll pagination via useInfiniteQuery (range-based, 20 per page).
 * - FlatList with stable keys — no ScrollView.map() for large lists.
 * - States: loading, content, empty, error.
 */

import { ProductCard } from '@/components/cards/ProductCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { SPACING } from '@/constants/theme';
import { useCategory, useCategoryProducts } from '@/features/catalog/catalog.hooks';
import type { CatalogProductListItem } from '@/features/catalog/catalog.types';
import { useColors } from '@/hooks/useColors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';

const SKELETON_COUNT = 6;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Authoritative category name — not from route params.
  const { data: category, isLoading: categoryLoading } = useCategory(id);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCategoryProducts(id);

  // Flatten paginated pages into a single product array.
  const products = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const headerTitle = categoryLoading ? '…' : (category?.name ?? 'Category');

  const renderItem = useCallback(
    ({ item }: { item: CatalogProductListItem }) => (
      <View style={styles.cardWrapper}>
        <ProductCard
          product={{
            id: item.id,
            name: item.name,
            manufacturer: item.manufacturerName ?? item.brandName ?? undefined,
            packSize: item.packSize ?? undefined,
            pricePaise: item.sellingPricePaise,
            mrpPaise: item.mrpPaise !== item.sellingPricePaise ? item.mrpPaise : undefined,
            imageUrl: item.primaryImageUrl ?? undefined,
            inStock: item.inStock,
            isFeatured: item.isFeatured,
          }}
          onPress={() => router.push(`/product/${item.id}`)}
        />
      </View>
    ),
    [router],
  );

  const keyExtractor = useCallback((item: CatalogProductListItem) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

  const ListEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <View key={i} style={styles.cardWrapper}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      );
    }
    if (isError) {
      return <ErrorState onRetry={refetch} />;
    }
    return (
      <EmptyState
        icon="package"
        title="No products yet"
        description="This category doesn't have any products yet."
      />
    );
  }, [isLoading, isError, refetch]);

  return (
    <Screen>
      <AppHeader title={headerTitle} />
      <FlatList
        data={products}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.base, flexGrow: 1 },
  row: { gap: SPACING.md, justifyContent: 'flex-start' },
  cardWrapper: { flex: 1 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  loadingMore: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
});
