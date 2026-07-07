import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

interface BackButtonProps {
  onBack?: () => void;
}

/** Reusable back button. 44×44 touch target. Theme-aware color. */
export function BackButton({ onBack }: BackButtonProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={onBack ?? (() => router.back())}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.55 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
    >
      <Feather name="arrow-left" size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
