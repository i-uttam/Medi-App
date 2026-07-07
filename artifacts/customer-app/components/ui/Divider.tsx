import { SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface DividerProps {
  marginV?: number;
  style?: ViewStyle;
}

export function Divider({ marginV = SPACING.base, style }: DividerProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border, marginVertical: marginV },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});
