import { AppButton } from '@/components/ui/AppButton';
import { FONT_FAMILY, FONT_SIZE, ICON_SIZE, SPACING } from '@/constants/theme';
import { getUserFacingError } from '@/lib/errors';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface ErrorStateProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({ error, message, onRetry, style }: ErrorStateProps) {
  const colors = useColors();
  const displayMessage = message ?? getUserFacingError(error);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.errorSoft }]}>
        <Feather name="alert-circle" size={ICON_SIZE['2xl']} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{displayMessage}</Text>
      {onRetry && (
        <AppButton label="Try again" onPress={onRetry} variant="outline" style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontFamily: FONT_FAMILY.semibold,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: FONT_SIZE.body * 1.55,
  },
  btn: { marginTop: SPACING.sm },
});
