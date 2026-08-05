// src/theme.js — Faqih Design System
// Palette/type system matches the Material Design 3 reference: green primary,
// blue secondary, orange tertiary, gray neutral, Plus Jakarta Sans typeface.

export const colors = {
  // Primary — green
  primary:        '#43A047',
  primaryLight:   '#66BB6A',
  primaryDark:    '#1B5E20',
  primaryPale:    '#E8F5E9',

  // Secondary — blue
  secondary:      '#1E88E5',
  secondaryLight: '#64B5F6',
  secondaryPale:  '#E3F2FD',

  // Tertiary accent — orange (kept as `gold`/`goldLight`/`goldPale` so every
  // existing accent usage across the app picks up the new hue automatically)
  gold:           '#FB8C00',
  goldLight:      '#FFB74D',
  goldPale:       '#FFF3E0',

  // Background
  bg:             '#F5F5F5',
  card:           '#FFFFFF',
  cardAlt:        '#FAFAFA',

  // Text
  text:           '#212121',
  textMuted:      '#757575',
  textLight:      '#BDBDBD',

  // Feedback
  correct:        '#2E7D32',
  correctBg:      '#E8F5E9',
  wrong:          '#D32F2F',
  wrongBg:        '#FFEBEE',
  neutral:        '#E0E0E0',

  // Gamification
  xp:             '#F9A825',
  streak:         '#E64A19',
  streakBg:       '#FBE9E7',

  white:          '#FFFFFF',
  black:          '#000000',
  overlay:        'rgba(33,33,33,0.55)',
};

export const fonts = {
  heading:   'PlusJakartaSans_700Bold',
  headingXB: 'PlusJakartaSans_800ExtraBold',
  body:      'PlusJakartaSans_400Regular',
  medium:    'PlusJakartaSans_500Medium',
  semibold:  'PlusJakartaSans_600SemiBold',
  mono:      'Courier New',
};

export const radius = {
  sm:   12,
  md:   16,
  lg:   20,
  xl:   28,
  full: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
