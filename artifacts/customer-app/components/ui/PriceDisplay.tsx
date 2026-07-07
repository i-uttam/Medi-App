import { formatPaise, discountPercent } from '@/lib/money';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface PriceDisplayProps {
  /** Selling price in paise */
  pricePaise: number;
  /** MRP in paise */
  mrpPaise?: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function PriceDisplay({ pricePaise, mrpPaise, size = 'md', style }: PriceDisplayProps) {
  const colors = useColors();
  const hasDiscount = mrpPaise !== undefined && mrpPaise > pricePaise;
  const pct = hasDiscount ? discountPercent(mrpPaise!, pricePaise) : 0;

  const priceSize =
    size === 'sm' ? FONT_SIZE.bodySmall : size === 'lg' ? FONT_SIZE.h3 : FONT_SIZE.bodyLarge;
  const mrpSize =
    size === 'sm' ? FONT_SIZE.caption : size === 'lg' ? FONT_SIZE.body : FONT_SIZE.bodySmall;

  return (
    <View style={[styles.row, style]}>
      <Text
        style={[
          styles.price,
          {
            color: colors.foreground,
            fontSize: priceSize,
            fontFamily: size === 'lg' ? FONT_FAMILY.bold : FONT_FAMILY.semibold,
          },
        ]}
      >
        {formatPaise(pricePaise)}
      </Text>
      {hasDiscount && (
        <>
          <Text
            style={[
              styles.mrp,
              { color: colors.mutedForeground, fontSize: mrpSize },
            ]}
          >
            {formatPaise(mrpPaise!)}
          </Text>
          {pct > 0 && (
            <Text style={[styles.discount, { color: colors.discount, fontSize: mrpSize }]}>
              {pct}% off
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs },
  price: { fontWeight: FONT_WEIGHT.semibold },
  mrp: {
    textDecorationLine: 'line-through',
    fontFamily: FONT_FAMILY.regular,
  },
  discount: { fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
});
