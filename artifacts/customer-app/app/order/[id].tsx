/**
 * Order detail screen.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Divider } from '@/components/ui/Divider';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppButton } from '@/components/ui/AppButton';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { formatPaise } from '@/lib/money';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'dispatched', 'delivered'] as const;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  // TODO: useQuery for order by id via Supabase secure RPC
  const isLoading = true;

  return (
    <Screen>
      <AppHeader title="Order Details" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ gap: SPACING.md }}>
            <Skeleton height={24} width="60%" />
            <Skeleton height={80} />
            <Skeleton height={120} />
            <Skeleton height={100} />
          </View>
        ) : (
          <>
            {/* Order header */}
            <View style={styles.section}>
              <View style={styles.orderHeader}>
                <Text style={[styles.orderNum, { color: colors.foreground }]}>#ORD-000000</Text>
                <StatusBadge status="pending" />
              </View>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>Placed on —</Text>
            </View>
            <Divider />

            {/* Status timeline */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order status</Text>
              {STATUS_STEPS.map((step, i) => (
                <View key={step} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.timelineLabel, { color: colors.mutedForeground }]}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
            <Divider />

            {/* Items */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items</Text>
              <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
                Order items will appear here.
              </Text>
            </View>
            <Divider />

            {/* Delivery address */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery address</Text>
              <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
                Delivery address snapshot will appear here.
              </Text>
            </View>
            <Divider />

            {/* Payment */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment</Text>
              <View style={styles.row}>
                <Feather name="truck" size={16} color={colors.primary} />
                <Text style={[styles.payText, { color: colors.foreground }]}>Cash on Delivery</Text>
              </View>
            </View>

            {/* Reorder action */}
            <View style={[styles.section, { paddingTop: 0 }]}>
              <AppButton label="Reorder" onPress={() => {}} variant="outline" fullWidth />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.base, gap: 0 },
  section: { paddingVertical: SPACING.base, gap: SPACING.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.semibold, fontWeight: FONT_WEIGHT.semibold },
  date: { fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.regular },
  sectionTitle: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.semibold, fontWeight: FONT_WEIGHT.semibold },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xs },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLabel: { fontSize: FONT_SIZE.bodySmall, fontFamily: FONT_FAMILY.regular },
  placeholder: { fontSize: FONT_SIZE.bodySmall, fontFamily: FONT_FAMILY.regular },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  payText: { fontSize: FONT_SIZE.bodySmall, fontFamily: FONT_FAMILY.medium },
});
