/**
 * Toast notification overlay.
 * Reads from the global Zustand toast store.
 * Place <Toast /> once at the root layout, outside all navigation.
 */

import { ToastEntry, useToastStore } from '@/stores/toast';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, Z_INDEX } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ToastItem({ toast }: { toast: ToastEntry }) {
  const colors = useColors();
  const { hideToast } = useToastStore();

  const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  const colorMap: Record<string, string> = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };

  const bgMap: Record<string, string> = {
    success: colors.successSoft,
    error: colors.errorSoft,
    warning: colors.warningSoft,
    info: colors.infoSoft,
  };

  return (
    <Pressable
      onPress={() => hideToast(toast.id)}
      style={[styles.toast, { backgroundColor: bgMap[toast.type] ?? colors.surfaceSecondary }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Feather name={iconMap[toast.type] ?? 'info'} size={18} color={colorMap[toast.type] ?? colors.foreground} />
      <Text
        style={[styles.message, { color: colors.foreground }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
    </Pressable>
  );
}

export function Toast() {
  const { toasts } = useToastStore();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 80 : insets.top + SPACING.sm;

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: topPad }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.base,
    right: SPACING.base,
    zIndex: Z_INDEX.toast,
    gap: SPACING.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  message: {
    flex: 1,
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
