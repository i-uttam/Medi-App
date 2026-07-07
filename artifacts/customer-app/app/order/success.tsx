/**
 * Order success screen — visual shell only.
 * Navigated to after a successfully created order.
 * Accepts orderId param for future integration.
 * gestureEnabled: false in root layout — user cannot swipe back here.
 */

import { AppButton } from '@/components/ui/AppButton';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // orderId will be passed when real order engine is implemented
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.successSoft }]}>
          <Feather name="check" size={48} color={colors.success} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Order placed!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your order has been placed successfully.{'\n'}We'll notify you when it's on the way.
        </Text>

        {orderId && (
          <View style={[styles.orderIdBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.orderIdLabel, { color: colors.mutedForeground }]}>Order ID</Text>
            <Text style={[styles.orderId, { color: colors.foreground }]}>#{orderId}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {orderId && (
          <AppButton
            label="Track Order"
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: orderId } })}
            fullWidth
            size="lg"
          />
        )}
        <AppButton
          label="Continue Shopping"
          onPress={() => router.replace('/(tabs)')}
          variant="outline"
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.sm }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', padding: SPACING.xl },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.h2,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: FONT_SIZE.body * 1.6,
  },
  orderIdBox: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  orderIdLabel: { fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.regular },
  orderId: { fontSize: FONT_SIZE.bodyLarge, fontFamily: FONT_FAMILY.semibold, fontWeight: FONT_WEIGHT.semibold },
  actions: { gap: SPACING.sm },
});
