/**
 * BannerCarousel — horizontal promotional banner slider.
 *
 * - Renders real CatalogBanner data from Supabase.
 * - Safe navigation: only handles approved link_type values (product, category).
 * - link_type 'url' is NOT navigated to (security: arbitrary URLs not allowed).
 * - link_type 'category'/'product': linkValue is validated as a non-empty UUID-like
 *   string before pushing to prevent malformed route construction.
 * - Failed images are hidden from the carousel entirely — no blank cells.
 * - Shows dot indicators only when there are multiple banners.
 */

import { RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const BANNER_HEIGHT = 160;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HORIZ_PAD = SPACING.base * 2;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_HORIZ_PAD;

/** Basic UUID-format guard to prevent malformed internal route construction. */
function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

interface BannerCarouselProps {
  banners: CatalogBanner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const colors = useColors();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  // Track image load failures — banners whose images fail are removed from display.
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const visibleBanners = useMemo(
    () => banners.filter((b) => !failedIds.has(b.id)),
    [banners, failedIds],
  );

  const handleImageError = useCallback((id: string) => {
    setFailedIds((prev) => new Set([...prev, id]));
  }, []);

  if (visibleBanners.length === 0) return null;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
    setActiveIndex(Math.min(index, visibleBanners.length - 1));
  }

  function handlePress(banner: CatalogBanner) {
    if (banner.linkType === 'product' && isValidUuid(banner.linkValue)) {
      router.push(`/product/${banner.linkValue}`);
    } else if (banner.linkType === 'category' && isValidUuid(banner.linkValue)) {
      router.push(`/category/${banner.linkValue}`);
    }
    // 'url' and 'none' link types are intentionally not navigated.
    // Invalid/missing linkValue is also silently ignored.
  }

  return (
    <View>
      <FlatList
        data={visibleBanners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            style={[styles.bannerItem, { width: BANNER_WIDTH }]}
            accessibilityRole={item.linkType !== 'none' ? 'button' : 'image'}
            accessibilityLabel={item.title}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.bannerImage}
              contentFit="cover"
              onError={() => handleImageError(item.id)}
            />
            {item.title ? (
              <View style={[styles.titleOverlay, { backgroundColor: 'rgba(0,0,0,0.30)' }]}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
      {/* Dot indicators — only shown for multiple visible banners */}
      {visibleBanners.length > 1 && (
        <View style={styles.dots}>
          {visibleBanners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: SPACING.md },
  bannerItem: {
    height: BANNER_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
