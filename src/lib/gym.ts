// Strength-training vocabulary and maths shared by server and client.

export const MUSCLES = [
  "chest", "back", "lats", "traps", "shoulders", "biceps", "triceps", "forearms", "abs", "lower_back",
  "quads", "hamstrings", "glutes", "calves", "adductors", "abductors", "full_body", "cardio",
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, { el: string; en: string }> = {
  chest: { el: "Στήθος", en: "Chest" }, back: { el: "Πλάτη", en: "Upper back" }, lats: { el: "Ραχιαίοι", en: "Lats" },
  traps: { el: "Τραπεζοειδής", en: "Traps" }, shoulders: { el: "Ώμοι", en: "Shoulders" }, biceps: { el: "Δικέφαλοι", en: "Biceps" },
  triceps: { el: "Τρικέφαλοι", en: "Triceps" }, forearms: { el: "Πήχεις", en: "Forearms" }, abs: { el: "Κοιλιακοί", en: "Abs" },
  lower_back: { el: "Οσφύς", en: "Lower back" }, quads: { el: "Τετρακέφαλοι", en: "Quads" }, hamstrings: { el: "Οπίσθιοι μηριαίοι", en: "Hamstrings" },
  glutes: { el: "Γλουτοί", en: "Glutes" }, calves: { el: "Γάμπες", en: "Calves" }, adductors: { el: "Προσαγωγοί", en: "Adductors" },
  abductors: { el: "Απαγωγοί", en: "Abductors" }, full_body: { el: "Όλο το σώμα", en: "Full body" }, cardio: { el: "Καρδιο", en: "Cardio" },
};

export const EQUIPMENT = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band", "smith", "ez_bar", "other"] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export const EQUIPMENT_LABEL: Record<Equipment, { el: string; en: string }> = {
  barbell: { el: "Μπάρα", en: "Barbell" }, dumbbell: { el: "Αλτήρες", en: "Dumbbell" }, machine: { el: "Μηχάνημα", en: "Machine" },
  cable: { el: "Τροχαλία", en: "Cable" }, bodyweight: { el: "Σωματικό βάρος", en: "Bodyweight" }, kettlebell: { el: "Kettlebell", en: "Kettlebell" },
  band: { el: "Λάστιχο", en: "Band" }, smith: { el: "Smith", en: "Smith machine" }, ez_bar: { el: "EZ μπάρα", en: "EZ bar" }, other: { el: "Άλλο", en: "Other" },
};

export const KINDS = ["weight_reps", "bodyweight", "weighted_bodyweight", "assisted", "duration"] as const;
export type ExerciseKind = (typeof KINDS)[number];

export const SET_TYPES = ["normal", "warmup", "failure", "drop"] as const;
export type SetType = (typeof SET_TYPES)[number];

export type LiveSet = { key: string; type: SetType; weight: string; reps: string; time: string; rpe: string; done: boolean };

/** Estimated one-rep max (Epley). Only meaningful for ≤ 12 reps; beyond that it is capped. */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10;
}

export function setVolume(kind: string, weight: number | null | undefined, reps: number | null | undefined) {
  if (!reps) return 0;
  if (kind === "weight_reps" || kind === "weighted_bodyweight") return (weight ?? 0) * reps;
  return 0;
}

export function fmtKg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2);
}

export function fmtSet(kind: string, s: { weightKg?: number | null; reps?: number | null; durationSec?: number | null }) {
  if (kind === "duration") return `${Math.floor((s.durationSec ?? 0) / 60)}:${String((s.durationSec ?? 0) % 60).padStart(2, "0")}`;
  if (kind === "bodyweight") return `${s.reps ?? 0}`;
  const w = s.weightKg ?? 0;
  const sign = kind === "assisted" ? "−" : kind === "weighted_bodyweight" ? "+" : "";
  return `${sign}${fmtKg(w)}kg × ${s.reps ?? 0}`;
}

export function fmtClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

/** Plates to load on each side of a bar (kg). */
export function platesPerSide(target: number, bar = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  let side = (target - bar) / 2;
  if (side <= 0) return { plates: [] as number[], remainder: Math.max(0, target - bar) };
  const out: number[] = [];
  for (const p of plates) {
    while (side >= p - 1e-9) {
      out.push(p);
      side -= p;
    }
  }
  return { plates: out, remainder: Math.round(side * 2 * 100) / 100 };
}
