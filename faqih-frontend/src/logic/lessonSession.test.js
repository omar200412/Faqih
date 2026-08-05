const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession, answerCurrent } = require('./lessonSession');

test('starts with all exercises queued in order and not finished', () => {
  const session = createSession([{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(session.finished, false);
  assert.equal(session.current.id, 1);
  assert.equal(session.mistakeCount, 0);
});

test('a correct answer advances to the next exercise', () => {
  let session = createSession([{ id: 1 }, { id: 2 }]);
  session = answerCurrent(session, true);
  assert.equal(session.current.id, 2);
  assert.equal(session.finished, false);
});

test('a wrong answer resurfaces the exercise later, not immediately next', () => {
  let session = createSession([{ id: 1 }, { id: 2 }, { id: 3 }]);
  session = answerCurrent(session, false); // miss exercise 1
  assert.notEqual(session.current.id, 1, 'the missed exercise should not be immediately next');
  assert.equal(session.mistakeCount, 1);
});

test('the lesson finishes only once every exercise has been answered correctly at least once', () => {
  let session = createSession([{ id: 1 }, { id: 2 }]);
  session = answerCurrent(session, false); // miss 1, queue: [2, 1]
  session = answerCurrent(session, true);  // pass 2, queue: [1]
  assert.equal(session.finished, false);
  session = answerCurrent(session, true);  // pass 1 (retry)
  assert.equal(session.finished, true);
  assert.equal(session.mistakeCount, 1);
});

test('answering after the session is finished is a no-op', () => {
  let session = createSession([{ id: 1 }]);
  session = answerCurrent(session, true);
  assert.equal(session.finished, true);
  const again = answerCurrent(session, true);
  assert.equal(again, session, 'should return the same session unchanged');
});
