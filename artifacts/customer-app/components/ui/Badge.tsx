import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface BadgeProps {
  count: number;
  style?: ViewStyle;
}

/** Numeric badge (e.g. cart item count). Hidden when count is 0. */
export function Badge({ count, style }: BadgeProps) {
  const colors = useColors();
  if (count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.primary },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.primaryForeground }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  text: {
    fontSize: FONT_SIZE.tiny,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
  },
});
