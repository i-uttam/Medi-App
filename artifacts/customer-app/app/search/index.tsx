/**
 * Search screen — medicine full-text search.
 *
 * States:
 *   idle        — no query, shows recent searches
 *   typing      — query < 2 chars, shows recent searches
 *   loading     — query pending
 *   suggestions — lightweight name suggestions while typing (>= 2 chars)
 *   results     — full search results
 *   no-results  — query returned nothing
 *   error       — query failed
 *
 * Implementation:
 * - Full-text search via products.search_vector (websearch_to_tsquery).
 * - 400 ms debounce before firing the search query.
 * - Recent searches persisted to AsyncStorage.
 * - Results displayed in a FlatList (no ScrollView.map for large lists).
 * - Suggestions displayed inline as pressable rows.
 */

import { ProductCard } from '@/components/cards/ProductCard';
import { AppSearchBar } from '@/components/ui/AppSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import {
  useProductSearch,
  useSearchSuggestions,
} from '@/features/catalog/catalog.hooks';
import type { CatalogProductListItem } from '@/features/catalog/catalog.types';
import { useColors } from '@/hooks/useColors';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEBOUNCE_MS = 400;

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { searches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  // Debounce: update debouncedQuery 400 ms after the user stops typing.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  // Lightweight suggestions for typeahead (while user is typing)
  const { data: suggestions = [], isFetching: suggestionsLoading } = useSearchSuggestions(inputValue);

  // Full search results (fires once debounce settles)
  const {
    data: searchPages,
    isLoading: searchLoading,
    isError: searchError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductSearch(debouncedQuery);

  const results = useMemo(
    () => searchPages?.pages.flatMap((p) => p.items) ?? [],
    [searchPages],
  );

  // Show suggestions while user is actively typing (query settled < debounce OR loading)
  const isTypingActive = inputValue.trim() !== debouncedQuery || suggestionsLoading;
  const showSuggestions = inputValue.trim().length >= 2 && isTypingActive && suggestions.length > 0;

  const hasQuery = inputValue.trim().length > 0;
  const showResults = !showSuggestions && debouncedQuery.length > 0;
  const showRecent = !hasQuery && searches.length > 0;
  const showEmpty = showResults && !searchLoading && !searchError && results.length === 0;
  const showInitialHint = !hasQuery && searches.length === 0;

  function handleSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    addSearch(trimmed);
    setInputValue(trimmed);
    setDebouncedQuery(trimmed);
  }

  function handleClear() {
    setInputValue('');
    setDebouncedQuery('');
  }

  const renderResult = useCallback(
    ({ item }: { item: CatalogProductListItem }) => (
      <View style={styles.cardWrapper}>
        <ProductCard
          product={{
            id: item.id,
            name: item.name,
            manufacturer: item.manufacturerName ?? item.brandName ?? undefined,
            packSize: item.packSize ?? undefined,
            pricePaise: item.sellingPricePaise,
            mrpPaise:
              item.mrpPaise !== item.sellingPricePaise ? item.mrpPaise : undefined,
            imageUrl: item.primaryImageUrl ?? undefined,
            inStock: item.inStock,
          }}
          onPress={() => {
            addSearch(debouncedQuery);
            router.push(`/product/${item.id}`);
          }}
        />
      </View>
    ),
    [router, addSearch, debouncedQuery],
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
    if (searchLoading) {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={styles.cardWrapper}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      );
    }
    if (searchError) {
      return <ErrorState onRetry={refetch} />;
    }
    if (showEmpty) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          description={`We couldn't find anything for "${debouncedQuery}". Try a different term.`}
          style={{ marginTop: SPACING['2xl'] }}
        />
      );
    }
    return null;
  }, [searchLoading, searchError, showEmpty, refetch, debouncedQuery]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
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
              value={inputValue}
              onChangeText={setInputValue}
              onClear={handleClear}
              loading={searchLoading || suggestionsLoading}
              autoFocus
            />
          </View>
        </View>
      </View>

      {/* Suggestions (inline below header) */}
      {showSuggestions && (
        <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
              onPress={() => handleSearch(s.name)}
            >
              <Feather name="search" size={14} color={colors.mutedForeground} />
              <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={1}>
                {s.name}
                {s.packSize ? (
                  <Text style={{ color: colors.mutedForeground }}> · {s.packSize}</Text>
                ) : null}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Recent searches (when no active query) */}
      {showRecent && !showSuggestions && (
        <View style={[styles.recentContainer, { paddingBottom: bottomPad }]}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Recent Searches</Text>
            <Pressable
              hitSlop={8}
              onPress={clearSearches}
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
            >
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          </View>
          {searches.map((term) => (
            <Pressable
              key={term}
              style={[styles.recentItem, { borderBottomColor: colors.border }]}
              onPress={() => handleSearch(term)}
            >
              <Feather name="clock" size={16} color={colors.mutedForeground} />
              <Text style={[styles.recentText, { color: colors.foreground }]} numberOfLines={1}>
                {term}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => removeSearch(term)}
                style={styles.removeBtn}
                accessibilityLabel={`Remove ${term} from recent searches`}
              >
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Initial hint (no query, no recent) */}
      {showInitialHint && !showSuggestions && (
        <EmptyState
          icon="search"
          title="Search for medicines"
          description="Type a medicine name, brand, or health condition to get started."
          style={{ marginTop: SPACING['3xl'] }}
        />
      )}

      {/* Search results (FlatList for performance) */}
      {showResults && !showSuggestions && (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderResult}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: bottomPad + SPACING['3xl'] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
        />
      )}
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
  suggestions: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 9,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
  },
  recentContainer: {
    padding: SPACING.base,
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
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
    flex: 1,
  },
  removeBtn: {
    padding: SPACING.xs,
  },
  resultsContent: {
    padding: SPACING.base,
    flexGrow: 1,
  },
  row: { gap: SPACING.md, justifyContent: 'flex-start' },
  cardWrapper: { flex: 1 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    padding: SPACING.base,
  },
  loadingMore: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
});
