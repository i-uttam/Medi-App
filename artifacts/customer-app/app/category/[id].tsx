/**
 * Category product list — shows medicines in a category.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { LAYOUT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // TODO: useQuery for products in category `id` via Supabase RPC
  const isLoading = true;
  const products: [] = [];
  const isError = false;

  return (
    <Screen>
      <AppHeader title={name ?? 'Category'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.grid}>
            {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => {}} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="package"
            title="No products yet"
            description="This category doesn't have any products yet."
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.base, flexGrow: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
});
