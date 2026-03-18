// src/components/LanguagePicker.js

import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Animated, Pressable,
} from 'react-native';
import { useLang, LANG_LIST } from '../i18n';
import { colors, radius, shadow, spacing } from '../theme';

export default function LanguagePicker({ visible, onClose }) {
  const { t, setLang } = useLang();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleSelect = (lang) => {
    setLang(lang);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[
          styles.sheet,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
          {/* Title */}
          <Text style={styles.title}>{t.langPicker.title}</Text>
          <View style={styles.divider} />

          {/* Language options */}
          {LANG_LIST.map((lang) => {
            const isActive = lang.lang === t.lang;
            return (
              <TouchableOpacity
                key={lang.lang}
                onPress={() => handleSelect(lang)}
                activeOpacity={0.8}
                style={[styles.langRow, isActive && styles.langRowActive]}
              >
                <Text style={styles.flag}>{lang.langFlag}</Text>
                <View style={styles.langInfo}>
                  <Text style={[styles.langName, isActive && styles.langNameActive]}>
                    {lang.langName}
                  </Text>
                  {lang.dir === 'rtl' && (
                    <Text style={styles.rtlTag}>RTL</Text>
                  )}
                </View>
                {isActive && (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* RTL notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              ⚠️  Changing to Arabic requires an app restart to fully apply RTL layout.
            </Text>
          </View>

          {/* Close */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,61,36,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.lg,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: colors.primary,
    textAlign: 'center', marginBottom: 12,
    fontFamily: 'Georgia',
  },
  divider: {
    height: 1, backgroundColor: colors.neutral, marginBottom: 12,
  },

  // Language row
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: radius.md, marginBottom: 6,
    backgroundColor: colors.bg,
    borderWidth: 2, borderColor: 'transparent',
  },
  langRowActive: {
    backgroundColor: '#EEF5F1',
    borderColor: colors.primary,
  },
  flag:     { fontSize: 28 },
  langInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  langName: { fontSize: 17, fontWeight: '700', color: colors.text },
  langNameActive: { color: colors.primary },
  rtlTag: {
    fontSize: 10, fontWeight: '800', color: colors.gold,
    backgroundColor: colors.goldPale, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    letterSpacing: 0.5,
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '800' },

  // Notice
  notice: {
    backgroundColor: '#FFF8E1', borderRadius: radius.md,
    padding: 10, marginTop: 8, marginBottom: 8,
  },
  noticeText: { fontSize: 11, color: '#7A6A00', lineHeight: 16, textAlign: 'center' },

  // Close
  closeBtn: {
    alignSelf: 'center', padding: 8, marginTop: 4,
  },
  closeBtnText: { fontSize: 20, color: colors.textMuted, fontWeight: '700' },
});