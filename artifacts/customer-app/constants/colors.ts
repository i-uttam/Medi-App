/**
 * MediGo — Healthcare pharmacy app design tokens.
 * All colors reference this file via the useColors() hook.
 * Never hardcode hex values in components.
 */

const colors = {
  light: {
    // Legacy alias
    text: '#1A1D23',
    tint: '#0A7EA4',

    // Surfaces
    background: '#F7F8FA',
    foreground: '#1A1D23',
    card: '#FFFFFF',
    cardForeground: '#1A1D23',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F2F5',

    // Primary — medical teal
    primary: '#0A7EA4',
    primaryForeground: '#FFFFFF',
    primarySoft: '#E8F5FA',
    primaryDark: '#065F7D',

    // Secondary
    secondary: '#F0F2F5',
    secondaryForeground: '#1A1D23',

    // Text hierarchy
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',

    // Muted
    muted: '#F0F2F5',
    mutedForeground: '#9CA3AF',

    // Accent
    accent: '#E8F5FA',
    accentForeground: '#0A7EA4',

    // Destructive / Error
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',

    // Semantic status
    success: '#16A34A',
    successSoft: '#F0FDF4',
    warning: '#D97706',
    warningSoft: '#FFFBEB',
    error: '#DC2626',
    errorSoft: '#FEF2F2',
    info: '#2563EB',
    infoSoft: '#EFF6FF',

    // Commerce
    discount: '#DC2626',
    discountSoft: '#FEF2F2',

    // Borders
    border: '#E5E7EB',
    input: '#D1D5DB',
  },

  // Border radius shared across cards, buttons, inputs, modals
  radius: 8,
};

export default colors;
