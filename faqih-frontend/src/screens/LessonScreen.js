// src/screens/LessonScreen.js

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, Linking,
  StyleSheet, Animated, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { getLesson } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { OptionButton, PrimaryButton } from '../components/CustomButton';
import { OrderingExercise, FillBlankExercise } from '../components/ExerciseTypes';
import { createSession, answerCurrent } from '../logic/lessonSession';
import { useLang, useRTL } from '../i18n';

const STATE = { LOADING: 'loading', INTRO: 'intro', QUESTION: 'question', FEEDBACK: 'feedback', RESULTS: 'results' };

export default function LessonScreen({ route, navigation }) {
  const { lessonId, lessonTitle }  = route.params;
  const { t }                      = useLang();
  const { isRTL, flexDirection }   = useRTL();

  const [lesson, setLesson]     = useState(null);
  const [session, setSession]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [resultCorrect, setResultCorrect] = useState(false);
  const [state, setState]       = useState(STATE.LOADING);

  // Eşleştirme sorusu durumu (mcq/matching/video değişmeden QuizScreen'den taşındı)
  const [matchSel, setMatchSel]     = useState(null);
  const [matched, setMatched]       = useState({});
  const [matchWrong, setMatchWrong] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(null);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim    = useRef(new Animated.Value(0)).current;
  const cardAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLesson(lessonId).then(data => {
      setLesson(data);
      if (data.intro) {
        setState(STATE.INTRO);
      } else {
        setSession(createSession(data.exercises));
        setState(STATE.QUESTION);
        animateCardIn();
      }
    });
  }, []);

  const animateCardIn = () => {
    cardAnim.setValue(30);
    Animated.spring(cardAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  };

  const startExercises = () => {
    setSession(createSession(lesson.exercises));
    setState(STATE.QUESTION);
    animateCardIn();
  };

  useEffect(() => {
    if (session && lesson) {
      const progress = 1 - session.queue.length / (lesson.exercises.length + 1);
      Animated.timing(progressAnim, { toValue: Math.max(progress, 0), duration: 400, useNativeDriver: false }).start();
    }
  }, [session, lesson]);

  const question = session?.current;
  const pairs = question?.question_type === 'matching' ? (question.options?.pairs ?? []) : [];
  const rightOrder = useMemo(() => {
    const idx = pairs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }, [question?.id]);

  const resetMatching = () => {
    setMatchSel(null); setMatched({}); setMatchWrong(0); setWrongFlash(null);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const settle = (isCorrect, chosenLabel) => {
    setResultCorrect(isCorrect);
    if (!isCorrect) {
      setMistakes(m => [...m, { question, chosen: chosenLabel }]);
      shake();
    }
    setState(STATE.FEEDBACK);
    Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleAnswer = (answer) => {
    if (state !== STATE.QUESTION) return;
    setSelected(answer);
    settle(answer === question.correct_answer, answer);
  };

  const handleOrderingSubmit = (orderedSteps) => {
    if (state !== STATE.QUESTION) return;
    const correct = JSON.stringify(orderedSteps) === JSON.stringify(question.options.steps);
    settle(correct, orderedSteps.join(' → '));
  };

  const handleFillBlankSubmit = (word) => {
    if (state !== STATE.QUESTION) return;
    setSelected(word);
    settle(word === question.correct_answer, word);
  };

  const handleMatchLeft = (i) => {
    if (state !== STATE.QUESTION || matched[i]) return;
    setMatchSel(i);
  };

  const handleMatchRight = (i) => {
    if (state !== STATE.QUESTION || matchSel === null || matched[i]) return;
    if (i === matchSel) {
      const next = { ...matched, [i]: true };
      setMatched(next);
      setMatchSel(null);
      if (Object.keys(next).length === pairs.length) {
        settle(matchWrong === 0, `${matchWrong} ✗`);
        setSelected('__done__');
      }
    } else {
      setMatchWrong(w => w + 1);
      setWrongFlash(i);
      shake();
      setTimeout(() => setWrongFlash(null), 450);
      setMatchSel(null);
    }
  };

  const advance = () => {
    const isCorrect = resultCorrect;
    const nextSession = answerCurrent(session, isCorrect);
    setSession(nextSession);
    feedbackAnim.setValue(0); setSelected(null); resetMatching();
    if (nextSession.finished) {
      setState(STATE.RESULTS);
    } else {
      setState(STATE.QUESTION);
      animateCardIn();
    }
  };

  const handleVideoDone = () => {
    if (state !== STATE.QUESTION) return;
    setResultCorrect(true);
    const nextSession = answerCurrent(session, true);
    setSession(nextSession);
    resetMatching();
    if (nextSession.finished) { setState(STATE.RESULTS); }
    else { setState(STATE.QUESTION); animateCardIn(); }
  };

  const handleRetry = () => {
    setSession(createSession(lesson.exercises));
    setSelected(null); setMistakes([]); resetMatching();
    setState(STATE.QUESTION); feedbackAnim.setValue(0); animateCardIn();
  };

  const getOptionState = (opt) => {
    if (state === STATE.QUESTION) return 'idle';
    if (opt === question.correct_answer) return 'correct';
    if (opt === selected) return 'wrong';
    return 'idle';
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const isCorrect = resultCorrect;

  // Loading
  if (state === STATE.LOADING) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  // Intro
  if (state === STATE.INTRO) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.introScroll}>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{lessonTitle}</Text>
            {lesson.intro.kind === 'text' && (
              <Text style={[styles.introText, isRTL && styles.rtlText]}>{lesson.intro.body}</Text>
            )}
            {lesson.intro.kind === 'image' && (
              <Image source={{ uri: lesson.intro.body }} style={styles.introImage} resizeMode="cover" />
            )}
            {lesson.intro.kind === 'video' && (
              <TouchableOpacity onPress={() => Linking.openURL(lesson.intro.body)} style={styles.introVideo}>
                <Text style={styles.introVideoIcon}>▶</Text>
              </TouchableOpacity>
            )}
          </View>
          <PrimaryButton title={t.quiz.continue} onPress={startExercises} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results
  if (state === STATE.RESULTS) {
    const total    = lesson.exercises.length;
    const pct      = Math.round(((total - mistakes.length) / total) * 100);
    const isPerfect = mistakes.length === 0;
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={styles.trophyCircle}>
            <Text style={styles.trophyEmoji}>{isPerfect ? '🏆' : pct >= 60 ? '🌟' : '📚'}</Text>
          </View>
          <Text style={styles.resultTitle}>
            {isPerfect ? t.results.perfect : pct >= 60 ? t.results.great : t.results.keepGoing}
          </Text>
          <Text style={styles.resultSubtitle}>{lessonTitle} {t.results.completed}</Text>

          <View style={styles.resultStats}>
            {[
              { value: `${pct}%`, label: t.results.accuracy },
              { value: total, label: t.results.correct },
              { value: mistakes.length, label: t.results.mistakes },
            ].map((s, i) => (
              <View key={i} style={styles.resultStat}>
                <Text style={styles.resultStatValue}>{s.value}</Text>
                <Text style={styles.resultStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultActions}>
            <PrimaryButton title={t.results.retry} onPress={handleRetry} />
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.homeBtn}>
              <Text style={styles.homeBtnText}>{t.results.home}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={[styles.topBar, { flexDirection }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.qCounter}>{lessonTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.questionScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[
          styles.questionCard,
          { transform: [{ translateY: cardAnim }, { translateX: shakeAnim }] }
        ]}>
          <Text style={[styles.questionText, isRTL && styles.rtlText]}>{question.text}</Text>
          {question.image ? (
            <Image source={{ uri: question.image }} style={styles.questionImage} resizeMode="cover" />
          ) : null}
        </Animated.View>

        <View style={styles.optionsContainer}>
          {(question.question_type === 'mcq' || question.question_type === 'image') &&
            Array.isArray(question.options) &&
            question.options.map((opt, i) => (
              <OptionButton key={i} index={i} text={opt}
                state={getOptionState(opt)} onPress={() => handleAnswer(opt)} />
            ))
          }
          {question.question_type === 'ordering' && (
            <OrderingExercise
              steps={question.options.steps}
              disabled={state !== STATE.QUESTION}
              onSubmit={handleOrderingSubmit}
            />
          )}
          {question.question_type === 'fill_blank' && (
            <FillBlankExercise
              sentence={question.options.sentence}
              wordBank={question.options.word_bank}
              disabled={state !== STATE.QUESTION}
              onSubmit={handleFillBlankSubmit}
            />
          )}
          {question.question_type === 'matching' && pairs.length > 0 && (
            <View>
              <Text style={[styles.matchHint, isRTL && styles.rtlText]}>{t.quiz.matchingHint}</Text>
              <View style={[styles.matchWrap, { flexDirection }]}>
                <View style={styles.matchCol}>
                  {pairs.map((p, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.8}
                      style={[styles.matchChip,
                        matchSel === i && styles.matchChipSel,
                        matched[i] && styles.matchChipDone]}
                      onPress={() => handleMatchLeft(i)}>
                      <Text style={[styles.matchChipText, matched[i] && styles.matchChipTextDone]}>
                        {p[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.matchCol}>
                  {rightOrder.map((ri) => (
                    <TouchableOpacity key={ri} activeOpacity={0.8}
                      style={[styles.matchChip, styles.matchChipRight,
                        matched[ri] && styles.matchChipDone,
                        wrongFlash === ri && styles.matchChipWrong]}
                      onPress={() => handleMatchRight(ri)}>
                      <Text style={[styles.matchChipText, matched[ri] && styles.matchChipTextDone]}>
                        {pairs[ri][1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          {question.question_type === 'video' && (
            <View style={styles.videoBlock}>
              <View style={styles.videoThumb}>
                <View style={styles.videoPlayCircle}><Text style={styles.videoPlayIcon}>▶</Text></View>
              </View>
              <PrimaryButton title={t.quiz.watchVideo}
                onPress={() => question.options?.url && Linking.openURL(question.options.url)} />
              <TouchableOpacity onPress={handleVideoDone} style={styles.videoDoneBtn}>
                <Text style={styles.videoDoneText}>{t.quiz.continue}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {state === STATE.FEEDBACK && (
          <Animated.View style={[
            styles.feedbackPanel,
            isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
            { opacity: feedbackAnim, transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }] }
          ]}>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.correct : colors.wrong }, isRTL && styles.rtlText]}>
              {isCorrect ? t.quiz.correct : t.quiz.wrong}
            </Text>
            {question.explanation
              ? <Text style={[styles.feedbackExplanation, isRTL && styles.rtlText]}>{question.explanation}</Text>
              : null}
            <PrimaryButton
              title={t.quiz.continue}
              onPress={advance}
              style={{ backgroundColor: isCorrect ? colors.correct : colors.wrong }}
            />
          </Animated.View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  loader:         { flex: 1, marginTop: 80 },
  progressTrack:  { height: 5, backgroundColor: colors.neutral },
  progressFill:   { height: '100%', backgroundColor: colors.gold, borderRadius: 99 },
  topBar:         { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12 },
  closeBtn:       { padding: 8 },
  closeBtnText:   { fontSize: 16, color: colors.textMuted, fontWeight: '700' },
  qCounter:       { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  questionScroll: { paddingHorizontal: spacing.md, paddingTop: 8 },
  questionCard: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.md,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  questionText:  { fontSize: 20, fontFamily: fonts.heading, color: colors.text, lineHeight: 30, fontWeight: '700' },
  questionImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.md, marginTop: 14, backgroundColor: colors.neutral },
  rtlText:       { textAlign: 'right' },
  optionsContainer: { gap: 2 },
  matchHint:     { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  matchWrap:     { gap: 10 },
  matchCol:      { flex: 1, gap: 8 },
  matchChip: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  matchChipRight:    { backgroundColor: colors.goldPale, borderColor: colors.goldLight },
  matchChipSel:      { borderColor: colors.gold, borderWidth: 2, ...shadow.sm },
  matchChipDone:     { backgroundColor: colors.correctBg, borderColor: colors.correct },
  matchChipWrong:    { backgroundColor: colors.wrongBg, borderColor: colors.wrong },
  matchChipText:     { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  matchChipTextDone: { color: colors.correct },
  videoBlock:    { gap: 12 },
  videoThumb: {
    aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center', ...shadow.md,
  },
  videoPlayCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center', paddingLeft: 4,
  },
  videoPlayIcon: { fontSize: 22, color: colors.white, fontWeight: '900' },
  videoDoneBtn: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary,
    paddingVertical: 14, alignItems: 'center',
  },
  videoDoneText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  feedbackPanel:    { borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.md, ...shadow.lg },
  feedbackCorrect:  { backgroundColor: colors.correctBg, borderWidth: 1.5, borderColor: colors.correct },
  feedbackWrong:    { backgroundColor: colors.wrongBg,   borderWidth: 1.5, borderColor: colors.wrong },
  feedbackTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  feedbackExplanation: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: spacing.md, fontStyle: 'italic' },
  introScroll:   { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg },
  introCard: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg,
    ...shadow.md, borderLeftWidth: 4, borderLeftColor: colors.gold, gap: spacing.md,
  },
  introTitle: { fontSize: 22, fontFamily: fonts.heading, fontWeight: '800', color: colors.primary },
  introText:  { fontSize: 16, lineHeight: 24, color: colors.text },
  introImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.md, backgroundColor: colors.neutral },
  introVideo: {
    aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  introVideoIcon: { fontSize: 32, color: colors.gold },
  resultScroll:     { alignItems: 'center', paddingTop: 32, paddingHorizontal: spacing.lg },
  trophyCircle:     { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...shadow.md, borderWidth: 2, borderColor: colors.goldLight },
  trophyEmoji:      { fontSize: 52 },
  resultTitle:      { fontSize: 30, fontFamily: fonts.heading, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  resultSubtitle:   { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
  resultStats:      { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 28 },
  resultStat:       { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, alignItems: 'center', paddingVertical: 16, ...shadow.sm },
  resultStatValue:  { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4 },
  resultStatLabel:  { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  resultActions:    { width: '100%', gap: 10 },
  homeBtn:          { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  homeBtnText:      { fontSize: 16, fontWeight: '700', color: colors.primary },
});
