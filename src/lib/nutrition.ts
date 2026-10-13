// Energy & macro engine.
//
// Model (inspired by how adaptive coaches such as MacroFactor work):
//  • Initial base expenditure = Mifflin-St Jeor BMR × lifestyle multiplier (daily life, *excluding* workouts).
//  • Tracked workouts (Garmin / Strava / .FIT / manual) are added back to the day's budget at the user's
//    "exercise credit" percentage, because wearables tend to overestimate burn.
//  • Each weekly check-in re-estimates base expenditure from energy balance in reverse:
//        expenditure ≈ average intake − Δ(trend weight) × 7700 kcal/kg ÷ days
//    using an exponentially-smoothed trend weight, then blends it with the previous estimate
//    in proportion to how much data was logged, so targets move smoothly week to week.

import type { Sex } from "./nutrients";

export const KCAL_PER_KG = 7700;

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";
export type DietType = "balanced" | "high_protein" | "low_carb" | "keto" | "plant";

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  active: 1.5,
  very_active: 1.6,
};

export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export function initialExpenditure(p: { sex: Sex; weightKg: number; heightCm: number; age: number; activityLevel: ActivityLevel }) {
  return Math.round(bmr(p.sex, p.weightKg, p.heightCm, p.age) * ACTIVITY_MULTIPLIER[p.activityLevel]);
}

/** Daily kcal surplus (+) or deficit (−) needed for the goal rate. */
export function goalDelta(goal: GoalType, ratePctPerWeek: number, weightKg: number) {
  if (goal === "maintain") return 0;
  const kgPerWeek = (ratePctPerWeek / 100) * weightKg;
  const perDay = (kgPerWeek * KCAL_PER_KG) / 7;
  return goal === "lose" ? -perDay : perDay;
}

export type Targets = { kcal: number; protein: number; carbs: number; fat: number };

export function computeTargets(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  expenditure: number;
  goal: GoalType;
  ratePct: number;
  diet: DietType;
}): Targets {
  const floor = Math.max(p.sex === "male" ? 1500 : 1200, Math.round(bmr(p.sex, p.weightKg, p.heightCm, p.age) * 0.95));
  const kcal = Math.max(floor, Math.round(p.expenditure + goalDelta(p.goal, p.ratePct, p.weightKg)));

  // Protein is scaled to a "reference" weight so it stays sensible at higher body fat (cap at BMI 27).
  const hM = p.heightCm / 100;
  const refWeight = Math.min(p.weightKg, 27 * hM * hM);
  let gPerKg = p.goal === "lose" ? 2.0 : 1.8;
  if (p.diet === "high_protein") gPerKg += 0.4;
  if (p.diet === "plant") gPerKg -= 0.2;
  let protein = Math.round(refWeight * gPerKg);

  const fatPct: Record<DietType, number> = { balanced: 0.3, high_protein: 0.28, low_carb: 0.4, keto: 0.7, plant: 0.28 };
  let fat = Math.max(Math.round((kcal * fatPct[p.diet]) / 9), Math.round(p.weightKg * 0.6));
  let carbs: number;

  if (p.diet === "keto") {
    carbs = 25;
    fat = Math.max(0, Math.round((kcal - protein * 4 - carbs * 4) / 9));
  } else {
    carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    if (carbs < 50) {
      carbs = 50;
      protein = Math.max(Math.round(refWeight * 1.6), Math.round((kcal - carbs * 4 - fat * 9) / 4));
      fat = Math.max(0, Math.round((kcal - protein * 4 - carbs * 4) / 9));
    }
  }
  return { kcal, protein, carbs, fat };
}

/** Extra budget earned by a workout; extra energy goes mostly to carbs, some to fat. */
export function exerciseBonus(exerciseKcal: number, creditPct: number) {
  const kcal = Math.round((exerciseKcal * creditPct) / 100);
  return { kcal, carbs: Math.round((kcal * 0.75) / 4), fat: Math.round((kcal * 0.25) / 9) };
}

