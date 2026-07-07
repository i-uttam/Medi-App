import { CONTROL_HEIGHT, FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: AppButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const bg = {
    primary: isDisabled ? colors.mutedForeground : colors.primary,
    secondary: colors.secondary,
    outline: colors.background,
    ghost: 'transparent' as const,
    danger: isDisabled ? colors.mutedForeground : colors.destructive,
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.destructiveForeground,
  }[variant];

  const height = { sm: CONTROL_HEIGHT.sm, md: CONTROL_HEIGHT.md, lg: CONTROL_HEIGHT.lg }[size];
  const fontSize = { sm: FONT_SIZE.bodySmall, md: FONT_SIZE.body, lg: FONT_SIZE.bodyLarge }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          height,
          opacity: pressed && !isDisabled ? 0.82 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? colors.primary : undefined,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize, fontFamily: FONT_FAMILY.semibold }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontWeight: FONT_WEIGHT.semibold },
});
