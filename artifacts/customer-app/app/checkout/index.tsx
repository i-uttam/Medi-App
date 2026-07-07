/**
 * Checkout screen — visual shell.
 *
 * IMPORTANT: The Place Order action does NOT create an order directly from the client.
 * The "Place Order" button is intentionally marked as pending the secure server-side
 * order engine implementation via Supabase RPC (see supabase/migrations/023_secure_order_functions.sql).
 *
 * Do NOT implement a direct INSERT to the orders table from this screen.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AddressCard, AddressCardData } from '@/components/cards/AddressCard';
import { Divider } from '@/components/ui/Divider';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { SafeBottomContainer } from '@/components/layout/Screen';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { formatPaise } from '@/lib/money';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { useToast } from '@/stores/toast';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount());
  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const displayTotal = items.reduce(
    (sum, i) => sum + (i.pricePaise ?? 0) * i.quantity,
    0,
  );

  // TODO: Load selected delivery address from address store/context
  const selectedAddress: AddressCardData | null = null;

  const handlePlaceOrder = () => {
    // PENDING: Secure order engine implementation via Supabase RPC
    // This must call a server-side function, NOT a direct client INSERT.
    // See: supabase/migrations/023_secure_order_functions.sql
    toast.info('Order placement pending secure server implementation.');
  };

  return (
    <Screen>
      <AppHeader title="Checkout" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery address</Text>
          {selectedAddress ? (
            <AddressCard
              address={selectedAddress}
              selected
              onEdit={() => router.push('/addresses')}
            />
          ) : (
            <AppButton
              label="Select delivery address"
              onPress={() => router.push('/addresses')}
              variant="outline"
              fullWidth
            />
          )}
        </View>

        <Divider />

        {/* Order summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Order summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </Text>
          {items.slice(0, 3).map((item) => (
            <View key={item.productId} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.name ?? item.productId}
              </Text>
              <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                ×{item.quantity}
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={[styles.moreItems, { color: colors.mutedForeground }]}>
              +{items.length - 3} more items
            </Text>
          )}
        </View>

        <Divider />

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment method</Text>
          <View style={[styles.paymentOption, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Feather name="truck" size={20} color={colors.primary} />
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentLabel, { color: colors.foreground }]}>Cash on Delivery</Text>
              <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                Pay when your order arrives
              </Text>
            </View>
            <Feather name="check-circle" size={20} color={colors.primary} />
          </View>
        </View>

        <Divider />

        {/* Price summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Price summary</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Item total</Text>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>
              {displayTotal > 0 ? formatPaise(displayTotal) : '—'}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Delivery</Text>
            <Text style={[styles.priceValue, { color: colors.success }]}>FREE</Text>
          </View>
          <Divider marginV={SPACING.sm} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total payable</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              {displayTotal > 0 ? formatPaise(displayTotal) : '—'}
            </Text>
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Sticky place order */}
      <SafeBottomContainer>
        <AppButton
          label="Place Order (COD)"
          onPress={handlePlaceOrder}
          loading={isPlacing}
          disabled={!selectedAddress || items.length === 0}
          fullWidth
          size="lg"
        />
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          By placing the order you agree to our Terms of Service.
        </Text>
      </SafeBottomContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  section: { padding: SPACING.base, gap: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
  itemQty: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    marginLeft: SPACING.sm,
  },
  moreItems: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  paymentInfo: { flex: 1 },
  paymentLabel: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  paymentSub: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  priceLabel: { fontSize: FONT_SIZE.bodySmall, fontFamily: FONT_FAMILY.regular },
  priceValue: { fontSize: FONT_SIZE.bodySmall, fontFamily: FONT_FAMILY.medium, fontWeight: FONT_WEIGHT.medium },
  totalLabel: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.semibold, fontWeight: FONT_WEIGHT.semibold },
  totalValue: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.bold, fontWeight: FONT_WEIGHT.bold },
  disclaimer: {
    textAlign: 'center',
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.sm,
  },
});
