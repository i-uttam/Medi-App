/**
 * Temporary Email + Password authentication screen.
 *
 * TEMPORARY DEVELOPMENT FEATURE — DO NOT ENABLE FOR PRODUCTION RELEASE.
 *
 * This screen is only accessible when ENABLE_TEMPORARY_EMAIL_AUTH is true.
 * If the flag is false and the route is opened manually, it redirects to Login.
 *
 * Design:
 *  - Uses the existing design system (AppHeader, AppTextInput, AppButton, Screen).
 *  - Supports Sign In, Create Account, and Forgot Password modes on a single screen.
 *  - Password values exist only in component memory; never logged, stored,
 *    passed through route params, or written to AsyncStorage.
 *
 * Auth flow:
 *  - Calls centralized signInWithEmailPassword / signUpWithEmailPassword /
 *    sendPasswordResetEmail from features/auth/api/auth.ts.
 *  - On successful sign-in/sign-up, the existing onAuthStateChange listener in
 *    AuthProvider receives SIGNED_IN and handles navigation — this screen does
 *    NOT manually navigate to Home or set any auth state.
 *  - Blocked-customer, profile-loading, and protected-route logic is unchanged.
 *
 * Security:
 *  - No hardcoded credentials.
 *  - No fake sessions or auth bypasses.
 *  - No service_role usage.
 *  - Phone OTP authentication is preserved and unchanged.
 */

import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Screen } from '@/components/layout/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ENABLE_TEMPORARY_EMAIL_AUTH } from '@/constants/features';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import {
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from '@/features/auth/api/auth';
import {
  emailSignInSchema,
  emailSignUpSchema,
  type EmailSignInValues,
  type EmailSignUpValues,
} from '@/features/auth/schemas/email';
import { useColors } from '@/hooks/useColors';
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

type Mode = 'signin' | 'signup' | 'forgot';

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email('Enter a valid email address.')),
});
type ForgotValues = z.infer<typeof forgotSchema>;

