/**
 * Categories tab — browse all medicine categories.
 *
 * States: loading (skeleton grid) → content (CategoryCard grid) → empty → error.
 * Real data from Supabase via useCategories hook.
 * Navigates to /category/[id] on press — category name is NOT passed through
 * route params (the category screen fetches authoritative data by id).
 */

import { CategoryCard } from '@/components/cards/CategoryCard';
import { CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT, SPACING } from '@/constants/theme';
import { useCategories } from '@/features/catalog/catalog.hooks';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SKELETON_COUNT = 12;

export default function CategoriesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: categories = [], isLoading, isError, refetch } = useCategories();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Custom header (no Expo header) */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Categories</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: bottomPad + LAYOUT.tabBarHeight + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          // 2-per-row skeleton grid
          Array.from({ length: Math.ceil(SKELETON_COUNT / 2) }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              <View style={styles.gridCell}><CategoryCardSkeleton /></View>
              <View style={styles.gridCell}><CategoryCardSkeleton /></View>
            </View>
          ))
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="grid"
            title="No categories yet"
            description="Categories will appear here once the catalogue is set up."
          />
        ) : (
          // Real category grid — 2 per row
          Array.from({ length: Math.ceil(categories.length / 2) }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {[0, 1].map((col) => {
                const cat = categories[row * 2 + col];
                if (!cat) return <View key={col} style={styles.gridCell} />;
                return (
                  <View key={cat.id} style={styles.gridCell}>
                    <CategoryCard
                      category={{ id: cat.id, name: cat.name, imageUrl: cat.imageUrl ?? undefined }}
                      onPress={() => router.push(`/category/${cat.id}`)}
                    />
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scroll: { flex: 1 },
  grid: {
    padding: SPACING.base,
    gap: SPACING.base,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  gridCell: { flex: 1, alignItems: 'center' },
});
