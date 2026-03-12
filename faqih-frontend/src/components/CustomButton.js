// src/components/UI.js — Shared UI components

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { colors, radius, shadow, spacing, fonts } from '../theme';

// ── Geometric Islamic pattern (decorative SVG-like corner ornament) ───────────
export function PatternDots({ style }) {
  const dots = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      dots.push(
        <View key={`${r}-${c}`} style={{
          width: 3, height: 3, borderRadius: 2,
          backgroundColor: colors.gold,
          opacity: ((r + c) % 2 === 0) ? 0.5 : 0.2,
          margin: 3,
        }} />
      );
    }
  }
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', width: 52 }, style]}>
      {dots}
    </View>
  );
}

// ── XP Progress Bar ───────────────────────────────────────────────────────────
export function XPBar({ current, max, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.min(current / max, 1);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[xpStyles.track, style]}>
      <Animated.View style={[xpStyles.fill, { width }]} />
      <Text style={xpStyles.label}>{current} / {max} XP</Text>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  track: {
    height: 12, backgroundColor: colors.neutral, borderRadius: radius.full,
    overflow: 'hidden', justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.xp,
    borderRadius: radius.full,
  },
  label: {
    textAlign: 'center', fontSize: 9, fontWeight: '700',
    color: colors.text, letterSpacing: 0.5,
  },
});

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, value, label, accent, style }) {
  return (
    <View style={[statStyles.card, style]}>
      <Text style={[statStyles.icon, { color: accent || colors.primary }]}>{icon}</Text>
      <Text style={[statStyles.value, { color: accent || colors.primary }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  icon:  { fontSize: 26, marginBottom: 6 },
  value: { fontSize: 24, fontWeight: '800', fontFamily: fonts.heading, marginBottom: 2 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ── Category Badge ────────────────────────────────────────────────────────────
const CATEGORY_STYLES = [
  { bg: '#1A5C38', text: '#FFFFFF', icon: '🌿' },
  { bg: '#C9993A', text: '#FFFFFF', icon: '🕌' },
  { bg: '#2C5F8A', text: '#FFFFFF', icon: '📖' },
  { bg: '#7B3FA0', text: '#FFFFFF', icon: '✨' },
];

export function getCategoryStyle(index) {
  return CATEGORY_STYLES[index % CATEGORY_STYLES.length];
}

// ── Primary Button ────────────────────────────────────────────────────────────
export function PrimaryButton({ title, onPress, disabled, style }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        disabled={disabled} activeOpacity={0.9}
        style={[btnStyles.btn, disabled && btnStyles.disabled, style]}
      >
        <Text style={btnStyles.text}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const btnStyles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  disabled: { backgroundColor: colors.neutral },
  text: { color: colors.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});

// ── Answer Option Button ──────────────────────────────────────────────────────
export function OptionButton({ text, state, onPress, index }) {
  // state: 'idle' | 'selected' | 'correct' | 'wrong'
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const stateStyles = {
    idle:     { bg: colors.card,      border: colors.neutral,   textColor: colors.text,  icon: null },
    selected: { bg: '#EEF5F1',        border: colors.primary,   textColor: colors.primary, icon: null },
    correct:  { bg: colors.correctBg, border: colors.correct,   textColor: colors.correct, icon: '✓' },
    wrong:    { bg: colors.wrongBg,   border: colors.wrong,     textColor: colors.wrong,   icon: '✗' },
  };

  const s = stateStyles[state] || stateStyles.idle;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        disabled={state !== 'idle'}
        activeOpacity={0.85}
        style={[optStyles.btn, { backgroundColor: s.bg, borderColor: s.border }]}
      >
        <View style={[optStyles.letter, { backgroundColor: s.border }]}>
          <Text style={[optStyles.letterText, { color: s.bg || colors.white }]}>
            {s.icon || letters[index]}
          </Text>
        </View>
        <Text style={[optStyles.text, { color: s.textColor }]} numberOfLines={2}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const optStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 2,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 10, ...shadow.sm,
  },
  letter: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  letterText: { fontSize: 13, fontWeight: '800' },
  text: { fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 20 },
});