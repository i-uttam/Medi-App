/**
 * Edit address screen.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { KeyboardScreen } from '@/components/layout/Screen';
import { LoadingState } from '@/components/ui/LoadingState';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/stores/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/layout/Screen';

const addressSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  addressLine1: z.string().min(5, 'Address is too short'),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit postal code'),
  type: z.enum(['home', 'work', 'other']),
  isDefault: z.boolean(),
});

type AddressForm = z.infer<typeof addressSchema>;

const ADDRESS_TYPES = [
  { value: 'home' as const, label: 'Home' },
  { value: 'work' as const, label: 'Work' },
  { value: 'other' as const, label: 'Other' },
];

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();

  // TODO: useQuery to fetch existing address by id
  const isLoading = false;

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      postalCode: '',
      type: 'home',
      isDefault: false,
    },
  });

  const onSubmit = async (data: AddressForm) => {
    // TODO: Call secure Supabase RPC to update address by id
    toast.success('Address updated');
    router.back();
  };

  if (isLoading) return <LoadingState />;

  return (
    <Screen>
      <AppHeader title="Edit Address" />
      <KeyboardScreen style={{ padding: SPACING.base }}>
        <Controller control={control} name="fullName" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Full name" value={value} onChangeText={onChange} error={errors.fullName?.message} placeholder="Full name" />
        )} />
        <Controller control={control} name="phone" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Phone number" value={value} onChangeText={onChange} error={errors.phone?.message} placeholder="10-digit number" keyboardType="number-pad" maxLength={10} />
        )} />
        <Controller control={control} name="addressLine1" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Address line 1" value={value} onChangeText={onChange} error={errors.addressLine1?.message} placeholder="House/flat, street" />
        )} />
        <Controller control={control} name="addressLine2" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Address line 2 (optional)" value={value} onChangeText={onChange} placeholder="Apartment, area" />
        )} />
        <Controller control={control} name="landmark" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Landmark (optional)" value={value} onChangeText={onChange} placeholder="Near landmark" />
        )} />
        <View style={styles.row}>
          <Controller control={control} name="city" render={({ field: { value, onChange } }) => (
            <AppTextInput label="City" value={value} onChangeText={onChange} error={errors.city?.message} placeholder="City" containerStyle={styles.half} />
          )} />
          <Controller control={control} name="state" render={({ field: { value, onChange } }) => (
            <AppTextInput label="State" value={value} onChangeText={onChange} error={errors.state?.message} placeholder="State" containerStyle={styles.half} />
          )} />
        </View>
        <Controller control={control} name="postalCode" render={({ field: { value, onChange } }) => (
          <AppTextInput label="Postal code" value={value} onChangeText={onChange} error={errors.postalCode?.message} placeholder="6-digit PIN" keyboardType="number-pad" maxLength={6} />
        )} />

        <Text style={[styles.typeLabel, { color: colors.foreground }]}>Address type</Text>
        <Controller control={control} name="type" render={({ field: { value, onChange } }) => (
          <View style={styles.typeRow}>
            {ADDRESS_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => onChange(t.value)}
                accessibilityRole="radio"
                accessibilityLabel={`Address type: ${t.label}`}
                accessibilityState={{ checked: value === t.value }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: value === t.value ? colors.primarySoft : colors.surfaceSecondary,
                    borderColor: value === t.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.typeChipText, { color: value === t.value ? colors.primary : colors.textSecondary }]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )} />

        <View style={{ height: SPACING['2xl'] }} />
        <AppButton label="Update Address" onPress={handleSubmit(onSubmit)} loading={isSubmitting} fullWidth size="lg" />
      </KeyboardScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm },
  half: { flex: 1 },
  typeLabel: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.sm,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  typeChip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  typeChipText: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});
