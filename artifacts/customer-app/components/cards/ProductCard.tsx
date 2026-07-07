import { AppButton } from '@/components/ui/AppButton';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { FONT_FAMILY, FONT_SIZE, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ProductCardData {
  id: string;
  name: string;
  manufacturer?: string;
  packSize?: string;
  pricePaise: number;
  mrpPaise?: number;
  imageUrl?: string;
  inStock: boolean;
  isFeatured?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const colors = useColors();
  const quantity = useCartStore((s) => s.getQuantity(product.id));
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      {/* Product image */}
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceSecondary }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: colors.primarySoft }]} />
        )}
        {!product.inStock && (
          <View style={[styles.outOfStockBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={[styles.outOfStockText, { color: '#fff' }]}>Out of stock</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        {product.manufacturer && (
          <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.manufacturer}
          </Text>
        )}
        {product.packSize && (
          <Text style={[styles.pack, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.packSize}
          </Text>
        )}
        <PriceDisplay
          pricePaise={product.pricePaise}
          mrpPaise={product.mrpPaise}
          size="sm"
          style={styles.price}
        />

        {/* Add / quantity selector */}
        {product.inStock ? (
          quantity > 0 ? (
            <QuantitySelector
              quantity={quantity}
              onDecrease={() => updateQuantity(product.id, quantity - 1)}
              onIncrease={() => updateQuantity(product.id, quantity + 1)}
              maxQuantity={10}
            />
          ) : (
            <AppButton
              label="Add"
              onPress={() => addItem(product.id, { pricePaise: product.pricePaise, name: product.name })}
              size="sm"
              fullWidth
            />
          )
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: LAYOUT.productCardWidth,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  imageWrap: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageFallback: { width: '100%', height: '100%' },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 4,
  },
  outOfStockText: {
    fontSize: FONT_SIZE.tiny,
    fontFamily: FONT_FAMILY.medium,
  },
  body: {
    padding: SPACING.sm,
    gap: 3,
  },
  name: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: FONT_SIZE.bodySmall * 1.4,
  },
  sub: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
  },
  pack: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
  },
  price: { marginTop: 2, marginBottom: 6 },
});
