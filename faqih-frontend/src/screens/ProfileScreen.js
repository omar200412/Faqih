// src/screens/ProfileScreen.js

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Animated, SafeAreaView, StatusBar, TouchableOpacity,
} from 'react-native';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { StatCard, XPBar, PatternDots } from '../components/CustomButton';
import LanguagePicker from '../components/LanguagePicker';
import { useLang, useRTL } from '../i18n';

const USER = {
  name: 'Kullanıcı', level: 4, xp: 340, xpMax: 500,
  streak: 7, totalQuestions: 62, correctAnswers: 54,
  completedUnits: 3, joinDays: 14,
};

const WEEK_ACTIVITY = [true, true, true, false, true, true, true];

export default function ProfileScreen({ navigation }) {
  const { t }                    = useLang();
  const { isRTL, flexDirection } = useRTL();
  const [langOpen, setLangOpen]  = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const accuracy     = Math.round((USER.correctAnswers / USER.totalQuestions) * 100);
  const levelNames   = t.profile.levelNames;
  const achievements = t.achievements;

  const settingsItems = [
    { icon: '🔔', label: t.profile.settingsItems.notifications },
    { icon: '🌙', label: t.profile.settingsItems.darkMode },
    { icon: '🌐', label: t.profile.settingsItems.language, onPress: () => setLangOpen(true) },
    { icon: '📖', label: t.profile.settingsItems.about },
  ];

  const summaryItems = [
    { icon: '📚', value: USER.completedUnits, label: t.profile.statsItems.completedUnits },
    { icon: '✅', value: USER.correctAnswers, label: t.profile.statsItems.correctAnswers },
    { icon: '📝', value: USER.totalQuestions, label: t.profile.statsItems.totalQuestions },
    { icon: '📅', value: t.profile.statsItems.joinDays(USER.joinDays), label: '' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <PatternDots style={styles.patternTR} />
          <PatternDots style={styles.patternBL} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{USER.name.charAt(0)}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{USER.name}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              {t.profile.level(USER.level)}  •  {levelNames[USER.level]}
            </Text>
          </View>
          <View style={styles.xpSection}>
            <View style={[styles.xpLabels, { flexDirection }]}>
              <Text style={styles.xpLabel}>{USER.xp} XP</Text>
              <Text style={styles.xpLabel}>{t.profile.xpUntilNext(USER.xpMax)}</Text>
            </View>
            <XPBar current={USER.xp} max={USER.xpMax} style={styles.xpBar} />
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="🔥" value={USER.streak}     label={t.profile.streakLabel}   accent={colors.streak} />
            <StatCard icon="⚡" value={`${USER.xp}`}     label={t.profile.xpLabel}       accent={colors.xp} />
            <StatCard icon="🎯" value={`${accuracy}%`}   label={t.profile.accuracyLabel} accent={colors.primary} />
          </View>

          {/* Weekly activity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.profile.thisWeek}</Text>
            <View style={[styles.weekRow, { flexDirection }]}>
              {t.profile.weekDays.map((day, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayDot, WEEK_ACTIVITY[i] && styles.dayDotActive]}>
                    {WEEK_ACTIVITY[i] && <Text style={styles.dayCheck}>✓</Text>}
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Summary stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.profile.stats}</Text>
            <View style={styles.summaryGrid}>
              {summaryItems.map((s, i) => (
                <View key={i} style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>{s.icon}</Text>
                  <Text style={styles.summaryValue}>{s.value}</Text>
                  <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.profile.achievements}</Text>
            <View style={styles.achGrid}>
              {achievements.map((a, i) => (
                <View key={i} style={[styles.achCard, !a.unlocked && styles.achLocked]}>
                  <Text style={[styles.achIcon, !a.unlocked && styles.achIconLocked]}>
                    {a.unlocked ? a.icon : '🔒'}
                  </Text>
                  <Text style={[styles.achTitle, !a.unlocked && styles.achTextLocked, isRTL && styles.rtlText]}>
                    {a.title}
                  </Text>
                  <Text style={[styles.achDesc, isRTL && styles.rtlText]} numberOfLines={2}>{a.desc}</Text>
                  {a.unlocked && (
                    <View style={styles.achBadge}>
                      <Text style={styles.achBadgeText}>{t.profile.achUnlocked}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Settings */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.profile.settings}</Text>
            {settingsItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={item.onPress}
                style={[styles.settingRow, { flexDirection }]}
                activeOpacity={0.7}
              >
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={[styles.settingLabel, isRTL && styles.rtlText]}>{item.label}</Text>
                <Text style={styles.settingChevron}>{isRTL ? '‹' : '›'}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  hero:   { backgroundColor: colors.primary, paddingTop: 32, paddingBottom: 36, alignItems: 'center', paddingHorizontal: spacing.lg, overflow: 'hidden' },
  patternTR: { position: 'absolute', top: 12, right: 16, opacity: 0.5 },
  patternBL: { position: 'absolute', bottom: 0,  left: 8,  opacity: 0.25 },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.gold, padding: 3, marginBottom: 14, ...shadow.lg },
  avatar:     { flex: 1, borderRadius: 40, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: colors.white },
  heroName:     { fontSize: 24, fontFamily: fonts.heading, color: colors.white, fontWeight: '700', marginBottom: 8 },
  levelBadge:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 5, marginBottom: 20 },
  levelText:    { fontSize: 13, color: colors.white, fontWeight: '600', letterSpacing: 0.5 },
  xpSection:    { width: '100%' },
  xpLabels:     { justifyContent: 'space-between', marginBottom: 6 },
  xpLabel:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  xpBar:        { height: 10 },
  statsRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.md, marginTop: spacing.lg },
  section:      { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12, letterSpacing: 0.2 },
  rtlText:      { textAlign: 'right' },
  weekRow:      { justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  dayCol:       { alignItems: 'center', gap: 6 },
  dayDot:       { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.neutral, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: colors.primary },
  dayCheck:     { color: colors.white, fontSize: 14, fontWeight: '700' },
  dayLabel:     { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  summaryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard:  { width: '47.5%', backgroundColor: colors.card, borderRadius: radius.lg, alignItems: 'center', paddingVertical: 18, ...shadow.sm },
  summaryIcon:  { fontSize: 24, marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  achGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achCard:      { width: '47.5%', backgroundColor: colors.card, borderRadius: radius.lg, alignItems: 'center', padding: 14, ...shadow.sm },
  achLocked:    { backgroundColor: '#F5F5F5', opacity: 0.7 },
  achIcon:      { fontSize: 30, marginBottom: 6 },
  achIconLocked: { opacity: 0.4 },
  achTitle:     { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 },
  achTextLocked: { color: colors.textLight },
  achDesc:      { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 15, marginBottom: 8 },
  achBadge:     { backgroundColor: colors.correctBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  achBadgeText: { fontSize: 10, color: colors.correct, fontWeight: '700' },
  settingRow:   { alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.md, marginBottom: 8, ...shadow.sm },
  settingIcon:  { fontSize: 20 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  settingChevron: { fontSize: 22, color: colors.textLight },
});