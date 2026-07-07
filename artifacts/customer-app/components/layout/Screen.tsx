/**
 * Reusable screen layout containers.
 *
 * Screen              — plain full-screen wrapper
 * ScrollableScreen    — scrollable screen with safe area and tab bar padding
 * KeyboardScreen      — keyboard-aware scrollable form screen
 * SafeBottomContainer — sticky bottom action area (cart button, checkout button, etc.)
 */

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { LAYOUT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Plain full-screen wrapper with background color applied. */
export function Screen({ children, style }: ScreenProps) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

/** Scrollable screen with bottom padding for tab bar + safe area. */
export function ScrollableScreen({ children, style }: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          { paddingBottom: bottomPad + LAYOUT.tabBarHeight + SPACING.xl },
          style,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Keyboard-aware scrollable form screen. */
export function KeyboardScreen({ children, style }: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.flex}
        contentContainerStyle={[{ paddingBottom: bottomPad + SPACING['2xl'] }, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

/** Sticky bottom container that clears Android nav and tab bar. */
export function SafeBottomContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, SPACING.md);

  return (
    <View
      style={[
        styles.stickyBottom,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: bottomPad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  stickyBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
});
