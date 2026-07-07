/**
 * Login screen — phone number entry with India (+91) prefix.
 *
 * Real Supabase phone OTP flow:
 *  1. User enters 10-digit mobile number.
 *  2. Validated and normalized to +91XXXXXXXXXX (E.164).
 *  3. Real Supabase Auth OTP request sent.
 *  4. On Supabase success → navigate to OTP verification.
 *  5. On failure → show user-safe error message, re-enable input.
 *
 * Security:
 *  - No hardcoded OTP, no test credentials, no bypass logic.
 *  - Phone navigated as normalized E.164 only — no OTP in route state.
 *  - Button disabled while request is pending (prevents duplicate requests).
 */

import { AppButton } from '@/components/ui/AppButton';
import { Screen } from '@/components/layout/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { requestPhoneOtp } from '@/features/auth/api/auth';
import { normalizeIndianPhone } from '@/features/auth/utils/phone';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Basic local validation: exactly 10 digits
  const isLocallyValid = phone.length === 10 && /^\d+$/.test(phone);

  const handleContinue = async () => {
    if (loading || !isLocallyValid) return;

    setError(null);

    // Normalize to E.164 before sending to Supabase
    const { normalized, error: normError } = normalizeIndianPhone(phone);
    if (!normalized || normError) {
      setError(normError ?? 'Invalid phone number.');
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await requestPhoneOtp(normalized);

      if (otpError) {
        setError(otpError);
        return;
      }

      // Navigate ONLY after Supabase confirms the OTP was accepted.
      // Use replace (not push) so the login screen is NOT in the back stack —
      // Android Back from OTP cannot return to login.
      // The "Change phone number" link on OTP uses explicit replace back.
      router.replace({ pathname: '/(auth)/verify-otp', params: { phone: normalized } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + SPACING['2xl'], paddingBottom: bottomPad + SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand mark */}
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Feather name="plus-circle" size={28} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.primary }]}>MediGo</Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          Sign in with your phone number to continue ordering.
        </Text>

        {/* Phone input */}
        <View style={styles.inputLabel}>
          <Text style={[styles.label, { color: colors.foreground }]}>Phone number</Text>
        </View>
        <View
          style={[
            styles.phoneRow,
            {
              borderColor: error ? (colors.destructive ?? '#DC2626') : colors.input,
              backgroundColor: colors.card,
            },
          ]}
        >
          <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={[styles.codeText, { color: colors.foreground }]}>+91</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { color: colors.foreground }]}
            placeholder="Enter 10-digit number"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={(t) => {
              setPhone(t.replace(/\D/g, '').slice(0, 10));
              if (error) setError(null);
            }}
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            autoFocus
            editable={!loading}
          />
        </View>

        {/* Inline error message */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive ?? '#DC2626' }]}>
            {error}
          </Text>
        ) : null}

        <AppButton
          label="Continue"
          onPress={handleContinue}
          disabled={!isLocallyValid || loading}
          loading={loading}
          fullWidth
          size="lg"
          style={styles.btn}
        />

        {/* Terms */}
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          By continuing, you agree to our{' '}
          <Text
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL('https://example.com/terms')}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL('https://example.com/privacy')}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
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
  heading: {
    fontSize: FONT_SIZE.h2,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  subtext: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.body * 1.6,
    marginBottom: SPACING.xl,
  },
  inputLabel: { marginBottom: SPACING.xs },
  label: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 18 },
  codeText: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.bodyLarge,
    fontFamily: FONT_FAMILY.regular,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  btn: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  terms: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: FONT_SIZE.caption * 1.7,
  },
});
