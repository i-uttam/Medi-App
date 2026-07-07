import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ title, onSeeAll, style }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll && (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  seeAll: {
    fontSize: FONT_SIZE.bodySmall,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
  },
});
