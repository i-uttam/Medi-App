/**
 * Skeleton loading components.
 * Uses Animated API for shimmer — compatible with web and native.
 */

import { LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Platform, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = RADIUS.md, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as DimensionValue, height, borderRadius, backgroundColor: colors.surfaceSecondary, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton for a ProductCard in the horizontal list. */
export function ProductCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.productCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Skeleton height={100} borderRadius={RADIUS.md} style={styles.productImg} />
      <View style={styles.productBody}>
        <Skeleton height={10} width="80%" />
        <Skeleton height={9} width="60%" style={{ marginTop: SPACING.xs }} />
        <Skeleton height={12} width="50%" style={{ marginTop: SPACING.sm }} />
      </View>
    </View>
  );
}

/** Skeleton for an OrderCard in the orders list. */
export function OrderCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.orderCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.orderRow}>
        <Skeleton height={12} width={120} />
        <Skeleton height={20} width={80} borderRadius={RADIUS.sm} />
      </View>
      <Skeleton height={10} width="70%" style={{ marginTop: SPACING.sm }} />
      <Skeleton height={10} width="40%" style={{ marginTop: SPACING.xs }} />
    </View>
  );
}

/** Skeleton for a CategoryCard. */
export function CategoryCardSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.categoryCard}>
      <Skeleton
        width={LAYOUT.categoryCardSize}
        height={LAYOUT.categoryCardSize}
        borderRadius={RADIUS.lg}
        style={{ backgroundColor: colors.surfaceSecondary }}
      />
      <Skeleton height={9} width={LAYOUT.categoryCardSize - 8} style={{ marginTop: SPACING.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    width: LAYOUT.productCardWidth,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  productImg: {
    width: '100%',
  },
  productBody: {
    padding: SPACING.sm,
    gap: 4,
  },
  orderCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
});
