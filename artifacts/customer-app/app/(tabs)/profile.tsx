/**
 * Profile tab — account management.
 *
 * Connected to real Supabase auth state via useAuth().
 * Displays real profile data (full_name, phone, email).
 * Logout calls real Supabase signOut, which clears session,
 * profile, and user-scoped TanStack Query cache via AuthProvider.
 *
 * Account deletion:
 *  Secure server-side deletion is not yet implemented.
 *  The Delete Account action shows a clear unavailable-state message.
 *  It does NOT attempt client-side deletion or expose service_role.
 */

import { MenuRow } from '@/components/cards/MenuRow';
import { Divider } from '@/components/ui/Divider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/providers/AuthProvider';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { profile, user, signOut, status } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ── Display values ─────────────────────────────────────────────────────────

  // full_name from profile; fall back to neutral prompt.
  const displayName = profile?.full_name?.trim() || null;
  // Phone from profile (mirrored from Supabase Auth by DB trigger).
  // Fall back to the auth user's phone as secondary source.
  const displayPhone = profile?.phone ?? user?.phone ?? null;
  const displayEmail = profile?.email ?? user?.email ?? null;

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    if (signingOut) return;
    setShowLogoutDialog(false);
    setSigningOut(true);
    try {
      await signOut();
      // Route protection in _layout.tsx handles navigation to login.
    } finally {
      setSigningOut(false);
    }
  };

  // ── Account deletion boundary ──────────────────────────────────────────────

  const handleDeleteAccountConfirm = () => {
    setShowDeleteDialog(false);
    // Secure server-side account deletion is not yet implemented.
    // A verified delete flow (re-authentication + server RPC) is required
    // before this can be completed safely.
    //
    // TODO: Implement secure account deletion via a server-side API
    // that verifies identity, revokes auth session, soft-deletes profile,
    // and schedules data purge according to the privacy policy.
    //
    // Do NOT call DELETE on profiles from the client.
    // Do NOT expose service_role key.
    Alert.alert(
      'Feature coming soon',
      'Account deletion requires a verification step that will be available in an upcoming update. Please contact support if you need your account removed urgently.',
      [{ text: 'OK' }],
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
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
            {displayName ? (
              <Text style={[styles.name, { color: '#fff' }]}>{displayName}</Text>
            ) : (
              <Text style={[styles.namePlaceholder, { color: 'rgba(255,255,255,0.7)' }]}>
                Complete your profile
              </Text>
            )}
            {displayPhone ? (
              <Text style={[styles.phone, { color: 'rgba(255,255,255,0.8)' }]}>
                {displayPhone.startsWith('+91') ? displayPhone : `+91 ${displayPhone}`}
              </Text>
            ) : null}
            {displayEmail ? (
              <Text style={[styles.phone, { color: 'rgba(255,255,255,0.7)' }]}>
                {displayEmail}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Account section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="user"
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
          />
          <MenuRow
            icon="shopping-bag"
            label="My Orders"
            onPress={() => router.push('/(tabs)/orders')}
          />
          <MenuRow
            icon="map-pin"
            label="Saved Addresses"
            onPress={() => router.push('/addresses')}
          />
          <MenuRow icon="tag" label="My Coupons" onPress={() => {}} />
          <MenuRow
            icon="bell"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
        </View>

        <Divider marginV={SPACING.sm} />

        {/* Support section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="help-circle"
            label="Help & Support"
            onPress={() => router.push('/support')}
          />
          <MenuRow icon="shield" label="Privacy Policy" onPress={() => {}} />
          <MenuRow icon="file-text" label="Terms & Conditions" onPress={() => {}} />
          <MenuRow icon="info" label="About MediGo" onPress={() => {}} />
        </View>

        <Divider marginV={SPACING.sm} />

        {/* Danger zone */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="log-out"
            label={signingOut ? 'Signing out…' : 'Log Out'}
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

      {/* Logout confirmation */}
      <ConfirmDialog
        visible={showLogoutDialog}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />

      {/* Delete account */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete account"
        message="This action is permanent and cannot be undone. All your data will be removed."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccountConfirm}
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
  namePlaceholder: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: 'italic',
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
