/**
 * AddressCard — displays a saved delivery address.
 *
 * IMPORTANT:
 * - Pressing the card (onPress) selects it — it does NOT enter edit mode.
 * - Editing only happens via the explicit onEdit callback (dedicated Edit button).
 */

import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface AddressCardData {
  id: string;
  ownerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
}

interface AddressCardProps {
  address: AddressCardData;
  selected?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}

export function AddressCard({ address, selected, onPress, onEdit }: AddressCardProps) {
  const colors = useColors();

  const addressLines = [
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} — ${address.postalCode}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${address.type} address for ${address.ownerName}`}
      accessibilityState={{ selected }}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primarySoft }]}>
            <Feather
              name={address.type === 'home' ? 'home' : address.type === 'work' ? 'briefcase' : 'map-pin'}
              size={12}
              color={colors.primary}
            />
            <Text style={[styles.typeText, { color: colors.primary }]}>
              {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
            </Text>
          </View>
          {address.isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.defaultText, { color: colors.success }]}>Default</Text>
            </View>
          )}
        </View>
        {selected && (
          <Feather name="check-circle" size={20} color={colors.primary} />
        )}
      </View>

      {/* Name + phone */}
      <Text style={[styles.name, { color: colors.foreground }]}>{address.ownerName}</Text>
      <Text style={[styles.phone, { color: colors.textSecondary }]}>{address.phone}</Text>

      {/* Address lines */}
      <Text style={[styles.address, { color: colors.textSecondary }]}>{addressLines}</Text>

      {/* Edit action — SEPARATE from card press */}
      {onEdit && (
        <Pressable
          onPress={(e) => { e.stopPropagation(); onEdit(); }}
          style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Edit this address"
          hitSlop={8}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  typeText: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  defaultBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  defaultText: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.medium,
  },
  name: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  phone: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
  address: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.bodySmall * 1.6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingVertical: 2,
  },
  editText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
