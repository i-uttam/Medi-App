/**
 * Categories tab — browse all medicine categories.
 * Shows skeleton grid while category data is loading.
 */

import { CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SKELETON_COUNT = 12;

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // TODO: Replace with useQuery for categories from Supabase
  const isLoading = true;
  const categories: [] = [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Custom header (no Expo header) */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
          [...Array(Math.ceil(SKELETON_COUNT / 2))].map((_, row) => (
            <View key={row} style={styles.gridRow}>
              {[0, 1].map((col) => (
                <View key={col} style={styles.gridCell}>
                  <CategoryCardSkeleton />
                </View>
              ))}
            </View>
          ))
        ) : categories.length === 0 ? (
          <EmptyState
            icon="grid"
            title="No categories yet"
            description="Categories will appear here once the catalogue is set up."
          />
        ) : null}
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
