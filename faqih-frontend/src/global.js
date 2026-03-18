// src/global.js

export const GLOBAL_USER = {
  name: 'Ömer Kaya',
  level: 1,
  xp: 340,
  xpMax: 500,
  streak: 7,
  completedUnits: [],
  totalQuestions: 0,
  correctAnswers: 0,
  perfectScores: 0,
  joinDays: 1,
  isDarkMode: false, // 🚀 BÜTÜN UYGULAMAYI KONTROL EDEN KARANLIK MOD ŞALTERİ
};

// Seviye atlama kontrolü
export const checkLevelUp = () => {
  if (GLOBAL_USER.xp >= GLOBAL_USER.xpMax) {
    GLOBAL_USER.level += 1;
    GLOBAL_USER.xp -= GLOBAL_USER.xpMax;
    GLOBAL_USER.xpMax = Math.floor(GLOBAL_USER.xpMax * 1.5);
  }
};