// Live activity recorder: a pure state machine fed by GPS fixes and the clock, persisted to localStorage
// so a reload, a crash or a closed tab never loses the session. UI lives in src/app/record.

import { haversine, simplify, type Route, type RoutePoint, type Split } from "./route";
import { SPORT, type Sport } from "./sports";

export type RecStatus = "recording" | "paused" | "autopaused";
export type Fix = { lat: number; lng: number; acc: number; alt: number | null; speed: number | null; t: number };

export type RecState = {
  v: 1;
  sport: Sport;
  status: RecStatus;
  startedAt: number;
  movingMs: number; // moving time banked before the current segment
  segStart: number | null; // when the moving clock last started (null while paused)
  distM: number;
  maxSpeed: number;
  gain: number;
  eleSmooth: number | null;
  eleRef: number | null;
  pts: RoutePoint[];
  breaks: number[];
  needBreak: boolean;
  splits: Split[];
  splitMs: number;
  splitEle: number | null;
  slowSince: number | null;
  last: { lat: number; lng: number; t: number } | null;
};

export type RecPrefs = { autoPause: boolean; audio: boolean; countdown: boolean; keepAwake: boolean };
export const DEFAULT_PREFS: RecPrefs = { autoPause: true, audio: true, countdown: true, keepAwake: true };

const KEY = "violi.recording.v1";
const PREFS = "violi.recordPrefs.v1";
export const MAX_ACCURACY = 35; // metres; worse fixes are ignored
const MIN_STEP = 3; // metres between stored points (GPS jitter filter)
const MAX_SPEED = 70; // m/s; faster jumps are GPS glitches

export function startRecording(sport: Sport, now = Date.now()): RecState {
  return {
    v: 1, sport, status: "recording", startedAt: now, movingMs: 0, segStart: now, distM: 0, maxSpeed: 0, gain: 0,
    eleSmooth: null, eleRef: null, pts: [], breaks: [], needBreak: false, splits: [], splitMs: 0, splitEle: null, slowSince: null, last: null,
  };
}

export const movingMs = (s: RecState, now = Date.now()) => s.movingMs + (s.segStart != null ? Math.max(0, now - s.segStart) : 0);
export const elapsedMs = (s: RecState, now = Date.now()) => now - s.startedAt;

export function pause(s: RecState, now = Date.now()): RecState {
  if (s.status === "paused") return s;
  return { ...s, status: "paused", movingMs: movingMs(s, now), segStart: null, needBreak: true, slowSince: null };
}

export function resume(s: RecState, now = Date.now()): RecState {
  if (s.status === "recording") return s;
  return { ...s, status: "recording", segStart: now, slowSince: null, last: s.status === "paused" ? null : s.last };
}

