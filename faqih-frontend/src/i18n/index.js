// src/i18n/index.js — Language context, hook, and RTL manager

import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const applyLang = (lang, save = true) => {
    // Apply RTL for Arabic
    const isRTL = lang.dir === 'rtl';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Note: on a real device you'd call Updates.reloadAsync() here
      // to fully apply RTL. In Expo Go it takes effect on next reload.
    }
    setT(lang);
    if (save) AsyncStorage.setItem(STORAGE_KEY, lang.lang);
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