// src/logic/lessonSession.js — pure mistake-queue engine for a lesson.
// No React/RN imports on purpose: this is unit-tested directly with `node --test`.
//
// A wrong answer is requeued a few exercises later (not immediately next),
// so the lesson only finishes once every exercise has been answered correctly
// at least once. Sessions are never persisted — exiting a lesson always
// restarts clean (see docs/superpowers/specs/2026-08-05-curriculum-lesson-model-design.md).

const RESURFACE_OFFSET = 2;

function createSession(exercises) {
  const queue = exercises.map((_, i) => i);
  return {
    exercises,
    queue,
    mistakeCount: 0,
    finished: queue.length === 0,
    current: exercises[queue[0]] ?? null,
  };
}

function answerCurrent(session, isCorrect) {
  if (session.finished) return session;

  const [answeredIndex, ...rest] = session.queue;
  let nextQueue = rest;

  if (!isCorrect) {
    const insertAt = Math.min(RESURFACE_OFFSET, nextQueue.length);
    nextQueue = [
      ...nextQueue.slice(0, insertAt),
      answeredIndex,
      ...nextQueue.slice(insertAt),
    ];
  }

  const finished = nextQueue.length === 0;
  return {
    ...session,
    queue: nextQueue,
    mistakeCount: session.mistakeCount + (isCorrect ? 0 : 1),
    finished,
    current: finished ? null : session.exercises[nextQueue[0]],
  };
}

module.exports = { createSession, answerCurrent };
