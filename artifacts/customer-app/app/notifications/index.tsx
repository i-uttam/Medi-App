/**
 * Notifications screen.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderCardSkeleton } from '@/components/ui/Skeleton';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

export default function NotificationsScreen() {
  const colors = useColors();

  // TODO: useQuery for notifications via Supabase
  const isLoading = true;
  const notifications: [] = [];

  return (
    <Screen>
      <AppHeader title="Notifications" />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          [...Array(4)].map((_, i) => <OrderCardSkeleton key={i} />)
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No notifications"
            description="You're all caught up! Notifications about your orders will appear here."
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.base },
});
