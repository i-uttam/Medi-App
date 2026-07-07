// MediGo Design Token System
// All components must reference these tokens — never hardcode values in screens or components.

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const FONT_SIZE = {
  display: 32,
  h1: 28,
  h2: 24,
  h3: 20,
  title: 18,
  bodyLarge: 16,
  body: 15,
  bodySmall: 14,
  caption: 12,
  tiny: 11,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const FONT_FAMILY = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const ICON_SIZE = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
} as const;

export const CONTROL_HEIGHT = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

export const LAYOUT = {
  screenPaddingH: 16,
  productCardWidth: 158,
  categoryCardSize: 76,
  headerHeight: 56,
  tabBarHeight: 60,
  stickyBottomHeight: 80,
} as const;

export const Z_INDEX = {
  base: 0,
  card: 1,
  header: 10,
  modal: 50,
  toast: 100,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