/** Feeds one GPS fix. Returns the new state and, when a kilometre was completed, the split for audio cues. */
export function addFix(s: RecState, f: Fix, prefs: RecPrefs): { state: RecState; split?: Split & { km: number } } {
  if (s.status === "paused" || f.acc > MAX_ACCURACY) return { state: s };
  const sport = SPORT[s.sport];
  const ele = f.alt;
  const point = (distM: number): RoutePoint => [round6(f.lat), round6(f.lng), ele == null ? null : Math.round(ele * 10) / 10, Math.round((f.t - s.startedAt) / 100) / 10, Math.round(distM * 10) / 10];

  // First fix of a segment: anchor it without adding distance.
  if (!s.last || s.needBreak) {
    const breaks = s.needBreak && s.pts.length ? [...s.breaks, s.pts.length] : s.breaks;
    return { state: { ...s, pts: [...s.pts, point(s.distM)], breaks, needBreak: false, last: { lat: f.lat, lng: f.lng, t: f.t }, ...eleStep(s, ele) } };
  }

  const d = haversine(s.last.lat, s.last.lng, f.lat, f.lng);
  const dt = Math.max(0.001, (f.t - s.last.t) / 1000);
  if (d / dt > MAX_SPEED) return { state: s };
  const speed = f.speed != null && f.speed >= 0 ? f.speed : d / dt;

  // Auto-pause: stop the moving clock after 5 s below the sport's threshold, restart once moving again.
  const autoPause = prefs.autoPause && sport.pause > 0;
  if (s.status === "autopaused") {
    if (!autoPause || speed >= sport.pause * 1.25) s = { ...s, status: "recording", segStart: f.t };
    else return { state: { ...s, last: { lat: f.lat, lng: f.lng, t: f.t } } };
  } else if (autoPause) {
    if (speed < sport.pause) {
      const slowSince = s.slowSince ?? f.t;
      if (f.t - slowSince > 5000) {
        const banked = s.movingMs + Math.max(0, slowSince - (s.segStart ?? slowSince));
        return { state: { ...s, status: "autopaused", movingMs: banked, segStart: null, slowSince: null, last: { lat: f.lat, lng: f.lng, t: f.t } } };
      }
      s = { ...s, slowSince };
    } else if (s.slowSince != null) s = { ...s, slowSince: null };
  }

  if (d < Math.max(MIN_STEP, f.acc * 0.25)) return { state: s };

  const distM = s.distM + d;
  let next: RecState = {
    ...s, distM, pts: [...s.pts, point(distM)], last: { lat: f.lat, lng: f.lng, t: f.t },
    maxSpeed: f.acc <= 20 ? Math.max(s.maxSpeed, Math.min(speed, MAX_SPEED)) : s.maxSpeed, ...eleStep(s, ele),
  };

  let split: (Split & { km: number }) | undefined;
  if (distM >= (next.splits.length + 1) * 1000) {
    const mv = movingMs(next, f.t);
    split = { km: next.splits.length + 1, sec: Math.round((mv - next.splitMs) / 1000), elev: Math.round((next.eleSmooth ?? 0) - (next.splitEle ?? next.eleSmooth ?? 0)) };
    next = { ...next, splits: [...next.splits, { sec: split.sec, elev: split.elev }], splitMs: mv, splitEle: next.eleSmooth };
  }
  return { state: next, split };
}

// Smoothed altitude with 3 m hysteresis (same rule as lib/route elevationGain).
function eleStep(s: RecState, ele: number | null): Pick<RecState, "eleSmooth" | "eleRef" | "gain" | "splitEle"> {
  if (ele == null) return { eleSmooth: s.eleSmooth, eleRef: s.eleRef, gain: s.gain, splitEle: s.splitEle };
  const smooth = s.eleSmooth == null ? ele : s.eleSmooth + 0.3 * (ele - s.eleSmooth);
  let ref = s.eleRef ?? smooth, gain = s.gain;
  if (smooth - ref >= 3) { gain += smooth - ref; ref = smooth; } else if (ref - smooth >= 3) ref = smooth;
  return { eleSmooth: smooth, eleRef: ref, gain, splitEle: s.splitEle ?? smooth };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Final numbers for the save screen and the server. */
export function summary(s: RecState, now = Date.now()) {
  const route: Route = simplify({ pts: s.pts, breaks: s.breaks }, 3000);
  return {
    sport: s.sport,
    startedAt: s.startedAt,
    elapsedSec: Math.round(elapsedMs(s, now) / 1000),
    movingSec: Math.round(movingMs(s, now) / 1000),
    distM: Math.round(s.distM),
    elevGainM: Math.round(s.gain),
    maxSpeed: Math.round(s.maxSpeed * 100) / 100,
    route,
    splits: s.splits,
  };
}
export type RecSummary = ReturnType<typeof summary>;

// ── Persistence (guarded: storage can be unavailable or full) ─────────────────

export function loadRecording(): RecState | null {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); return s?.v === 1 ? s : null; } catch { return null; }
}
export function saveRecording(s: RecState | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch {}
}
export function loadPrefs(): RecPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS) ?? "{}") }; } catch { return DEFAULT_PREFS; }
}
export function savePrefs(p: RecPrefs) {
  try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch {}
}
