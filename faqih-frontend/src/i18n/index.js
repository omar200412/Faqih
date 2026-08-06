// src/i18n/index.js — Language context, hook, and RTL manager

import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

import tr from './tr';
import en from './en';
import ar from './ar';

export const LANGUAGES = { tr, en, ar };
export const LANG_LIST  = [tr, en, ar];

const STORAGE_KEY = '@faqih_language';

// ── Context ──────────────────────────────────────────────────────────────────
const LangContext = createContext({ t: tr, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [t, setT] = useState(tr);

  // Load saved language on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && LANGUAGES[saved]) applyLang(LANGUAGES[saved], false);
    });
  }, []);

  const applyLang = async (lang, save = true) => {
    // Apply RTL for Arabic
    const isRTL = lang.dir === 'rtl';
    const directionChanged = I18nManager.isRTL !== isRTL;
    if (directionChanged) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
    setT(lang);
    if (save) await AsyncStorage.setItem(STORAGE_KEY, lang.lang);
    // I18nManager's RTL flag only takes visual effect after the JS bundle
    // reloads — without this, switching languages mid-session leaves native
    // layout mirroring (and any un-isRTL-aware styling) stuck on whichever
    // direction was active at last app launch, showing the *previous*
    // language's direction instead of the one just selected.
    if (directionChanged && Platform.OS !== 'web') {
      try { await Updates.reloadAsync(); } catch { /* not available (e.g. plain Expo Go without dev client) */ }
    }
  };

  return (
    <LangContext.Provider value={{ t, setLang: applyLang }}>
      {children}
    </LangContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
// Usage:  const { t, setLang } = useLang();
//         <Text>{t.home.greeting}</Text>
//         <Text>{t.home.questionCount(5)}</Text>
export function useLang() {
  return useContext(LangContext);
}

// ── RTL helper ───────────────────────────────────────────────────────────────
// Returns text alignment and flex direction based on current language
export function useRTL() {
  const { t } = useLang();
  const isRTL  = t.dir === 'rtl';
  return {
    isRTL,
    textAlign:      isRTL ? 'right' : 'left',
    flexDirection:  isRTL ? 'row-reverse' : 'row',
    marginStart:    isRTL ? 'marginRight' : 'marginLeft',
    marginEnd:      isRTL ? 'marginLeft'  : 'marginRight',
  };
}