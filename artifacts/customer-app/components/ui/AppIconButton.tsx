import { Pressable, StyleSheet, ViewStyle } from 'react-native';

interface AppIconButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** Icon-only button with minimum 44×44 touch target. */
export function AppIconButton({
  onPress,
  children,
  style,
  accessibilityLabel,
  disabled,
}: AppIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, { opacity: pressed ? 0.6 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
