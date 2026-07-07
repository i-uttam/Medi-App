import { FONT_FAMILY, FONT_SIZE, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface CategoryCardData {
  id: string;
  name: string;
  imageUrl?: string;
}

interface CategoryCardProps {
  category: CategoryCardData;
  onPress: () => void;
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const colors = useColors();
  const size = LAYOUT.categoryCardSize;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.8 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      <View style={[styles.imageWrap, { width: size, height: size, backgroundColor: colors.primarySoft }]}>
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.primarySoft }]} />
        )}
      </View>
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: LAYOUT.categoryCardSize + 12,
    marginRight: SPACING.md,
  },
  imageWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%' },
  name: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    lineHeight: FONT_SIZE.caption * 1.4,
  },
});
