// src/components/ExerciseTypes.js — Ordering & Fill-in-the-blank exercises
//
// Both are tap-based (no drag library in this project): ordering fills numbered
// slots one tap at a time, fill_blank is a single-choice word bank — same
// interaction shape as the existing OptionButton, just applied differently.

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing, fonts } from '../theme';

function shuffled(items) {
  const arr = items.map((item, i) => ({ item, i }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Ordering ───────────────────────────────────────────────────────────────
export function OrderingExercise({ steps, onSubmit, disabled }) {
  const pool = useMemo(() => shuffled(steps), [steps]);
  const [placed, setPlaced] = useState([]); // array of original indices, in the order tapped

  const remaining = pool.filter(p => !placed.includes(p.i));

  const tapStep = (originalIndex) => {
    if (disabled || placed.includes(originalIndex)) return;
    const next = [...placed, originalIndex];
    setPlaced(next);
    if (next.length === steps.length) {
      onSubmit(next.map(i => steps[i]));
    }
  };

  return (
    <View style={ordStyles.wrap}>
      <View style={ordStyles.slots}>
        {steps.map((_, slotIndex) => (
          <View key={slotIndex} style={ordStyles.slot}>
            <Text style={ordStyles.slotNum}>{slotIndex + 1}</Text>
            <Text style={ordStyles.slotText} numberOfLines={2}>
              {placed[slotIndex] !== undefined ? steps[placed[slotIndex]] : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={ordStyles.pool}>
        {remaining.map(({ item, i }) => (
          <TouchableOpacity key={i} style={ordStyles.chip} onPress={() => tapStep(i)} activeOpacity={0.8}>
            <Text style={ordStyles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const ordStyles = StyleSheet.create({
  wrap: { gap: 14 },
  slots: { gap: 8 },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 48,
  },
  slotNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, color: colors.white, textAlign: 'center', fontSize: 12, fontFamily: fonts.semibold, lineHeight: 22 },
  slotText: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: colors.text },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.goldPale, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.goldLight,
    paddingVertical: 10, paddingHorizontal: 16, ...shadow.sm,
  },
  chipText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
});

// ── Fill in the blank ────────────────────────────────────────────────────────
export function FillBlankExercise({ sentence, wordBank, onSubmit, disabled }) {
  const [picked, setPicked] = useState(null);
  const parts = sentence.split('___');

  const pick = (word) => {
    if (disabled) return;
    setPicked(word);
    onSubmit(word);
  };

  return (
    <View style={fbStyles.wrap}>
      <Text style={fbStyles.sentence}>
        {parts[0]}
        <Text style={fbStyles.blank}>{picked || '＿＿＿'}</Text>
        {parts[1] ?? ''}
      </Text>
      <View style={fbStyles.bank}>
        {wordBank.map((word, i) => (
          <TouchableOpacity
            key={i}
            disabled={disabled}
            style={[fbStyles.chip, picked === word && fbStyles.chipPicked]}
            onPress={() => pick(word)}
            activeOpacity={0.8}
          >
            <Text style={[fbStyles.chipText, picked === word && fbStyles.chipTextPicked]}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const fbStyles = StyleSheet.create({
  wrap: { gap: 16 },
  sentence: { fontSize: 17, lineHeight: 26, color: colors.text, fontFamily: fonts.medium },
  blank: { color: colors.primary, fontFamily: fonts.headingXB, textDecorationLine: 'underline' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 10, paddingHorizontal: 18, ...shadow.sm,
  },
  chipPicked: { backgroundColor: colors.primaryPale, borderColor: colors.primary },
  chipText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  chipTextPicked: { color: colors.primary },
});
