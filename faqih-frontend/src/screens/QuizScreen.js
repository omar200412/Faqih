// src/screens/QuizScreen.js

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { getUnit } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { OptionButton, PrimaryButton } from '../components/CustomButton';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Quiz states ───────────────────────────────────────────────────────────────
const STATE = { LOADING: 'loading', QUESTION: 'question', FEEDBACK: 'feedback', RESULTS: 'results' };

export default function QuizScreen({ route, navigation }) {
  const { unitId, unitTitle } = route.params;

  const [unit, setUnit]           = useState(null);
  const [qIndex, setQIndex]       = useState(0);
  const [selected, setSelected]   = useState(null);
  const [score, setScore]         = useState(0);
  const [state, setState]         = useState(STATE.LOADING);
  const [mistakes, setMistakes]   = useState([]);

  const feedbackAnim  = useRef(new Animated.Value(0)).current;
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim     = useRef(new Animated.Value(0)).current;
  const cardAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getUnit(unitId).then(data => {
      setUnit(data);
      setState(STATE.QUESTION);
      animateCardIn();
    });
  }, []);

  const animateCardIn = () => {
    cardAnim.setValue(30);
    Animated.spring(cardAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  };

  const animateProgress = (idx, total) => {
    Animated.timing(progressAnim, {
      toValue: idx / total,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (unit) animateProgress(qIndex, unit.questions.length);
  }, [qIndex, unit]);

  const question = unit?.questions[qIndex];

  const handleAnswer = (answer) => {
    if (state !== STATE.QUESTION) return;
    setSelected(answer);

    const isCorrect = answer === question.correct_option;

    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setMistakes(m => [...m, { question, chosen: answer }]);
      shake();
    }

    // Show feedback
    setState(STATE.FEEDBACK);
    Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    const next = qIndex + 1;
    if (next >= unit.questions.length) {
      setState(STATE.RESULTS);
    } else {
      feedbackAnim.setValue(0);
      setSelected(null);
      setQIndex(next);
      setState(STATE.QUESTION);
      animateCardIn();
    }
  };

  const handleRetry = () => {
    setQIndex(0); setSelected(null); setScore(0);
    setMistakes([]); setState(STATE.QUESTION);
    feedbackAnim.setValue(0); animateCardIn();
  };

  const getOptionState = (opt) => {
    if (state === STATE.QUESTION) return 'idle';
    if (opt === question.correct_option) return 'correct';
    if (opt === selected) return 'wrong';
    return 'idle';
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const isCorrect = selected === question?.correct_option;
  const xpEarned  = score * 10;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === STATE.LOADING) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (state === STATE.RESULTS) {
    const pct = Math.round((score / unit.questions.length) * 100);
    const isPerfect = score === unit.questions.length;

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.resultScroll}>
          {/* Trophy */}
          <View style={styles.trophyCircle}>
            <Text style={styles.trophyEmoji}>{isPerfect ? '🏆' : pct >= 60 ? '🌟' : '📚'}</Text>
          </View>

          <Text style={styles.resultTitle}>
            {isPerfect ? 'Mükemmel!' : pct >= 60 ? 'Harika!' : 'Devam Et!'}
          </Text>
          <Text style={styles.resultSubtitle}>{unitTitle} tamamlandı</Text>

          {/* Score ring */}
          <View style={styles.scoreRing}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreDivider}>/ {unit.questions.length}</Text>
            <Text style={styles.scoreLabel}>Doğru</Text>
          </View>

          {/* Stats row */}
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{pct}%</Text>
              <Text style={styles.resultStatLabel}>Başarı</Text>
            </View>
            <View style={[styles.resultStat, styles.resultStatHighlight]}>
              <Text style={[styles.resultStatValue, { color: colors.xp }]}>+{xpEarned}</Text>
              <Text style={styles.resultStatLabel}>XP Kazandın</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{mistakes.length}</Text>
              <Text style={styles.resultStatLabel}>Hata</Text>
            </View>
          </View>

          {/* Mistakes review */}
          {mistakes.length > 0 && (
            <View style={styles.mistakesSection}>
              <Text style={styles.mistakesTitle}>Gözden Geçir</Text>
              {mistakes.map((m, i) => (
                <View key={i} style={styles.mistakeCard}>
                  <Text style={styles.mistakeQ}>{m.question.text}</Text>
                  <View style={styles.mistakeRow}>
                    <Text style={styles.mistakeWrong}>✗  {m.chosen}</Text>
                    <Text style={styles.mistakeCorrect}>✓  {m.question.correct_option}</Text>
                  </View>
                  {m.question.explanation ? (
                    <Text style={styles.mistakeExplanation}>{m.question.explanation}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.resultActions}>
            <PrimaryButton title="Tekrar Çöz" onPress={handleRetry} style={styles.retryBtn} />
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.homeBtn}>
              <Text style={styles.homeBtnText}>Ana Menü</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Question ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.qCounter}>{qIndex + 1} / {unit.questions.length}</Text>
        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipText}>🌟 {score * 10} XP</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.questionScroll} showsVerticalScrollIndicator={false}>
        {/* Question card */}
        <Animated.View style={[
          styles.questionCard,
          { transform: [{ translateY: cardAnim }, { translateX: shakeAnim }] }
        ]}>
          <View style={styles.qTypeTag}>
            <Text style={styles.qTypeText}>
              {question.question_type === 'hotspot' ? '🗺️ Harita' : '❓ Çoktan Seçmeli'}
            </Text>
          </View>
          <Text style={styles.questionText}>{question.text}</Text>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.question_type === 'mcq' && Array.isArray(question.options) &&
            question.options.map((opt, i) => (
              <OptionButton
                key={i} index={i} text={opt}
                state={getOptionState(opt)}
                onPress={() => handleAnswer(opt)}
              />
            ))
          }

          {/* Hotspot placeholder — render as MCQ with region labels */}
          {question.question_type === 'hotspot' && question.options?.hotspots &&
            question.options.hotspots.map((hs, i) => (
              <OptionButton
                key={hs.id} index={i} text={hs.text}
                state={getOptionState(hs.id)}
                onPress={() => handleAnswer(hs.id)}
              />
            ))
          }
        </View>

        {/* Feedback panel */}
        {state === STATE.FEEDBACK && (
          <Animated.View style={[
            styles.feedbackPanel,
            isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
            { opacity: feedbackAnim, transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }] }
          ]}>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.correct : colors.wrong }]}>
              {isCorrect ? '✓  Doğru!' : '✗  Yanlış!'}
            </Text>
            {question.explanation ? (
              <Text style={styles.feedbackExplanation}>{question.explanation}</Text>
            ) : null}
            <PrimaryButton
              title={qIndex + 1 < unit.questions.length ? 'Devam Et  →' : 'Sonuçları Gör  →'}
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: isCorrect ? colors.correct : colors.wrong }]}
            />
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, marginTop: 80 },

  progressTrack: { height: 5, backgroundColor: colors.neutral },
  progressFill:  { height: '100%', backgroundColor: colors.gold, borderRadius: 99 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  closeBtn:     { padding: 8 },
  closeBtnText: { fontSize: 16, color: colors.textMuted, fontWeight: '700' },
  qCounter:     { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  scoreChip: {
    backgroundColor: colors.goldPale, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  scoreChipText: { fontSize: 13, fontWeight: '700', color: colors.gold },

  questionScroll: { paddingHorizontal: spacing.md, paddingTop: 8 },

  // Question card
  questionCard: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.md,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  qTypeTag: {
    alignSelf: 'flex-start', backgroundColor: colors.bg,
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  qTypeText:    { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  questionText: {
    fontSize: 20, fontFamily: fonts.heading, color: colors.text,
    lineHeight: 30, fontWeight: '700',
  },

  optionsContainer: { gap: 2 },

  // Feedback
  feedbackPanel: {
    borderRadius: radius.xl, padding: spacing.lg,
    marginTop: spacing.md, ...shadow.lg,
  },
  feedbackCorrect: { backgroundColor: colors.correctBg, borderWidth: 1.5, borderColor: colors.correct },
  feedbackWrong:   { backgroundColor: colors.wrongBg,   borderWidth: 1.5, borderColor: colors.wrong },
  feedbackTitle:   { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  feedbackExplanation: {
    fontSize: 14, color: colors.text, lineHeight: 21,
    marginBottom: spacing.md, fontStyle: 'italic',
  },
  nextBtn: { marginTop: 4 },

  // Results
  resultScroll: { alignItems: 'center', paddingTop: 32, paddingHorizontal: spacing.lg },
  trophyCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.goldPale, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, ...shadow.md,
    borderWidth: 2, borderColor: colors.goldLight,
  },
  trophyEmoji:    { fontSize: 52 },
  resultTitle:    { fontSize: 30, fontFamily: fonts.heading, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  resultSubtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },

  scoreRing: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  scoreNumber:  { fontSize: 44, fontWeight: '900', color: colors.primary, lineHeight: 52 },
  scoreDivider: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  scoreLabel:   { fontSize: 12, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },

  resultStats: {
    flexDirection: 'row', gap: 12, width: '100%', marginBottom: 28,
  },
  resultStat: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    alignItems: 'center', paddingVertical: 16, ...shadow.sm,
  },
  resultStatHighlight: { backgroundColor: colors.goldPale, borderWidth: 1, borderColor: colors.goldLight },
  resultStatValue: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4 },
  resultStatLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  // Mistakes
  mistakesSection: { width: '100%', marginBottom: 24 },
  mistakesTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  mistakeCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: 10, ...shadow.sm,
    borderLeftWidth: 3, borderLeftColor: colors.wrong,
  },
  mistakeQ:           { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8, lineHeight: 20 },
  mistakeRow:         { flexDirection: 'row', gap: 12, marginBottom: 6 },
  mistakeWrong:       { fontSize: 13, color: colors.wrong, fontWeight: '600' },
  mistakeCorrect:     { fontSize: 13, color: colors.correct, fontWeight: '600' },
  mistakeExplanation: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 },

  resultActions: { width: '100%', gap: 10 },
  retryBtn:      {},
  homeBtn: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.primary, paddingVertical: 14, alignItems: 'center',
  },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
});