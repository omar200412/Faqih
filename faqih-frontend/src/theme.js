// src/theme.js — Faqih Design System

export const colors = {
  // Primary palette — deep Islamic green
  primary:        '#1A5C38',
  primaryLight:   '#2E7D52',
  primaryDark:    '#0F3D24',

  // Gold accent
  gold:           '#C9993A',
  goldLight:      '#F5D98B',
  goldPale:       '#FDF6E3',

  // Background
  bg:             '#F4F0EA',   // warm parchment
  card:           '#FFFFFF',
  cardAlt:        '#F9F6F1',

  // Text
  text:           '#1C1A17',
  textMuted:      '#7A7269',
  textLight:      '#B5AFA6',

  // Feedback
  correct:        '#2D8C4E',
  correctBg:      '#E6F5EC',
  wrong:          '#C0392B',
  wrongBg:        '#FDECEA',
  neutral:        '#E8E3DB',

  // Gamification
  xp:             '#F0A500',
  streak:         '#FF6B35',
  streakBg:       '#FFF0EB',

  white:          '#FFFFFF',
  black:          '#000000',
  overlay:        'rgba(15,61,36,0.55)',
};

export const fonts = {
  heading:  'Georgia',       // dignified serif for display text
  body:     'System',        // system font for readability
  mono:     'Courier New',
};

export const radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#1A5C38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A5C38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
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