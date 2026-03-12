// src/screens/HomeScreen.js

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  StatusBar, SafeAreaView,
} from 'react-native';
import { getCategories } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { PatternDots, XPBar, getCategoryStyle } from '../components/CustomButton';

// Fake user state — replace with real auth/storage later
const USER = { name: 'Kullanıcı', xp: 340, xpMax: 500, streak: 7, completedUnits: [1] };

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const startUnit = (unit) => {
    navigation.navigate('Quiz', { unitId: unit.id, unitTitle: unit.title });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          {/* Decorative dots */}
          <PatternDots style={styles.patternTL} />
          <PatternDots style={styles.patternBR} />

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Selamün Aleyküm 👋</Text>
              <Text style={styles.userName}>{USER.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.avatarBtn}
            >
              <Text style={styles.avatarText}>
                {USER.name.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Streak + XP row */}
          <View style={styles.statsRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{USER.streak} gün</Text>
            </View>
            <View style={styles.xpWrapper}>
              <XPBar current={USER.xp} max={USER.xpMax} />
            </View>
          </View>
        </View>

        {/* ── Categories ─────────────────────────────────────────────── */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {categories.map((category, catIdx) => {
              const cs = getCategoryStyle(catIdx);
              return (
                <View key={category.id} style={styles.categoryBlock}>

                  {/* Category header */}
                  <View style={[styles.categoryHeader, { backgroundColor: cs.bg }]}>
                    <Text style={styles.categoryIcon}>{cs.icon}</Text>
                    <Text style={[styles.categoryTitle, { color: cs.text }]}>
                      {category.title}
                    </Text>
                    <Text style={[styles.categoryCount, { color: cs.text }]}>
                      {category.units.length} ders
                    </Text>
                  </View>

                  {/* Units */}
                  <View style={styles.unitsGrid}>
                    {category.units.map((unit, uIdx) => {
                      const isDone = USER.completedUnits.includes(unit.id);
                      const isLocked = uIdx > 0 && !USER.completedUnits.includes(category.units[uIdx - 1]?.id);

                      return (
                        <TouchableOpacity
                          key={unit.id}
                          style={[
                            styles.unitCard,
                            isDone   && styles.unitDone,
                            isLocked && styles.unitLocked,
                          ]}
                          onPress={() => !isLocked && startUnit(unit)}
                          activeOpacity={0.85}
                        >
                          {/* Status icon */}
                          <View style={[styles.unitIcon, { backgroundColor: isLocked ? colors.neutral : isDone ? colors.correct : cs.bg }]}>
                            <Text style={styles.unitIconText}>
                              {isLocked ? '🔒' : isDone ? '⭐' : '📖'}
                            </Text>
                          </View>

                          <View style={styles.unitInfo}>
                            <Text style={[styles.unitTitle, isLocked && styles.lockedText]}>
                              {unit.title}
                            </Text>
                            <Text style={styles.unitMeta}>
                              {unit.question_count} soru
                              {isDone ? '  ✓ Tamamlandı' : ''}
                            </Text>
                          </View>

                          {/* Chevron */}
                          {!isLocked && (
                            <Text style={[styles.chevron, { color: cs.bg }]}>›</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Bottom padding */}
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

  // Header
  header: {
    backgroundColor: colors.primary, paddingTop: 20,
    paddingBottom: 28, paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  patternTL: { position: 'absolute', top: 12, right: 16, opacity: 0.6 },
  patternBR: { position: 'absolute', bottom: -8, left: 8,  opacity: 0.3 },

  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  userName: { fontSize: 22, color: colors.white, fontFamily: fonts.heading, fontWeight: '700' },

  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.white },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  streakIcon: { fontSize: 16 },
  streakText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  xpWrapper:  { flex: 1 },

  // Categories
  categoryBlock: {
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.card, ...shadow.md,
  },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: spacing.md, gap: 10,
  },
  categoryIcon:  { fontSize: 22 },
  categoryTitle: { fontSize: 17, fontFamily: fonts.heading, fontWeight: '700', flex: 1 },
  categoryCount: { fontSize: 12, fontWeight: '600', opacity: 0.8 },

  // Units
  unitsGrid: { paddingVertical: spacing.xs },
  unitCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: spacing.md, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.neutral,
  },
  unitDone:   { backgroundColor: '#F5FBF7' },
  unitLocked: { opacity: 0.5 },

  unitIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  unitIconText: { fontSize: 20 },

  unitInfo:   { flex: 1 },
  unitTitle:  { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  unitMeta:   { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  lockedText: { color: colors.textLight },

  chevron: { fontSize: 26, fontWeight: '300', marginRight: 4 },
});