// src/api.js — Faqih API Client

import axios from 'axios';

// ── Change this to your machine's local IP when running backend locally ──────
// e.g. 'http://192.168.1.42:8000'  (do NOT use localhost on a real device)
const BASE_URL = 'http://192.168.1.100:8000';

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
    const res = await client.get(`/api/unit/${id}/`);
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_UNITS[id] ?? null;
  }
}

// ── Mock data (used when backend is not running) ──────────────────────────────

const MOCK_CATEGORIES = [
  {
    id: 1,
    title: 'Temizlik',
    units: [
      { id: 1, title: 'Abdest', question_count: 5 },
      { id: 2, title: 'Gusül', question_count: 4 },
      { id: 3, title: 'Teyemmüm', question_count: 3 },
    ],
  },
  {
    id: 2,
    title: 'Namaz',
    units: [
      { id: 4, title: 'Namaz Vakitleri', question_count: 5 },
      { id: 5, title: 'Namazın Farzları', question_count: 6 },
    ],
  },
  {
    id: 3,
    title: 'Oruç',
    units: [
      { id: 6, title: 'Ramazan Orucu', question_count: 4 },
    ],
  },
];

const MOCK_UNITS = {
  1: {
    id: 1,
    title: 'Abdest',
    questions: [
      {
        id: 1,
        question_type: 'mcq',
        text: 'Abdestin kaç farzı vardır?',
        options: ['2', '4', '6', '8'],
        correct_option: '4',
        explanation: 'Hanefi mezhebine göre abdestin 4 farzı vardır: Yüzü yıkamak, kolları yıkamak, başı meshetmek ve ayakları yıkamak.',
      },
      {
        id: 2,
        question_type: 'mcq',
        text: 'Aşağıdakilerden hangisi abdestin farzlarından biri DEĞİLDİR?',
        options: ['Yüzü yıkamak', 'Boynu meshetmek', 'Kolları yıkamak', 'Ayakları yıkamak'],
        correct_option: 'Boynu meshetmek',
        explanation: 'Boynu meshetmek sünnet, başı meshetmek ise farzdır.',
      },
      {
        id: 3,
        question_type: 'mcq',
        text: 'Abdestte kollar ne kadar yıkanır?',
        options: ['Bileklere kadar', 'Dirseklere kadar', 'Omuzlara kadar', 'Parmaklara kadar'],
        correct_option: 'Dirseklere kadar',
        explanation: 'Kollar dirsekler dahil dirseklere kadar yıkanmalıdır.',
      },
      {
        id: 4,
        question_type: 'mcq',
        text: 'Abdest almayı engelleyen hadestlerden biri hangisidir?',
        options: ['Uyku', 'Yemek yemek', 'Dua etmek', 'Namaz kılmak'],
        correct_option: 'Uyku',
        explanation: 'Derin uyku abdesti bozar çünkü bilinç ortadan kalkar.',
      },
      {
        id: 5,
        question_type: 'mcq',
        text: 'Misvak kullanmak abdestin hangi türü kapsamındadır?',
        options: ['Farz', 'Sünnet', 'Vacip', 'Mekruh'],
        correct_option: 'Sünnet',
        explanation: 'Misvak veya diş fırçası kullanmak abdestin sünnetlerindendir.',
      },
    ],
  },
  4: {
    id: 4,
    title: 'Namaz Vakitleri',
    questions: [
      {
        id: 10,
        question_type: 'mcq',
        text: 'Günde kaç vakit namaz kılınır?',
        options: ['3', '4', '5', '6'],
        correct_option: '5',
        explanation: 'Günde 5 vakit namaz farz olarak kılınır: Sabah, Öğle, İkindi, Akşam ve Yatsı.',
      },
      {
        id: 11,
        question_type: 'mcq',
        text: 'Sabah namazının vakti ne zaman girer?',
        options: ['Gece yarısı', 'Tan yeri ağarınca', 'Güneş doğunca', 'Öğleden önce'],
        correct_option: 'Tan yeri ağarınca',
        explanation: 'Sabah namazının vakti fecr-i sadık (gerçek şafak) ile girer.',
      },
      {
        id: 12,
        question_type: 'mcq',
        text: 'Hangi namaz vakti güneşin tam tepede olduğu zamandır?',
        options: ['Sabah', 'Öğle', 'İkindi', 'Akşam'],
        correct_option: 'Öğle',
        explanation: 'Öğle namazı güneşin tepe noktasını geçmesinden sonra kılınır.',
      },
    ],
  },
};