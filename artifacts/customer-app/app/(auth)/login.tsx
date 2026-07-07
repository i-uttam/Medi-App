/**
 * Login screen — phone number entry with India (+91) prefix.
 * Visual shell only. Auth logic pending Supabase phone OTP integration.
 */

import { AppButton } from '@/components/ui/AppButton';
import { Screen } from '@/components/layout/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
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
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const isValid = phone.length === 10 && /^\d+$/.test(phone);

  const handleContinue = () => {
    if (!isValid) return;
    router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
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
            { borderColor: colors.input, backgroundColor: colors.card },
          ]}
        >
          <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
            <Text style={[styles.flag]}>🇮🇳</Text>
            <Text style={[styles.codeText, { color: colors.foreground }]}>+91</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { color: colors.foreground }]}
            placeholder="Enter 10-digit number"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            autoFocus
          />
        </View>

        <AppButton
          label="Continue"
          onPress={handleContinue}
          disabled={!isValid}
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
    marginBottom: SPACING.xl,
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
  btn: { marginBottom: SPACING.xl },
  terms: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: FONT_SIZE.caption * 1.7,
  },
});
