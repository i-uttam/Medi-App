import { CONTROL_HEIGHT, FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

interface AppTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export function AppTextInput({
  label,
  error,
  helperText,
  leftIcon,
  rightAction,
  disabled,
  secureTextEntry,
  containerStyle,
  ...props
}: AppTextInputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error ? colors.destructive : focused ? colors.primary : colors.input;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: disabled ? colors.muted : colors.card,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.rightIcon}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : rightAction ? (
          <View style={styles.rightIcon}>{rightAction}</View>
        ) : null}
      </View>
      {/* Reserve minimum height to prevent layout jump on error */}
      <Text
        style={[styles.hint, { color: error ? colors.destructive : colors.mutedForeground }]}
        numberOfLines={1}
      >
        {error ?? helperText ?? ' '}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.xs },
  label: {
    fontSize: FONT_SIZE.bodySmall,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTROL_HEIGHT.md,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  leftIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    paddingVertical: 0,
  },
  rightIcon: { marginLeft: SPACING.sm },
  hint: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 3,
    minHeight: 16,
  },
});
