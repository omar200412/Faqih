// src/api.js — Faqih API Client

import axios from 'axios';

// ── Change this to your machine's local IP when running backend locally ──────
// e.g. 'http://192.168.1.42:8000'  (do NOT use localhost on a real device)
const BASE_URL = 'https://faqih.onrender.com';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getCategories() {
  try {
    const res = await client.get('/api/categories/');
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_CATEGORIES;
  }
}

export async function getUnit(id) {
  try {
    const res = await client.get(`/api/units/${id}/`);
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_UNITS[id] ?? null;
  }
}

export async function getLesson(id) {
  try {
    const res = await client.get(`/api/lessons/${id}/`);
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_LESSONS[id] ?? null;
  }
}

// ── Mock data (used when backend is not running) ──────────────────────────────

const MOCK_CATEGORIES = [
  {
    id: 1,
    title: 'Temizlik',
    units: [
      { id: 1, title: 'Abdest', lesson_count: 2 },
      { id: 2, title: 'Gusül', lesson_count: 1 },
    ],
  },
  {
    id: 2,
    title: 'Namaz',
    units: [
      { id: 4, title: 'Namaz Vakitleri', lesson_count: 1 },
    ],
  },
];

const MOCK_UNITS = {
  1: {
    id: 1,
    title: 'Abdest',
    lessons: [
      { id: 1, title: 'Abdestin Farzları', has_intro: true, exercise_count: 3 },
      { id: 2, title: 'Abdesti Bozan Şeyler', has_intro: false, exercise_count: 2 },
    ],
  },
};

const MOCK_LESSONS = {
  1: {
    id: 1,
    title: 'Abdestin Farzları',
    intro: {
      kind: 'text',
      body: 'Abdest, namazdan önce yapılan bir temizlenme ibadetidir. Hanefi mezhebine göre 4 farzı vardır.',
    },
    exercises: [
      {
        id: 1,
        question_type: 'mcq',
        text: 'Abdestin kaç farzı vardır?',
        options: ['2', '4', '6', '8'],
        correct_answer: '4',
        explanation: 'Hanefi mezhebine göre abdestin 4 farzı vardır: Yüzü yıkamak, kolları yıkamak, başı meshetmek ve ayakları yıkamak.',
      },
      {
        id: 2,
        question_type: 'ordering',
        text: 'Abdest adımlarını doğru sıraya diz.',
        options: { steps: ['Niyet et', 'Elleri yıka', 'Ağzı çalkala', 'Yüzü yıka'] },
        correct_answer: '',
        explanation: 'Abdest bu sırayla alınır.',
      },
      {
        id: 3,
        question_type: 'fill_blank',
        text: 'Boşluğu doldur.',
        options: { sentence: 'Abdestte kollar ___ kadar yıkanır.', word_bank: ['bileklere', 'dirseklere', 'omuzlara'] },
        correct_answer: 'dirseklere',
        explanation: 'Kollar dirsekler dahil dirseklere kadar yıkanmalıdır.',
      },
    ],
  },
};
