// src/logic/heartsCountdown.js — pure countdown math for the "out of hearts" UI.
// No React/RN imports on purpose: unit-tested directly with `node --test`.
// Mirrors HEART_REGEN_MINUTES in faqih_backend/content/models.py.

const HEART_REGEN_MINUTES = 30;

function minutesUntilNextHeart(lastHeartLostAtIso, now = new Date()) {
  if (!lastHeartLostAtIso) return 0;
  const lostAt = new Date(lastHeartLostAtIso);
  const regenMs = HEART_REGEN_MINUTES * 60 * 1000;
  const elapsedMs = now.getTime() - lostAt.getTime();
  const remainingMs = regenMs - (elapsedMs % regenMs);
  return Math.max(0, Math.ceil(remainingMs / 60000));
}

module.exports = { minutesUntilNextHeart, HEART_REGEN_MINUTES };
