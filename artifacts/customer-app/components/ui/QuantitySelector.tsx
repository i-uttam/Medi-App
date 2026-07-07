import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, ICON_SIZE, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef } from 'react';

interface QuantitySelectorProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  loading?: boolean;
  disabled?: boolean;
  maxQuantity?: number;
}

const DEBOUNCE_MS = 350;

/** Quantity selector with debounce protection against spam taps. */
export function QuantitySelector({
  quantity,
  onDecrease,
  onIncrease,
  loading,
  disabled,
  maxQuantity,
}: QuantitySelectorProps) {
  const colors = useColors();
  const lastPressRef = useRef(0);

  const debounced = (fn: () => void) => {
    const now = Date.now();
    if (now - lastPressRef.current < DEBOUNCE_MS) return;
    lastPressRef.current = now;
    fn();
  };

  const atMax = maxQuantity !== undefined && quantity >= maxQuantity;

  if (loading) {
    return (
      <View style={[styles.container, { borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
      <Pressable
        onPress={() => debounced(onDecrease)}
        disabled={disabled || quantity <= 0}
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.5 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        hitSlop={8}
      >
        <Feather
          name={quantity === 1 ? 'trash-2' : 'minus'}
          size={ICON_SIZE.sm}
          color={disabled ? colors.mutedForeground : colors.primary}
        />
      </Pressable>
      <Text style={[styles.qty, { color: colors.primary }]}>{quantity}</Text>
      <Pressable
        onPress={() => debounced(onIncrease)}
        disabled={disabled || atMax}
        style={({ pressed }) => [styles.btn, { opacity: pressed || atMax ? 0.5 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={8}
      >
        <Feather
          name="plus"
          size={ICON_SIZE.sm}
          color={atMax ? colors.mutedForeground : colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    height: 34,
  },
  btn: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    width: 28,
    textAlign: 'center',
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
});
