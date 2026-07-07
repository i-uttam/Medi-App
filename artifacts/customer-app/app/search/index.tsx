/**
 * Search screen — medicine search with multiple states.
 * States: initial, typing, loading, suggestions, results, no-results, error.
 */

import { AppSearchBar } from '@/components/ui/AppSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TODO: Load from AsyncStorage
const MOCK_RECENT: string[] = [];

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(true);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // TODO: Replace with useQuery debounced search
  const isLoading = false;
  const results: [] = [];

  const showInitial = !query && !focused;
  const showEmpty = query && !isLoading && results.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.searchBarWrap}>
            <AppSearchBar
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              loading={isLoading}
              autoFocus
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + SPACING['3xl'] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Recent searches */}
        {!query && MOCK_RECENT.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent searches</Text>
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear history">
                <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
              </Pressable>
            </View>
            {MOCK_RECENT.map((term) => (
              <Pressable
                key={term}
                style={[styles.recentItem, { borderBottomColor: colors.border }]}
                onPress={() => setQuery(term)}
              >
                <Feather name="clock" size={16} color={colors.mutedForeground} />
                <Text style={[styles.recentText, { color: colors.foreground }]}>{term}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View style={styles.productGrid}>
            {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </View>
        )}

        {/* No results */}
        {showEmpty && (
          <EmptyState
            icon="search"
            title="No results found"
            description={`We couldn't find anything for "${query}". Try a different search term.`}
            style={{ marginTop: SPACING['2xl'] }}
          />
        )}

        {/* Initial state (no query, no recent) */}
        {!query && MOCK_RECENT.length === 0 && (
          <EmptyState
            icon="search"
            title="Search for medicines"
            description="Type a medicine name, brand, or health condition to get started."
            style={{ marginTop: SPACING['3xl'] }}
          />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: SPACING.base, flexGrow: 1 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
});
