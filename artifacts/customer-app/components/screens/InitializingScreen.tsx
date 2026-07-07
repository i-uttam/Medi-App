/**
 * App initialization / loading screen.
 *
 * Displayed while auth state is being restored (cold start) or
 * while the customer profile is being loaded after session restoration.
 *
 * Renders as an absolute overlay so the navigator can mount beneath
 * it without flashing the wrong screen. Uses the design system so
 * it matches the app's visual identity.
 */

import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function InitializingScreen() {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Brand mark */}
      <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
        <Feather name="plus-circle" size={28} color="#fff" />
      </View>

      <Text style={[styles.appName, { color: colors.primary }]}>MediGo</Text>

      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZE.h2,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING['2xl'],
  },
  spinner: {
    marginTop: SPACING.sm,
  },
});
