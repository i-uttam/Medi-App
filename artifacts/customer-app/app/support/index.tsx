/**
 * Help & Support screen.
 * Contact details are placeholders — real values come from app_settings table.
 * Do NOT hardcode real support contact information.
 */

import { AppHeader } from '@/components/ui/AppHeader';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/layout/Screen';

interface SupportAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}

export default function SupportScreen() {
  const colors = useColors();

  // TODO: Load from app_settings table via Supabase
  const actions: SupportAction[] = [
    {
      icon: 'phone',
      label: 'Call us',
      value: 'Support phone — configure in app settings',
      onPress: () => {},
    },
    {
      icon: 'mail',
      label: 'Email us',
      value: 'Support email — configure in app settings',
      onPress: () => {},
    },
  ];

  return (
    <Screen>
      <AppHeader title="Help & Support" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          We're here to help. Reach out to us through any of the channels below.
        </Text>

        {actions.map((action, i) => (
          <Pressable
            key={i}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
              <Feather name={action.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
              <Text style={[styles.actionValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {action.value}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}

        <View style={[styles.infoBox, { backgroundColor: colors.infoSoft }]}>
          <Feather name="clock" size={16} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Support hours: 9 AM – 9 PM, Monday to Saturday
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.base, gap: SPACING.md },
  intro: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: FONT_SIZE.body * 1.6,
    marginBottom: SPACING.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: { flex: 1 },
  actionLabel: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actionValue: {
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.bodySmall,
    fontFamily: FONT_FAMILY.regular,
  },
});
