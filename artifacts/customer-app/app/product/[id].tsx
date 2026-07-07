/**
 * Product detail screen — medicine detail view.
 *
 * - Validates product id from route params.
 * - Loads real product detail: images, compositions, brand, manufacturer.
 * - Uses get_product_availability() RPC for stock status.
 * - Records product view in recently-viewed history (AsyncStorage).
 * - Displays only real database values — null sections are hidden, never
 *   replaced with lorem ipsum or placeholder text.
 * - Cart actions update Zustand local store only (cart backend is Step 7+).
 * - Inactive / archived / not-found products show "Product Unavailable".
 */

import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeBottomContainer, Screen } from '@/components/layout/Screen';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { ProductCard } from '@/components/cards/ProductCard';
import {
  useProductAvailability,
  useProductDetails,
  useSimilarProducts,
} from '@/features/catalog/catalog.hooks';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { useColors } from '@/hooks/useColors';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCartStore } from '@/stores/cart';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Image gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: CatalogProductImage[] }) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    // No images: neutral placeholder (no random stock photos)
    return (
      <View style={[styles.imageArea, { backgroundColor: colors.primarySoft }]} />
    );
  }

  if (images.length === 1) {
    return (
      <View style={[styles.imageArea, { backgroundColor: colors.surfaceSecondary }]}>
        <Image
          source={{ uri: images[0].imageUrl }}
          style={styles.galleryImage}
          contentFit="contain"
          accessibilityLabel={images[0].altText ?? undefined}
        />
      </View>
    );
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }

  return (
    <View style={{ backgroundColor: colors.surfaceSecondary }}>
      <FlatList
        data={images}
        keyExtractor={(img) => img.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.imageArea, { width: SCREEN_WIDTH }]}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.galleryImage}
              contentFit="contain"
              accessibilityLabel={item.altText ?? undefined}
            />
          </View>
        )}
      />
      {/* Dot indicators — only shown for multiple images */}
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? '#333' : '#ccc' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { recordView } = useRecentlyViewed();

  const quantity = useCartStore((s) => s.getQuantity(id ?? ''));
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const { data: product, isLoading, isError, refetch } = useProductDetails(id);
  const { data: availability } = useProductAvailability(product?.id);
  const { data: similar = [] } = useSimilarProducts(product?.id, product?.categoryId);

  // Record view in recently-viewed history once product loads.
  const recorded = useRef(false);
  useEffect(() => {
    if (product && !recorded.current) {
      recorded.current = true;
      recordView({
        id: product.id,
        name: product.name,
        packSize: product.packSize,
        primaryImageUrl: product.images[0]?.imageUrl ?? null,
        sellingPricePaise: product.sellingPricePaise,
        mrpPaise: product.mrpPaise,
        inStock: availability?.isAvailable ?? true,
      });
    }
  }, [product, availability, recordView]);

  // Determine in-stock status: prefer RPC result; fall back to optimistic true while loading.
  const inStock = availability ? availability.isAvailable : true;

  return (
    <Screen>
      <AppHeader title={isLoading ? '' : (product?.name ?? 'Product')} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isLoading ? (
          <>
            <Skeleton width="100%" height={240} borderRadius={0} />
            <View style={{ padding: SPACING.base, gap: SPACING.sm }}>
              <Skeleton height={20} width="80%" />
              <Skeleton height={14} width="55%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={18} width="35%" />
            </View>
          </>
        ) : isError ? (
          <ErrorState onRetry={refetch} style={{ marginTop: SPACING['3xl'] }} />
        ) : !product ? (
          // Product not found, inactive, or archived
          <EmptyState
            icon="alert-circle"
            title="Product Unavailable"
            description="This product is no longer available."
            style={{ marginTop: SPACING['3xl'] }}
          />
        ) : (
          <>
            {/* Image gallery */}
            <ImageGallery images={product.images} />

            {/* Product info */}
            <View style={styles.infoSection}>
              <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>

              {product.manufacturerName && (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {product.manufacturerName}
                </Text>
              )}
              {!product.manufacturerName && product.brandName && (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {product.brandName}
                </Text>
              )}
              {product.packSize && (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {product.packSize}
                </Text>
              )}

              <PriceDisplay
                pricePaise={product.sellingPricePaise}
                mrpPaise={
                  product.mrpPaise !== product.sellingPricePaise ? product.mrpPaise : undefined
                }
                size="lg"
                style={{ marginTop: SPACING.sm }}
              />

              {availability?.isLowStock && inStock && (
                <Text style={[styles.lowStock, { color: colors.warning ?? '#e67e22' }]}>
                  Only a few left
                </Text>
              )}
            </View>

            {/* Description — hidden if absent */}
            {product.description ? (
              <View
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
                <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {product.description}
                </Text>
              </View>
            ) : null}

            {/* Uses — hidden if absent */}
            {product.uses ? (
              <View
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Uses</Text>
                <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {product.uses}
                </Text>
              </View>
            ) : null}

            {/* Compositions — hidden if absent */}
            {product.compositions.length > 0 ? (
              <View
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Composition</Text>
                {product.compositions.map((c) => (
                  <View key={c.id} style={styles.compositionRow}>
                    <Text style={[styles.compositionName, { color: colors.foreground }]}>
                      {c.compositionName}
                    </Text>
                    {c.strength ? (
                      <Text style={[styles.compositionStrength, { color: colors.mutedForeground }]}>
                        {c.strength}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Similar products — hidden if none */}
            {similar.length > 0 && (
              <View style={styles.similarSection}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: SPACING.base }]}>
                  Similar Medicines
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.similarList}
                >
                  {similar.map((item) => (
                    <ProductCard
                      key={item.id}
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
                      onPress={() => router.push(`/product/${item.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Sticky Add to Cart action */}
      <SafeBottomContainer>
        {isLoading ? (
          <Skeleton height={44} />
        ) : !product || !inStock ? (
          <AppButton
            label="Out of Stock"
            onPress={() => {}}
            fullWidth
            size="lg"
            disabled
          />
        ) : quantity > 0 ? (
          <View style={styles.qtyRow}>
            <QuantitySelector
              quantity={quantity}
              onDecrease={() => updateQuantity(id ?? '', quantity - 1)}
              onIncrease={() => updateQuantity(id ?? '', quantity + 1)}
              maxQuantity={availability?.availableQuantity ?? 10}
            />
            <Text style={[styles.addedText, { color: colors.success }]}>Added to cart</Text>
          </View>
        ) : (
          <AppButton
            label="Add to Cart"
            onPress={() =>
              addItem(id ?? '', {
                pricePaise: product.sellingPricePaise,
                name: product.name,
              })
            }
            fullWidth
            size="lg"
          />
        )}
      </SafeBottomContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING['3xl'] },
  imageArea: { width: '100%', height: 240 },
  galleryImage: { width: '100%', height: '100%' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  infoSection: {
    padding: SPACING.base,
    gap: SPACING.xs,
  },
  name: {
    fontSize: FONT_SIZE.h3,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  meta: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
  },
  lowStock: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: SPACING.xs,
  },
  infoCard: {
    margin: SPACING.base,
    marginTop: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  bodyText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.bodySmall * 1.6,
  },
  compositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  compositionName: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  compositionStrength: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
  },
  similarSection: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  similarList: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  addedText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