/** Exponentially-smoothed trend weight with linear interpolation across missing days. */
export function trendSeries(entries: { date: string; weightKg: number }[], alpha = 0.1) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [] as { date: string; weight: number | null; trend: number }[];
  const out: { date: string; weight: number | null; trend: number }[] = [];
  const day = (s: string) => Date.parse(`${s}T12:00:00Z`);
  let trend = sorted[0].weightKg;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const gap = Math.round((day(cur.date) - day(prev.date)) / 86_400_000);
      for (let g = 1; g < gap; g++) {
        const interp = prev.weightKg + ((cur.weightKg - prev.weightKg) * g) / gap;
        trend = trend + alpha * (interp - trend);
        const d = new Date(day(prev.date) + g * 86_400_000).toISOString().slice(0, 10);
        out.push({ date: d, weight: null, trend });
      }
    }
    trend = trend + alpha * (cur.weightKg - trend);
    out.push({ date: cur.date, weight: cur.weightKg, trend });
  }
  return out;
}

export type ExpenditureInput = {
  previous: number;
  bmr: number;
  /** Daily kcal eaten for days that have at least one log in the window. */
  intakeByDay: Record<string, number>;
  /** Daily credited exercise kcal in the window. */
  creditedExerciseByDay: Record<string, number>;
  weights: { date: string; weightKg: number }[];
  windowStart: string;
  windowEnd: string;
};

export type ExpenditureResult = {
  expenditure: number;
  observed: number | null;
  confidence: number;
  trendStart: number | null;
  trendEnd: number | null;
  avgIntake: number | null;
  daysLogged: number;
};

export function estimateExpenditure(input: ExpenditureInput): ExpenditureResult {
  const days = Object.keys(input.intakeByDay).filter((d) => d >= input.windowStart && d <= input.windowEnd);
  const daysLogged = days.length;
  const avgIntake = daysLogged ? days.reduce((s, d) => s + input.intakeByDay[d], 0) / daysLogged : null;
  const avgCredit = daysLogged ? days.reduce((s, d) => s + (input.creditedExerciseByDay[d] ?? 0), 0) / daysLogged : 0;

  const series = trendSeries(input.weights);
  const inWindow = series.filter((s) => s.date >= input.windowStart && s.date <= input.windowEnd);
  const weighIns = input.weights.filter((w) => w.date >= input.windowStart && w.date <= input.windowEnd).length;

  const base: ExpenditureResult = {
    expenditure: Math.round(input.previous),
    observed: null,
    confidence: 0,
    trendStart: inWindow[0]?.trend ?? null,
    trendEnd: inWindow.at(-1)?.trend ?? null,
    avgIntake: avgIntake === null ? null : Math.round(avgIntake),
    daysLogged,
  };
  if (avgIntake === null || inWindow.length < 7 || weighIns < 3 || daysLogged < 5) return base;

  const span = Math.max(1, inWindow.length - 1);
  const deltaKg = inWindow.at(-1)!.trend - inWindow[0].trend;
  const totalObserved = avgIntake - (deltaKg * KCAL_PER_KG) / span;
  const observed = totalObserved - avgCredit;

  const windowDays = Math.max(7, Math.round((Date.parse(input.windowEnd) - Date.parse(input.windowStart)) / 86_400_000) + 1);
  const confidence = Math.min(1, daysLogged / windowDays) * Math.min(1, weighIns / 6) * 0.6;
  let next = input.previous + confidence * (observed - input.previous);
  next = Math.max(input.previous - 300, Math.min(input.previous + 300, next));
  next = Math.max(input.bmr * 1.05, Math.min(input.bmr * 2.6, next));
  return { ...base, expenditure: Math.round(next), observed: Math.round(observed), confidence };
}

export function ageFromBirthYear(year: number | null | undefined) {
  if (!year) return 30;
  return new Date().getFullYear() - year;
}
