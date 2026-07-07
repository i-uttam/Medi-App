/**
 * Profile tab — account management.
 */

import { MenuRow } from '@/components/cards/MenuRow';
import { Divider } from '@/components/ui/Divider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/stores/cart';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearCart = useCartStore((s) => s.clearCart);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // TODO: Replace with real authenticated user from Supabase session
  const user = { name: '', phone: '', email: '' };

  const handleLogout = () => {
    clearCart();
    setShowLogoutDialog(false);
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + LAYOUT.tabBarHeight + SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: '#fff' }]}>
              {user.name || 'Your Name'}
            </Text>
            <Text style={[styles.phone, { color: 'rgba(255,255,255,0.8)' }]}>
              {user.phone ? `+91 ${user.phone}` : 'Phone not set'}
            </Text>
          </View>
        </View>

        {/* Account section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow icon="shopping-bag" label="My Orders" onPress={() => router.push('/(tabs)/orders')} />
          <MenuRow icon="map-pin" label="Saved Addresses" onPress={() => router.push('/addresses')} />
          <MenuRow icon="tag" label="My Coupons" onPress={() => {}} />
          <MenuRow icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        </View>

        <Divider marginV={SPACING.sm} />

        {/* Support section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow icon="help-circle" label="Help & Support" onPress={() => router.push('/support')} />
          <MenuRow icon="shield" label="Privacy Policy" onPress={() => {}} />
          <MenuRow icon="file-text" label="Terms & Conditions" onPress={() => {}} />
          <MenuRow icon="info" label="About MediGo" onPress={() => {}} />
        </View>

        <Divider marginV={SPACING.sm} />

        {/* Danger zone */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="log-out"
            label="Log Out"
            onPress={() => setShowLogoutDialog(true)}
            destructive
          />
          <MenuRow
            icon="trash-2"
            label="Delete Account"
            onPress={() => setShowDeleteDialog(true)}
            destructive
          />
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>MediGo v1.0.0</Text>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete account"
        message="This action is permanent and cannot be undone. All your data will be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => setShowDeleteDialog(false)}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scroll: { flex: 1 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.base,
    margin: SPACING.base,
    borderRadius: RADIUS.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  name: {
    fontSize: FONT_SIZE.bodyLarge,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  phone: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  section: { marginHorizontal: SPACING.base, borderRadius: RADIUS.lg, overflow: 'hidden' },
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
});
