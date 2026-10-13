"use client";

// The in-progress workout lives in localStorage so a refresh, a phone lock or switching tabs never
// loses it. It is only written to the server when the user taps Finish.

import { useCallback, useEffect, useState } from "react";
import type { LiveSet, SetType } from "./gym";

export type LiveExercise = { key: string; exerciseId: string; notes: string; showNotes: boolean; restSec: number; superset: number | null; sets: LiveSet[] };
export type LiveWorkout = { id: string; name: string; routineId: string | null; startedAt: number; exercises: LiveExercise[] };

const KEY = "violi.liveWorkout.v1";
const EVENT = "violi:live-workout";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newSet(type: SetType = "normal", weight = "", reps = ""): LiveSet {
  return { key: uid(), type, weight, reps, time: "", rpe: "", done: false };
}

export function readLive(): LiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LiveWorkout) : null;
  } catch {
    return null;
  }
}

export function writeLive(w: LiveWorkout | null) {
  try {
    if (w) localStorage.setItem(KEY, JSON.stringify(w));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to the live workout (also updates across tabs). */
export function useLiveWorkout() {
  const [w, setW] = useState<LiveWorkout | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setW(readLive());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = useCallback((fn: (w: LiveWorkout) => LiveWorkout) => {
    const cur = readLive();
    if (cur) writeLive(fn(cur));
  }, []);
  return { workout: w, ready, update, set: writeLive };
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function defaultWorkoutName(t: { gym: { morning: string; afternoon: string; evening: string } }) {
  const h = new Date().getHours();
  return h < 12 ? t.gym.morning : h < 18 ? t.gym.afternoon : t.gym.evening;
}
