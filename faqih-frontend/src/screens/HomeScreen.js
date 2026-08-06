// src/screens/HomeScreen.js

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  StatusBar, SafeAreaView,
} from 'react-native';
import { getCategories, getUnit } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { PatternDots, getCategoryStyle } from '../components/CustomButton';
import { SkillPath } from '../components/SkillPath';
import LanguagePicker from '../components/LanguagePicker';
import { useLang, useRTL } from '../i18n';
import { useProgress } from '../logic/useProgress';

const DISPLAY_NAME = 'Kullanıcı';

export default function HomeScreen({ navigation }) {
  const { t }                    = useLang();
  const { isRTL, flexDirection } = useRTL();
  const { progress }                = useProgress();
  const [categories, setCategories] = useState([]);
  const [unitsById, setUnitsById]    = useState({});
  const [loading, setLoading]       = useState(true);
  const [langOpen, setLangOpen]     = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    setLoading(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    getCategories().then(async (data) => {
      setCategories(data);
      const allUnits = data.flatMap(c => c.units);
      const details = await Promise.all(allUnits.map(u => getUnit(u.id)));
      const byId = {};
      details.forEach(u => { if (u) byId[u.id] = u; });
      setUnitsById(byId);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, [t.lang]);

  const startLesson = (lesson) =>
    navigation.navigate('Lesson', { lessonId: lesson.id, lessonTitle: lesson.title });

  // Flattens every unit's lessons in category order, so "is the previous lesson
  // done" can be checked with a single global index — this is the whole unlock
  // rule (see docs/superpowers/specs/2026-08-05-curriculum-lesson-model-design.md,
  // section 2): sequential underneath, path-shaped on screen.
  const allLessonsInOrder = categories.flatMap(cat =>
    cat.units.flatMap(u => (unitsById[u.id]?.lessons ?? []))
  );

  const lessonNodeState = (lesson) => {
    const globalIndex = allLessonsInOrder.findIndex(l => l.id === lesson.id);
    if (progress.completed_lesson_ids.includes(lesson.id)) return 'done';
    if (globalIndex <= 0) return 'next';
    const previous = allLessonsInOrder[globalIndex - 1];
    return progress.completed_lesson_ids.includes(previous.id) ? 'next' : 'locked';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <PatternDots style={styles.patternTL} />
          <PatternDots style={styles.patternBR} />

          <View style={[styles.headerTop, { flexDirection }]}>
            <View>
              <Text style={[styles.greeting, isRTL && styles.rtlText]}>{t.home.greeting}</Text>
              <Text style={[styles.userName,  isRTL && styles.rtlText]}>{DISPLAY_NAME}</Text>
            </View>
            <View style={[styles.headerIcons, { flexDirection }]}>
              <TouchableOpacity onPress={() => setLangOpen(true)} style={styles.langBtn}>
                <Text style={styles.langBtnText}>{t.langFlag}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                style={styles.avatarBtn}
              >
                <Text style={styles.avatarText}>{DISPLAY_NAME.charAt(0).toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.pillsRow, { flexDirection }]}>
            <View style={styles.pill}><Text style={styles.pillText}>🔥 {progress.streak}</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>💎 {progress.gems}</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>❤️ {progress.hearts}</Text></View>
          </View>
        </View>

        {/* Path */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {categories.map((category, catIdx) => {
              const cs = getCategoryStyle(catIdx);
              return (
                <View key={category.id} style={styles.categoryBlock}>
                  <View style={[styles.categoryHeader, { backgroundColor: cs.bg, flexDirection }]}>
                    <Text style={styles.categoryIcon}>{cs.icon}</Text>
                    <Text style={[styles.categoryTitle, { color: cs.text }]}>{category.title}</Text>
                  </View>

                  {category.units.map((unit) => {
                    const lessons = unitsById[unit.id]?.lessons ?? [];
                    return (
                      <View key={unit.id} style={styles.unitBlock}>
                        <View style={styles.unitBanner}>
                          <Text style={styles.unitBannerEyebrow}>
                            {t.home.unitPrefix} {String(unit.id)}
                          </Text>
                          <Text style={[styles.unitBannerTitle, isRTL && styles.rtlText]}>{unit.title}</Text>
                          <TouchableOpacity
                            style={styles.unitBannerBtn}
                            onPress={() => {
                              const target = lessons.find(l => lessonNodeState(l) !== 'locked' && !progress.completed_lesson_ids.includes(l.id))
                                ?? lessons[0];
                              if (target) startLesson(target);
                            }}
                          >
                            <Text style={styles.unitBannerBtnText}>{t.quiz.continue}</Text>
                          </TouchableOpacity>
                        </View>
                        <SkillPath
                          nodes={lessons.map(lesson => ({ id: lesson.id, title: lesson.title, state: lessonNodeState(lesson) }))}
                          onPressNode={(lessonId) => {
                            const lesson = lessons.find(l => l.id === lessonId);
                            if (lesson) startLesson(lesson);
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ height: 32 }} />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: colors.primary, paddingTop: 20,
    paddingBottom: 28, paddingHorizontal: spacing.lg, overflow: 'hidden',
  },
  patternTL: { position: 'absolute', top: 12, right: 16, opacity: 0.6 },
  patternBR: { position: 'absolute', bottom: -8, left: 8,  opacity: 0.3 },
  headerTop: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, marginBottom: 2 },
  userName:  { fontSize: 22, color: colors.white, fontFamily: fonts.heading },
  rtlText:   { textAlign: 'right' },
  headerIcons: { alignItems: 'center', gap: 10 },
  langBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  langBtnText: { fontSize: 20 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  avatarText:   { fontSize: 18, fontFamily: fonts.headingXB, color: colors.white },
  pillsRow:     { gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText:       { color: colors.white, fontSize: 13, fontFamily: fonts.semibold },
  categoryBlock:  { marginHorizontal: spacing.md, marginTop: spacing.lg },
  categoryHeader: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, gap: 10, borderRadius: radius.lg, marginBottom: spacing.md },
  categoryIcon:   { fontSize: 20 },
  categoryTitle:  { fontSize: 16, fontFamily: fonts.heading },
  unitBlock:      { marginBottom: spacing.lg },
  unitBanner: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadow.md,
  },
  unitBannerEyebrow: { fontSize: 11, fontFamily: fonts.semibold, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginBottom: 2 },
  unitBannerTitle:   { fontSize: 18, fontFamily: fonts.heading, color: colors.white, marginBottom: 12 },
  unitBannerBtn:     { backgroundColor: colors.white, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  unitBannerBtnText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.primaryDark },
});
