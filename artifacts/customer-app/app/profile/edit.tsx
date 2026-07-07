/**
 * Edit profile screen.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { KeyboardScreen } from '@/components/layout/Screen';
import { SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/stores/toast';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen } from '@/components/layout/Screen';

export default function EditProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();

  // TODO: load from Supabase session
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: update profile via Supabase secure RPC
    setTimeout(() => {
      setLoading(false);
      toast.success('Profile updated');
      router.back();
    }, 800);
  };

  return (
    <Screen>
      <AppHeader title="Edit Profile" />
      <KeyboardScreen style={{ padding: SPACING.base }}>
        <AppTextInput
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />
        <AppTextInput
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppTextInput
          label="Phone number"
          value=""
          editable={false}
          disabled
          placeholder="Phone number (cannot be changed)"
          helperText="Phone number is linked to your account and cannot be changed here."
        />
        <AppButton
          label="Save Changes"
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.lg }}
        />
      </KeyboardScreen>
    </Screen>
  );
}
