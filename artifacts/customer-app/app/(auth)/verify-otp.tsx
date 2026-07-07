/**
 * OTP Verification screen.
 * Visual shell — full auth implementation pending Supabase phone OTP integration.
 * Do NOT hardcode a test OTP. Do NOT implement fake OTP acceptance.
 */

import { AppButton } from '@/components/ui/AppButton';
import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/layout/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyOtpScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const maskedPhone = phone ? `+91 ${phone.slice(0, 5)}XXXXX` : '+91 XXXXXXXXXX';
  const otpValue = otp.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleChange = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = () => {
    if (!isComplete) return;
    setLoading(true);
    // TODO: Integrate Supabase phone OTP verification
    // supabase.auth.verifyOtp({ phone: `+91${phone}`, token: otpValue, type: 'sms' })
    setTimeout(() => {
      setLoading(false);
      // On success: router.replace('/(tabs)')
    }, 1000);
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    // TODO: supabase.auth.signInWithOtp({ phone: `+91${phone}` })
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <BackButton />
      </View>
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
              ref={(r) => { if (r) inputRefs.current[idx] = r; }}
              value={digit}
              onChangeText={(t) => handleChange(t, idx)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
              keyboardType="number-pad"
              maxLength={1}
              style={[
                styles.otpBox,
                {
                  borderColor: digit ? colors.primary : colors.input,
                  backgroundColor: colors.card,
                  color: colors.foreground,
                },
              ]}
              selectTextOnFocus
              autoFocus={idx === 0}
              accessibilityLabel={`OTP digit ${idx + 1}`}
            />
          ))}
        </View>

        <AppButton
          label="Verify"
          onPress={handleVerify}
          disabled={!isComplete}
          loading={loading}
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
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text style={[styles.resendText, { color: colors.primary }]}>Resend OTP</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.back()} hitSlop={8}>
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
    marginBottom: SPACING['2xl'],
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
  btn: { marginBottom: SPACING.xl },
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
