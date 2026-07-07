/**
 * Orders tab — customer order history.
 */

import { OrderCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LAYOUT, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SKELETON_COUNT = 4;

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // TODO: Replace with useQuery for orders from Supabase secure RPC
  const isLoading = true;
  const orders: [] = [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Orders</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + LAYOUT.tabBarHeight + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          [...Array(SKELETON_COUNT)].map((_, i) => <OrderCardSkeleton key={i} />)
        ) : orders.length === 0 ? (
          <EmptyState
            icon="shopping-bag"
            title="No orders yet"
            description="Your orders will appear here once you've placed them."
            actionLabel="Shop now"
            onAction={() => router.push('/(tabs)')}
            style={{ flex: 1, marginTop: SPACING['4xl'] }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scroll: { flex: 1 },
  content: {
    padding: SPACING.base,
    flexGrow: 1,
  },
});
