import { StatusBadge, OrderStatus } from '@/components/ui/StatusBadge';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { formatPaise } from '@/lib/money';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface OrderCardData {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  itemSummary: string; // e.g. "Paracetamol 500mg + 2 more items"
  totalPaise: number;
}

interface OrderCardProps {
  order: OrderCardData;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.95 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}`}
    >
      {/* Top row: order number + status */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.orderNum, { color: colors.foreground }]}>
            #{order.orderNumber}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{order.date}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Items summary */}
      <Text style={[styles.items, { color: colors.textSecondary }]} numberOfLines={1}>
        {order.itemSummary}
      </Text>

      {/* Footer: total + view */}
      <View style={styles.footer}>
        <Text style={[styles.total, { color: colors.foreground }]}>
          {formatPaise(order.totalPaise)}
        </Text>
        <View style={styles.viewBtn}>
          <Text style={[styles.viewText, { color: colors.primary }]}>View details</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNum: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  date: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  items: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  total: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