export default function EmailAuthScreen() {
  const colors = useColors();
  const router = useRouter();

  // Guard — redirect to Login if the flag is disabled.
  useEffect(() => {
    if (!ENABLE_TEMPORARY_EMAIL_AUTH) {
      router.replace('/(auth)/login');
    }
  }, [router]);

  const [mode, setMode] = useState<Mode>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Shown after Sign Up when email confirmation is required.
  const [confirmationPending, setConfirmationPending] = useState(false);
  // Shown after Forgot Password is sent.
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // ── Sign In form ─────────────────────────────────────────────────────────

  const signInForm = useForm<EmailSignInValues>({
    resolver: zodResolver(emailSignInSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Sign Up form ─────────────────────────────────────────────────────────

  const signUpForm = useForm<EmailSignUpValues>({
    resolver: zodResolver(emailSignUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  // ── Forgot Password form ─────────────────────────────────────────────────

  const forgotForm = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  // Clear errors and notices when switching modes.
  const switchMode = (next: Mode) => {
    setFormError(null);
    setConfirmationPending(false);
    setResetEmailSent(false);
    signInForm.reset();
    signUpForm.reset();
    forgotForm.reset();
    setMode(next);
  };

  // ── Sign In submit ───────────────────────────────────────────────────────

  const handleSignIn = signInForm.handleSubmit(async (values) => {
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await signInWithEmailPassword(values.email, values.password);
      if (error) {
        setFormError(error);
        return;
      }
      // Success: AuthProvider's onAuthStateChange (SIGNED_IN) handles navigation.
      signInForm.setValue('password', '');
    } finally {
      setSubmitting(false);
    }
  });

  // ── Sign Up submit ───────────────────────────────────────────────────────

  const handleSignUp = signUpForm.handleSubmit(async (values) => {
    if (submitting) return;
    setFormError(null);
    setConfirmationPending(false);
    setSubmitting(true);
    try {
      const { error, requiresEmailConfirmation } = await signUpWithEmailPassword(
        values.email,
        values.password,
      );
      if (error) {
        setFormError(error);
        return;
      }
      if (requiresEmailConfirmation) {
        setConfirmationPending(true);
        signUpForm.setValue('password', '');
        signUpForm.setValue('confirmPassword', '');
        // Switch to Sign In so the user can proceed after confirming.
        const email = values.email;
        setMode('signin');
        signInForm.setValue('email', email);
        return;
      }
      // Session returned — AuthProvider handles navigation.
      signUpForm.setValue('password', '');
      signUpForm.setValue('confirmPassword', '');
    } finally {
      setSubmitting(false);
    }
  });

  // ── Forgot Password submit ───────────────────────────────────────────────

  const handleForgot = forgotForm.handleSubmit(async (values) => {
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await sendPasswordResetEmail(values.email);
      if (error) {
        setFormError(error);
        return;
      }
      // Always show "check your email" — Supabase doesn't enumerate addresses.
      setResetEmailSent(true);
    } finally {
      setSubmitting(false);
    }
  });

  // Don't render the form if the flag is off (redirect fires via useEffect).
  if (!ENABLE_TEMPORARY_EMAIL_AUTH) return null;

  const headerTitle = mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password';

  return (
    <Screen>
      <AppHeader title={headerTitle} showBack />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Development indicator */}
        <View style={[styles.devBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.devBadgeText, { color: colors.mutedForeground }]}>
            Temporary development login
          </Text>
        </View>

        {/* Email confirmation pending notice */}
        {confirmationPending && (
          <View style={[styles.infoBox, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Feather name="mail" size={16} color={colors.primary} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Check your email to confirm your account, then sign in below.
            </Text>
          </View>
        )}

        {/* ── Forgot Password mode ──────────────────────────────────────── */}
        {mode === 'forgot' && (
          <View style={styles.form}>
            {resetEmailSent ? (
              <View style={[styles.infoBox, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
                <Feather name="check-circle" size={16} color={colors.success} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: colors.success }]}>
                  If that email is registered, you'll receive a password reset link shortly.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.forgotDesc, { color: colors.textSecondary }]}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                <Controller
                  control={forgotForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Email"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleForgot}
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />

                {formError ? (
                  <Text style={[styles.formError, { color: colors.destructive }]}>
                    {formError}
                  </Text>
                ) : null}

                <AppButton
                  label="Send Reset Link"
                  onPress={handleForgot}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                  style={styles.submitBtn}
                />
              </>
            )}

            <TouchableOpacity
              onPress={() => switchMode('signin')}
              style={styles.backToSignIn}
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={14} color={colors.primary} />
              <Text style={[styles.backToSignInText, { color: colors.primary }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sign In / Sign Up mode tabs ───────────────────────────────── */}
        {mode !== 'forgot' && (
          <>
            <View style={[styles.tabRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  mode === 'signin' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => switchMode('signin')}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'signin' }}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: mode === 'signin' ? colors.primary : colors.mutedForeground,
                      fontFamily: mode === 'signin' ? FONT_FAMILY.semibold : FONT_FAMILY.regular,
                      fontWeight: mode === 'signin' ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                    },
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  mode === 'signup' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => switchMode('signup')}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'signup' }}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: mode === 'signup' ? colors.primary : colors.mutedForeground,
                      fontFamily: mode === 'signup' ? FONT_FAMILY.semibold : FONT_FAMILY.regular,
                      fontWeight: mode === 'signup' ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                    },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Sign In form ────────────────────────────────────────── */}
            {mode === 'signin' && (
              <View style={styles.form}>
                <Controller
                  control={signInForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Email"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />
                <Controller
                  control={signInForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Password"
                      placeholder="Enter your password"
                      secureTextEntry
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={handleSignIn}
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />

                {/* Forgot Password link */}
                <TouchableOpacity
                  onPress={() => switchMode('forgot')}
                  style={styles.forgotLink}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={[styles.forgotLinkText, { color: colors.primary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                {formError ? (
                  <Text style={[styles.formError, { color: colors.destructive }]}>
                    {formError}
                  </Text>
                ) : null}

                <AppButton
                  label="Sign In"
                  onPress={handleSignIn}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* ── Sign Up form ────────────────────────────────────────── */}
            {mode === 'signup' && (
              <View style={styles.form}>
                <Controller
                  control={signUpForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Email"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />
                <Controller
                  control={signUpForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Password"
                      placeholder="At least 8 characters"
                      secureTextEntry
                      autoComplete="new-password"
                      returnKeyType="next"
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />
                <Controller
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <AppTextInput
                      label="Confirm Password"
                      placeholder="Re-enter your password"
                      secureTextEntry
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      value={field.value}
                      onChangeText={(v) => {
                        field.onChange(v);
                        if (formError) setFormError(null);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      disabled={submitting}
                    />
                  )}
                />

                {formError ? (
                  <Text style={[styles.formError, { color: colors.destructive }]}>
                    {formError}
                  </Text>
                ) : null}

                <AppButton
                  label="Create Account"
                  onPress={handleSignUp}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                  style={styles.submitBtn}
                />
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING['2xl'],
  },
  devBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.xl,
  },
  devBadgeText: {
    fontSize: FONT_SIZE.tiny,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoIcon: { marginTop: 1 },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.bodySmall * 1.6,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tabText: {
    fontSize: FONT_SIZE.body,
  },
  form: {
    gap: SPACING.xs,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  forgotLinkText: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  forgotDesc: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.body * 1.6,
    marginBottom: SPACING.lg,
  },
  formError: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  submitBtn: {
    marginTop: SPACING.md,
  },
  backToSignIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xl,
    alignSelf: 'center',
  },
  backToSignInText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
