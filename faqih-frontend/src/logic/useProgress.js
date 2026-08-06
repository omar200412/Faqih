// src/logic/useProgress.js — shared hearts/gems/xp progress state.
// Thin React wrapper around the pure API functions in ../API; both
// HomeScreen (to render pills/path) and LessonScreen (to spend hearts,
// earn gems) read/write through this single hook so they never drift.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDeviceId, getProgress, postAnswer, postCompleteLesson, postRefillHearts,
  DEFAULT_PROGRESS,
} from '../API';

export function useProgress() {
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const deviceIdRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const id = deviceIdRef.current ?? await getDeviceId();
    deviceIdRef.current = id;
    const data = await getProgress(id);
    setProgress(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reportAnswer = useCallback(async (correct) => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const updated = await postAnswer(id, correct);
    if (updated) setProgress(updated);
    return updated;
  }, []);

  const completeLesson = useCallback(async (lessonId) => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const updated = await postCompleteLesson(id, lessonId);
    if (updated) setProgress(updated);
    return updated;
  }, []);

  const refillHearts = useCallback(async () => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const result = await postRefillHearts(id);
    if (result.ok) setProgress(result.progress);
    return result;
  }, []);

  return { progress, loading, refresh: load, reportAnswer, completeLesson, refillHearts };
}
