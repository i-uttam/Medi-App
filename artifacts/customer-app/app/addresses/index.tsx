/**
 * Address list screen.
 * IMPORTANT: Tapping a card SELECTS it. Edit is only via the dedicated Edit button.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AddressCard, AddressCardData } from '@/components/cards/AddressCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeBottomContainer } from '@/components/layout/Screen';
import { SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { useState } from 'react';

export default function AddressesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  // TODO: useQuery for user addresses via Supabase secure RPC
  const isLoading = true;
  const addresses: AddressCardData[] = [];

  return (
    <Screen>
      <AppHeader title="Saved Addresses" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} height={120} borderRadius={12} style={{ marginBottom: SPACING.md }} />
          ))
        ) : addresses.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="No saved addresses"
            description="Add a delivery address to get started."
          />
        ) : (
          addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              selected={selected === addr.id}
              onPress={() => setSelected(addr.id)}
              onEdit={() => router.push({ pathname: '/addresses/[id]/edit', params: { id: addr.id } })}
            />
          ))
        )}
      </ScrollView>

      <SafeBottomContainer>
        <AppButton
          label="Add New Address"
          onPress={() => router.push('/addresses/create')}
          fullWidth
          variant="outline"
        />
      </SafeBottomContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.base },
});
