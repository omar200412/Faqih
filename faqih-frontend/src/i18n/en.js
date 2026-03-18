// src/i18n/en.js — English

export default {
  // Meta
  lang:      'en',
  langName:  'English',
  langFlag:  '🇬🇧',
  dir:       'ltr',

  // Home
  home: {
    greeting:       'As-salamu alaykum 👋',
    lessons:        'Lessons',
    streak:         'day streak',
    questionCount:  (n) => `${n} questions`,
    completed:      'Completed',
    locked:         'Locked',
    lessonsUnit:    'lessons',
  },

  // Quiz
  quiz: {
    typeMultiple:   'Multiple Choice',
    typeHotspot:    'Diagram',
    correct:        '✓  Correct!',
    wrong:          '✗  Wrong!',
    continue:       'Continue  →',
    seeResults:     'See Results  →',
    xpLabel:        (n) => `🌟 ${n} XP`,
    question:       (cur, tot) => `${cur} / ${tot}`,
  },

  // Results
  results: {
    perfect:        'Perfect!',
    great:          'Great job!',
    keepGoing:      'Keep going!',
    completed:      'completed',
    correct:        'Correct',
    accuracy:       'Accuracy',
    xpEarned:       'XP Earned',
    mistakes:       'Mistakes',
    review:         'Review Mistakes',
    retry:          'Try Again',
    home:           'Home',
  },

  // Profile
  profile: {
    title:          'My Profile',
    level:          (n) => `Level ${n}`,
    levelNames:     ['', 'Student', 'Learner', 'Scholar', 'Faqih', 'Mujtahid'],
    xpUntilNext:    (n) => `Next level: ${n} XP`,
    thisWeek:       'This Week',
    weekDays:       ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    stats:          'Statistics',
    statsItems: {
      completedUnits:  'Units Done',
      correctAnswers:  'Correct Answers',
      totalQuestions:  'Total Questions',
      joinDays:        (n) => `${n}d Active`,
    },
    achievements:   'Achievements',
    achUnlocked:    'Unlocked',
    settings:       'Settings',
    settingsItems: {
      notifications:  'Notifications',
      darkMode:       'Dark Mode',
      language:       'Language',
      about:          'About',
    },
    streakLabel:    'Streak',
    xpLabel:        'XP',
    accuracyLabel:  'Accuracy',
  },

  // Achievements
  achievements: [
    { icon: '🔥', title: '7-Day Streak',    desc: 'You studied 7 days in a row',      unlocked: true  },
    { icon: '⭐', title: 'First Lesson',     desc: 'You completed your first unit',     unlocked: true  },
    { icon: '🎯', title: 'Perfect Score',    desc: 'Got full marks in a unit',          unlocked: true  },
    { icon: '📖', title: '3 Units Done',     desc: 'You completed 3 units',             unlocked: true  },
    { icon: '🏆', title: 'Monthly Champ',    desc: 'Study 30 days in a row',            unlocked: false },
    { icon: '🌙', title: 'Night Learner',    desc: 'Complete 10 night sessions',        unlocked: false },
  ],

  // Language picker
  langPicker: {
    title:  'Choose Language',
    select: 'Select',
  },
};