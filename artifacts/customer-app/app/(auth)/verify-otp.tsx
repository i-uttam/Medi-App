/**
 * OTP Verification screen.
 *
 * Real Supabase phone OTP verification flow:
 *  1. User enters 6-digit OTP received via SMS.
 *  2. Real Supabase Auth verifyOtp called.
 *  3. On success: onAuthStateChange listener in AuthProvider handles session
 *     and profile load → route protection navigates to (tabs) automatically.
 *  4. On failure: user-safe error shown, retry enabled.
 *
 * Route params:
 *  - phone: normalized E.164 string (e.g. "+919876543210")
 *    This is safe — it is not a secret. The OTP is never stored or passed.
 *
 * Security:
 *  - OTP exists only in component state (never persisted).
 *  - No hardcoded OTP, no bypass logic, no fake session creation.
 *  - Verify button disabled while request is pending (prevents duplicate calls).
 *  - After successful verification: navigation uses replace semantics via
 *    route protection in AuthProvider — user cannot Back to this screen.
 *  - Resend uses real Supabase OTP request with UI cooldown.
 */

import { AppButton } from '@/components/ui/AppButton';
import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/layout/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { requestPhoneOtp, verifyPhoneOtp } from '@/features/auth/api/auth';
import { maskPhone } from '@/features/auth/utils/phone';
import { useColors } from '@/hooks/useColors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtpScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<TextInput[]>([]);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const maskedPhone = phone ? maskPhone(phone) : '+91 XXXXXXXXXX';
  const otpValue = otp.join('');
  const isComplete = otpValue.length === OTP_LENGTH && /^\d{6}$/.test(otpValue);

  // ── Resend countdown ────────────────────────────────────────────────────────

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // ── OTP input handlers ──────────────────────────────────────────────────────

  const handleChange = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError(null);
    setResendSuccess(false);

    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  // ── Verify ──────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!isComplete || verifying || !phone) return;

    setError(null);
    setVerifying(true);
    try {
      const { error: verifyError, shouldResend } = await verifyPhoneOtp(phone, otpValue);

      if (verifyError) {
        setError(verifyError);
        if (shouldResend) {
          // Clear OTP and prompt for resend
          setOtp(Array(OTP_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        }
        return;
      }

      // Success: Supabase session is now set.
      // The AuthProvider's onAuthStateChange → SIGNED_IN handler fires,
      // loads the profile, then route protection in _layout.tsx navigates
      // to /(tabs) using replace semantics (no Back to this screen).
      // No manual navigation needed here.

    } finally {
      setVerifying(false);
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (timer > 0 || resending || !phone) return;

    setError(null);
    setResendSuccess(false);
    setResending(true);

    try {
      const { error: resendError } = await requestPhoneOtp(phone);

      if (resendError) {
        setError(resendError);
        return;
      }

      // Successful resend
      setTimer(RESEND_COOLDOWN_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendSuccess(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setResending(false);
    }
  };

  // ── Change phone number ─────────────────────────────────────────────────────

  const handleChangePhone = () => {
    // OTP state is in component memory only — cleared on unmount.
    // Use replace (not back) so the OTP screen is removed from history.
    // Android Back from login will exit the auth group, not return to OTP.
    router.replace('/(auth)/login');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Screen>
      {/* No BackButton — login→OTP uses replace navigation.
          "Change phone number" link below provides the explicit back action. */}
      <View style={[styles.header, { paddingTop: topPad }]} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.foreground }]}>Verify your number</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          We sent a 6-digit code to{' '}
          <Text style={{ color: colors.foreground, fontFamily: FONT_FAMILY.semibold }}>
            {maskedPhone}
          </Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => {
                if (r) inputRefs.current[idx] = r;
              }}
              value={digit}
              onChangeText={(t) => handleChange(t, idx)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
              keyboardType="number-pad"
              maxLength={1}
              style={[
                styles.otpBox,
                {
                  borderColor: error
                    ? (colors.destructive ?? '#DC2626')
                    : digit
                    ? colors.primary
                    : colors.input,
                  backgroundColor: colors.card,
                  color: colors.foreground,
                },
              ]}
              selectTextOnFocus
              autoFocus={idx === 0}
              editable={!verifying}
              accessibilityLabel={`OTP digit ${idx + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </View>

        {/* Error message */}
        {error ? (
          <Text style={[styles.feedbackText, { color: colors.destructive ?? '#DC2626' }]}>
            {error}
          </Text>
        ) : resendSuccess ? (
          <Text style={[styles.feedbackText, { color: colors.primary }]}>
            New verification code sent.
          </Text>
        ) : null}

        <AppButton
          label="Verify"
          onPress={handleVerify}
          disabled={!isComplete || verifying}
          loading={verifying}
          fullWidth
          size="lg"
          style={styles.btn}
        />

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
            Didn't receive a code?{' '}
          </Text>
          {timer > 0 ? (
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
              Resend in {timer}s
            </Text>
          ) : (
            <Pressable
              onPress={handleResend}
              disabled={resending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Resend OTP"
            >
              <Text
                style={[
                  styles.resendText,
                  { color: resending ? colors.mutedForeground : colors.primary },
                ]}
              >
                {resending ? 'Sending…' : 'Resend OTP'}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleChangePhone}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change phone number"
        >
          <Text style={[styles.changePhone, { color: colors.primary }]}>
            Change phone number
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 6 },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING['3xl'],
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
    marginBottom: SPACING['2xl'],
  },
  otpRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: FONT_SIZE.h3,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  feedbackText: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  btn: { marginBottom: SPACING.xl, marginTop: SPACING.md },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  resendText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
  changePhone: {
    textAlign: 'center',
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    paddingVertical: SPACING.sm,
  },
});
