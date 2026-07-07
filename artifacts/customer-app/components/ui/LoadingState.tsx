import { useColors } from '@/hooks/useColors';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';

interface LoadingStateProps {
  style?: ViewStyle;
}

export function LoadingState({ style }: LoadingStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
