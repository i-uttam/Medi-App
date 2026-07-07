import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'returned';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgKey: 'successSoft' | 'warningSoft' | 'errorSoft' | 'infoSoft' | 'primarySoft'; textKey: 'success' | 'warning' | 'error' | 'info' | 'primary' }
> = {
  pending: { label: 'Pending', bgKey: 'warningSoft', textKey: 'warning' },
  confirmed: { label: 'Confirmed', bgKey: 'infoSoft', textKey: 'info' },
  processing: { label: 'Processing', bgKey: 'primarySoft', textKey: 'primary' },
  dispatched: { label: 'Dispatched', bgKey: 'primarySoft', textKey: 'primary' },
  delivered: { label: 'Delivered', bgKey: 'successSoft', textKey: 'success' },
  cancelled: { label: 'Cancelled', bgKey: 'errorSoft', textKey: 'error' },
  returned: { label: 'Returned', bgKey: 'warningSoft', textKey: 'warning' },
};

interface StatusBadgeProps {
  status: OrderStatus;
  style?: ViewStyle;
}

/** Color-coded order status badge. Does not rely only on color — label is always shown. */
export function StatusBadge({ status, style }: StatusBadgeProps) {
  const colors = useColors();
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors[config.bgKey] as string },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors[config.textKey] as string }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
});
