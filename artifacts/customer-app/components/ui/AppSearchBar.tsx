import { CONTROL_HEIGHT, FONT_FAMILY, FONT_SIZE, ICON_SIZE, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

interface AppSearchBarProps {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** When set, the bar is non-interactive and tapping calls this (navigates to search screen). */
  onPress?: () => void;
  autoFocus?: boolean;
}

export function AppSearchBar({
  value,
  onChangeText,
  placeholder = 'Search medicines, vitamins…',
  loading,
  onClear,
  onFocus,
  onBlur,
  onPress,
  autoFocus,
}: AppSearchBarProps) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const isReadOnly = !!onPress;

  return (
    <Pressable onPress={onPress} disabled={!isReadOnly} style={styles.pressable}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: colors.border },
          // style.pointerEvents preferred over prop (deprecated)
          isReadOnly ? ({ pointerEvents: 'none' } as any) : undefined,
        ]}
      >
        <Feather name="search" size={ICON_SIZE.md} color={colors.mutedForeground} style={styles.icon} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="search"
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={!isReadOnly}
          accessibilityLabel="Search"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={styles.right} />
        ) : value.length > 0 && onClear ? (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            style={styles.right}
            accessibilityLabel="Clear search"
          >
            <Feather name="x-circle" size={ICON_SIZE.sm} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: '100%' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTROL_HEIGHT.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  icon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    paddingVertical: 0,
  },
  right: { marginLeft: SPACING.sm },
});
