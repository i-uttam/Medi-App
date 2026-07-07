/**
 * Product detail screen — medicine details view.
 * Visual shell — data queries pending API integration.
 * No fake medical claims or hardcoded medicine descriptions.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeBottomContainer } from '@/components/layout/Screen';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const quantity = useCartStore((s) => s.getQuantity(id ?? ''));
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  // TODO: useQuery for product id via Supabase RPC
  const isLoading = true;
  const product = null;

  return (
    <Screen>
      <AppHeader title={isLoading ? '' : 'Product'} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Image area */}
        <View style={[styles.imageArea, { backgroundColor: colors.surfaceSecondary }]}>
          {isLoading ? (
            <Skeleton width="100%" height={240} borderRadius={0} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.primarySoft }]} />
          )}
        </View>

        {/* Product info */}
        <View style={styles.infoSection}>
          {isLoading ? (
            <View style={{ gap: SPACING.sm }}>
              <Skeleton height={20} width="80%" />
              <Skeleton height={14} width="50%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={18} width="35%" />
            </View>
          ) : (
            <>
              <Text style={[styles.name, { color: colors.foreground }]}>Medicine Name</Text>
              <Text style={[styles.manufacturer, { color: colors.mutedForeground }]}>Manufacturer</Text>
              <Text style={[styles.packSize, { color: colors.mutedForeground }]}>Pack size</Text>
              <PriceDisplay pricePaise={0} mrpPaise={0} size="lg" style={{ marginTop: SPACING.sm }} />
            </>
          )}
        </View>

        {/* Product information section */}
        {!isLoading && (
          <>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product Information</Text>
              <Text style={[styles.infoRow, { color: colors.textSecondary }]}>
                Composition and uses will appear here.
              </Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Similar Medicines</Text>
              {/* TODO: Similar products query */}
              <Text style={[styles.infoRow, { color: colors.mutedForeground }]}>
                Similar medicines will appear here.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky add to cart action */}
      <SafeBottomContainer>
        {isLoading ? (
          <Skeleton height={44} />
        ) : quantity > 0 ? (
          <View style={styles.qtyRow}>
            <QuantitySelector
              quantity={quantity}
              onDecrease={() => updateQuantity(id ?? '', quantity - 1)}
              onIncrease={() => updateQuantity(id ?? '', quantity + 1)}
              maxQuantity={10}
            />
            <Text style={[styles.addedText, { color: colors.success }]}>Added to cart</Text>
          </View>
        ) : (
          <AppButton
            label="Add to Cart"
            onPress={() => addItem(id ?? '', { name: 'Product' })}
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
  imagePlaceholder: { width: '100%', height: '100%' },
  infoSection: { padding: SPACING.base, gap: SPACING.xs },
  name: {
    fontSize: FONT_SIZE.h3,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  manufacturer: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
  },
  packSize: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
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
  infoRow: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.bodySmall * 1.6,
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
