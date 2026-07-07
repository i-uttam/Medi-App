/**
 * Blocked account screen.
 *
 * Shown when the customer's profile.status = 'blocked'.
 * The customer cannot access commerce routes.
 *
 * What is displayed:
 *  - Clear, non-technical explanation of restricted access.
 *  - Support contact action.
 *  - Sign out action.
 *
 * What is NOT displayed:
 *  - Internal status names ('blocked', 'status').
 *  - Admin notes or block_reason.
 *  - Security implementation details.
 *
 * Security note: the backend (RLS + SECURITY DEFINER RPCs) already
 * prevents blocked users from performing commerce mutations. This screen
 * is an additional UI-layer defence, not the sole security boundary.
 */

import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/providers/AuthProvider';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlockedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@medigo.app?subject=Account%20Access%20Issue');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          { paddingTop: topPad + SPACING['2xl'], paddingBottom: bottomPad + SPACING.xl },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.errorSoft }]}>
          <Feather name="shield-off" size={32} color={colors.destructive} />
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>
          Account access restricted
        </Text>

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your account has been temporarily restricted. If you believe this is an
          error or need help, please contact our support team.
        </Text>

        <AppButton
          label="Contact Support"
          onPress={handleContactSupport}
          fullWidth
          size="lg"
          variant="outline"
          style={styles.supportBtn}
        />

        <AppButton
          label={signingOut ? 'Signing out…' : 'Sign Out'}
          onPress={handleSignOut}
          disabled={signingOut}
          loading={signingOut}
          fullWidth
          size="lg"
          style={styles.signOutBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  heading: {
    fontSize: FONT_SIZE.h2,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.body * 1.6,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
  },
  supportBtn: { marginBottom: SPACING.md },
  signOutBtn: {},
});
