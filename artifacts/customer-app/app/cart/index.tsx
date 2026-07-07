/**
 * Cart screen.
 * Displays cart items, price summary, and proceed to checkout.
 *
 * Price calculation is display-only — authoritative total is computed server-side.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { SafeBottomContainer } from '@/components/layout/Screen';
import { Divider } from '@/components/ui/Divider';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { formatPaise } from '@/lib/money';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

export default function CartScreen() {
  const colors = useColors();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const itemCount = useCartStore((s) => s.itemCount());

  // Display total — server validates before order creation
  const displayTotalPaise = items.reduce(
    (sum, i) => sum + (i.pricePaise ?? 0) * i.quantity,
    0,
  );

  return (
    <Screen>
      <AppHeader
        title={itemCount > 0 ? `Cart (${itemCount})` : 'Cart'}
        onBack={() => router.back()}
      />

      {items.length === 0 ? (
        <EmptyState
          icon="shopping-cart"
          title="Your cart is empty"
          description="Add medicines from the home screen or search to get started."
          actionLabel="Shop now"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Cart items */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {items.map((item, idx) => (
                <View key={item.productId}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemImage, { backgroundColor: colors.primarySoft }]} />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                        {item.name ?? item.productId}
                      </Text>
                      {item.pricePaise !== undefined && (
                        <PriceDisplay pricePaise={item.pricePaise} size="sm" />
                      )}
                      <QuantitySelector
                        quantity={item.quantity}
                        onDecrease={() => updateQuantity(item.productId, item.quantity - 1)}
                        onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
                        maxQuantity={10}
                      />
                    </View>
                  </View>
                  {idx < items.length - 1 && <Divider marginV={0} />}
                </View>
              ))}
            </View>

            {/* Price summary */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.sm }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Price Summary</Text>
              <Divider marginV={SPACING.sm} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Item total ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {displayTotalPaise > 0 ? formatPaise(displayTotalPaise) : '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery charge</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>FREE</Text>
              </View>
              <Divider marginV={SPACING.sm} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total payable</Text>
                <Text style={[styles.totalValue, { color: colors.foreground }]}>
                  {displayTotalPaise > 0 ? formatPaise(displayTotalPaise) : '—'}
                </Text>
              </View>
              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                Final amount will be confirmed at checkout.
              </Text>
            </View>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>

          {/* Sticky checkout button */}
          <SafeBottomContainer>
            <AppButton
              label={`Proceed to Checkout · ${displayTotalPaise > 0 ? formatPaise(displayTotalPaise) : ''}`}
              onPress={() => router.push('/checkout')}
              fullWidth
              size="lg"
            />
          </SafeBottomContainer>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, padding: SPACING.base },
  section: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    flexShrink: 0,
  },
  itemInfo: { flex: 1, gap: SPACING.sm },
  itemName: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.bodySmall * 1.4,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
  summaryValue: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  totalLabel: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  totalValue: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  disclaimer: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
