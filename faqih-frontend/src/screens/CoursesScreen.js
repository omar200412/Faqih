// src/screens/CoursesScreen.js — placeholder; real content is future work.

import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { useLang } from '../i18n';

export default function CoursesScreen() {
  const { t } = useLang();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.icon}>📚</Text>
        <Text style={styles.title}>{t.comingSoon.title}</Text>
        <Text style={styles.body}>{t.comingSoon.courses}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  icon:   { fontSize: 40, marginBottom: 12 },
  title:  { fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginBottom: 6 },
  body:   { fontSize: 14, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center' },
});
