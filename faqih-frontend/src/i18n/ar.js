// src/i18n/ar.js — العربية

export default {
  // Meta
  lang:      'ar',
  langName:  'العربية',
  langFlag:  '🇸🇦',
  dir:       'rtl',   // ← triggers RTL layout in the app

  // Home
  home: {
    greeting:       'السلام عليكم 👋',
    lessons:        'الدروس',
    streak:         'يوم متتالي',
    questionCount:  (n) => `${n} سؤال`,
    completed:      'مكتمل',
    locked:         'مقفل',
    lessonsUnit:    'دروس',
  },

  // Quiz
  quiz: {
    typeMultiple:   'اختيار من متعدد',
    typeHotspot:    'خريطة تفاعلية',
    correct:        '✓  صحيح!',
    wrong:          '✗  خطأ!',
    continue:       '→  استمر',
    seeResults:     '→  عرض النتائج',
    xpLabel:        (n) => `🌟 ${n} نقطة`,
    question:       (cur, tot) => `${cur} / ${tot}`,
  },

  // Results
  results: {
    perfect:        'ممتاز!',
    great:          'رائع!',
    keepGoing:      'استمر!',
    completed:      'اكتمل',
    correct:        'صحيح',
    accuracy:       'الدقة',
    xpEarned:       'نقاط مكتسبة',
    mistakes:       'أخطاء',
    review:         'مراجعة الأخطاء',
    retry:          'أعد المحاولة',
    home:           'الرئيسية',
  },

  // Profile
  profile: {
    title:          'ملفي الشخصي',
    level:          (n) => `المستوى ${n}`,
    levelNames:     ['', 'طالب', 'دارس', 'عالم', 'فقيه', 'مجتهد'],
    xpUntilNext:    (n) => `المستوى التالي: ${n} نقطة`,
    thisWeek:       'هذا الأسبوع',
    weekDays:       ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'أ'],
    stats:          'الإحصائيات العامة',
    statsItems: {
      completedUnits:  'وحدات مكتملة',
      correctAnswers:  'إجابات صحيحة',
      totalQuestions:  'مجموع الأسئلة',
      joinDays:        (n) => `${n} يوم`,
    },
    achievements:   'الإنجازات',
    achUnlocked:    'محقق',
    settings:       'الإعدادات',
    settingsItems: {
      notifications:  'الإشعارات',
      darkMode:       'الوضع الداكن',
      language:       'اللغة',
      about:          'حول التطبيق',
    },
    streakLabel:    'سلسلة',
    xpLabel:        'نقاط',
    accuracyLabel:  'الدقة',
  },

  // Achievements
  achievements: [
    { icon: '🔥', title: 'سلسلة ٧ أيام',    desc: 'درست ٧ أيام متتالية',            unlocked: true  },
    { icon: '⭐', title: 'أول درس',           desc: 'أكملت أول وحدة لك',              unlocked: true  },
    { icon: '🎯', title: 'علامة كاملة',       desc: 'حصلت على كامل النقاط في وحدة',   unlocked: true  },
    { icon: '📖', title: '٣ وحدات',           desc: 'أكملت ثلاث وحدات',               unlocked: true  },
    { icon: '🏆', title: 'بطل الشهر',         desc: 'ادرس ٣٠ يومًا متتاليًا',          unlocked: false },
    { icon: '🌙', title: 'طالب الليل',        desc: 'أكمل ١٠ جلسات مسائية',           unlocked: false },
  ],

  // Language picker
  langPicker: {
    title:  'اختر اللغة',
    select: 'اختر',
  },
};