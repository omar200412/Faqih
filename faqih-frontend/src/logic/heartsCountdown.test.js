const test = require('node:test');
const assert = require('node:assert/strict');
const { minutesUntilNextHeart } = require('./heartsCountdown');

test('returns 0 when no heart has been lost', () => {
  assert.equal(minutesUntilNextHeart(null), 0);
});

test('returns close to 30 minutes right after a heart is lost', () => {
  const now = new Date('2026-08-06T12:00:00Z');
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  assert.equal(minutesUntilNextHeart(lostAt, now), 30);
});

test('counts down as time passes', () => {
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  const now = new Date('2026-08-06T12:20:00Z');
  assert.equal(minutesUntilNextHeart(lostAt, now), 10);
});

test('wraps to the next 30-minute window once one has elapsed', () => {
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  const now = new Date('2026-08-06T12:45:00Z');
  assert.equal(minutesUntilNextHeart(lostAt, now), 15);
});
