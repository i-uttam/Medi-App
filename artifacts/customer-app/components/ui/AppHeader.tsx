import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from './BackButton';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  noBorder?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  noBorder = false,
}: AppHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topInset,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: noBorder ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? <BackButton onBack={onBack} /> : <View style={styles.spacer} />}
        <View style={styles.center}>
          {title ? (
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{rightAction ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LAYOUT.headerHeight,
    paddingHorizontal: 6,
  },
  spacer: { width: 44 },
  center: { flex: 1, alignItems: 'center' },
  right: { width: 44, alignItems: 'flex-end' },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  subtitle: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 1,
  },
});
