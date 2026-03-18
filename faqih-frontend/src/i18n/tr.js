// src/i18n/tr.js — Türkçe

export default {
  // Meta
  lang:      'tr',
  langName:  'Türkçe',
  langFlag:  '🇹🇷',
  dir:       'ltr',

  // Home
  home: {
    greeting:       'Selamün Aleyküm 👋',
    lessons:        'Dersler',
    streak:         'gün serisi',
    questionCount:  (n) => `${n} soru`,
    completed:      'Tamamlandı',
    locked:         'Kilitli',
    lessonsUnit:    'ders',
  },

  // Quiz
  quiz: {
    typeMultiple:   'Çoktan Seçmeli',
    typeHotspot:    'Harita',
    correct:        '✓  Doğru!',
    wrong:          '✗  Yanlış!',
    continue:       'Devam Et  →',
    seeResults:     'Sonuçları Gör  →',
    xpLabel:        (n) => `🌟 ${n} XP`,
    question:       (cur, tot) => `${cur} / ${tot}`,
  },

  // Results
  results: {
    perfect:        'Mükemmel!',
    great:          'Harika!',
    keepGoing:      'Devam Et!',
    completed:      'tamamlandı',
    correct:        'Doğru',
    accuracy:       'Başarı',
    xpEarned:       'XP Kazandın',
    mistakes:       'Hata',
    review:         'Gözden Geçir',
    retry:          'Tekrar Çöz',
    home:           'Ana Menü',
  },

  // Profile
  profile: {
    title:          'Profilim',
    level:          (n) => `Seviye ${n}`,
    levelNames:     ['', 'Talebe', 'Öğrenci', 'Alim', 'Fakih', 'Müctehid'],
    xpUntilNext:    (n) => `Sonraki seviye: ${n} XP`,
    thisWeek:       'Bu Hafta',
    weekDays:       ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'],
    stats:          'Genel İstatistik',
    statsItems: {
      completedUnits:  'Tamamlanan Ünite',
      correctAnswers:  'Doğru Cevap',
      totalQuestions:  'Toplam Soru',
      joinDays:        (n) => `${n}g Süre`,
    },
    achievements:   'Başarımlar',
    achUnlocked:    'Kazanıldı',
    settings:       'Ayarlar',
    settingsItems: {
      notifications:  'Bildirimler',
      darkMode:       'Karanlık Mod',
      language:       'Dil Seçimi',
      about:          'Hakkında',
    },
    streakLabel:    'Seri',
    xpLabel:        'XP',
    accuracyLabel:  'Doğruluk',
  },

  // Achievements
  achievements: [
    { icon: '🔥', title: '7 Günlük Seri',   desc: '7 gün üst üste çalıştın',     unlocked: true  },
    { icon: '⭐', title: 'İlk Ders',         desc: 'İlk üniteni tamamladın',       unlocked: true  },
    { icon: '🎯', title: 'Mükemmel Skor',    desc: 'Bir üniteden tam puan aldın',  unlocked: true  },
    { icon: '📖', title: '3 Ünite',          desc: '3 üniteyi tamamladın',         unlocked: true  },
    { icon: '🏆', title: 'Aylık Şampiyon',   desc: '30 gün üst üste çalış',        unlocked: false },
    { icon: '🌙', title: 'Gece Öğrencisi',   desc: '10 gece dersi tamamla',        unlocked: false },
  ],

  // Language picker
  langPicker: {
    title:  'Dil Seçin',
    select: 'Seç',
  },
};