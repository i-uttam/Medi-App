import { FONT_FAMILY, FONT_SIZE, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MenuRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
}

export function MenuRow({ icon, label, onPress, destructive, rightElement }: MenuRowProps) {
  const colors = useColors();
  const color = destructive ? colors.destructive : colors.foreground;
  const iconColor = destructive ? colors.destructive : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, { backgroundColor: destructive ? colors.errorSoft : colors.primarySoft }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.label, { color, flex: 1 }]}>{label}</Text>
      {rightElement ?? <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
  },
});
