import "server-only";
import type { User } from "@prisma/client";
import { db } from "./db";
import { addDays, today } from "./dates";
import {
  ageFromBirthYear, bmr, computeTargets, estimateExpenditure, exerciseBonus, initialExpenditure, trendSeries,
  type ActivityLevel, type DietType, type GoalType,
} from "./nutrition";
import { addMicros, asMicros, fiberTarget, microTargets, type Micros, type Sex } from "./nutrients";

export async function latestWeight(userId: string) {
  const w = await db.weightEntry.findFirst({ where: { userId }, orderBy: { date: "desc" } });
  return w?.weightKg ?? null;
}

export async function currentTrendWeight(userId: string) {
  const weights = await db.weightEntry.findMany({ where: { userId, date: { gte: addDays(today(), -60) } }, orderBy: { date: "asc" } });
  const s = trendSeries(weights);
  return s.at(-1)?.trend ?? (await latestWeight(userId));
}

export function profileOf(user: User, weightKg: number) {
  return {
    sex: (user.sex ?? "male") as Sex,
    weightKg,
    heightCm: user.heightCm ?? 175,
    age: ageFromBirthYear(user.birthYear),
    activityLevel: (user.activityLevel ?? "light") as ActivityLevel,
    goal: (user.goalType ?? "maintain") as GoalType,
    ratePct: user.goalRatePct,
    diet: user.dietType as DietType,
  };
}

/** Recomputes targets from the current expenditure estimate (or an initial one) and stores them. */
export async function recalcTargets(userId: string, opts: { resetExpenditure?: boolean } = {}) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const weight = (await currentTrendWeight(userId)) ?? 75;
  const p = profileOf(user, weight);
  const expenditure = opts.resetExpenditure || !user.expenditure ? initialExpenditure(p) : user.expenditure;
  const t = computeTargets({ ...p, expenditure });
  return db.user.update({
    where: { id: userId },
    data: {
      expenditure,
      expenditureAt: opts.resetExpenditure || !user.expenditure ? new Date() : user.expenditureAt,
      targetKcal: t.kcal, targetProtein: t.protein, targetCarbs: t.carbs, targetFat: t.fat,
    },
  });
}

export async function exerciseKcalByDay(userId: string, from: string, to: string) {
  const acts = await db.activity.groupBy({ by: ["date"], where: { userId, date: { gte: from, lte: to } }, _sum: { kcal: true } });
  return Object.fromEntries(acts.map((a) => [a.date, a._sum.kcal ?? 0])) as Record<string, number>;
}

export type DayBudget = {
  kcal: number; protein: number; carbs: number; fat: number; fiber: number;
  baseKcal: number; exerciseKcal: number; exerciseBonus: number;
};

export async function budgetForDay(user: User, date: string): Promise<DayBudget> {
  const ex = (await exerciseKcalByDay(user.id, date, date))[date] ?? 0;
  const bonus = exerciseBonus(ex, user.exerciseCreditPct);
  const baseKcal = user.targetKcal ?? 2000;
  const kcal = baseKcal + bonus.kcal;
  return {
    kcal,
    protein: user.targetProtein ?? 140,
    carbs: (user.targetCarbs ?? 220) + bonus.carbs,
    fat: (user.targetFat ?? 65) + bonus.fat,
    fiber: fiberTarget(kcal),
    baseKcal,
    exerciseKcal: ex,
    exerciseBonus: bonus.kcal,
  };
}

export async function daySummary(user: User, date: string) {
  const [logs, activities, daily, budget] = await Promise.all([
    db.foodLog.findMany({ where: { userId: user.id, date }, orderBy: { createdAt: "asc" } }),
    db.activity.findMany({ where: { userId: user.id, date }, orderBy: { startAt: "asc" } }),
    db.dailyActivity.findFirst({ where: { userId: user.id, date } }),
    budgetForDay(user, date),
  ]);
  const totals = logs.reduce(
    (s, l) => ({
      kcal: s.kcal + l.kcal, protein: s.protein + l.protein, carbs: s.carbs + l.carbs, fat: s.fat + l.fat,
      fiber: s.fiber + l.fiber, sugar: s.sugar + l.sugar, micros: addMicros(s.micros, asMicros(l.micros)),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, micros: {} as Micros },
  );
  const sex = (user.sex ?? "male") as Sex;
  const micro = microTargets(sex, ageFromBirthYear(user.birthYear), budget.kcal);
  return { logs, activities, daily, budget, totals, microTargets: micro };
}

/** Weekly check-in: re-estimate expenditure from the last 21 days, update targets, and record it. */
export async function runCheckIn(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const end = addDays(today(), -1);
  const start = addDays(end, -20);
  const [logs, weights, exercise] = await Promise.all([
    db.foodLog.groupBy({ by: ["date"], where: { userId, date: { gte: start, lte: end } }, _sum: { kcal: true } }),
    db.weightEntry.findMany({ where: { userId, date: { gte: addDays(start, -14), lte: end } }, orderBy: { date: "asc" } }),
    exerciseKcalByDay(userId, start, end),
  ]);
  const intakeByDay = Object.fromEntries(logs.filter((l) => (l._sum.kcal ?? 0) > 400).map((l) => [l.date, l._sum.kcal ?? 0]));
  const credited = Object.fromEntries(Object.entries(exercise).map(([d, k]) => [d, (k * user.exerciseCreditPct) / 100]));
  const weight = (await currentTrendWeight(userId)) ?? 75;
  const p = profileOf(user, weight);
  const previous = user.expenditure ?? initialExpenditure(p);

  const est = estimateExpenditure({
    previous, bmr: bmr(p.sex, p.weightKg, p.heightCm, p.age), intakeByDay, creditedExerciseByDay: credited,
    weights, windowStart: start, windowEnd: end,
  });
  const t = computeTargets({ ...p, expenditure: est.expenditure });
  await db.user.update({
    where: { id: userId },
    data: { expenditure: est.expenditure, expenditureAt: new Date(), targetKcal: t.kcal, targetProtein: t.protein, targetCarbs: t.carbs, targetFat: t.fat },
  });
  const series = trendSeries(weights);
  const lastWeek = series.filter((s) => s.date >= addDays(end, -7));
  const weeklyChange = lastWeek.length >= 2 ? lastWeek.at(-1)!.trend - lastWeek[0].trend : null;
  return db.checkIn.create({
    data: {
      userId, date: today(), expenditure: est.expenditure, prevExpenditure: previous, targetKcal: t.kcal,
      protein: t.protein, carbs: t.carbs, fat: t.fat, trendWeight: est.trendEnd, weeklyChangeKg: weeklyChange,
      avgIntake: est.avgIntake, daysLogged: est.daysLogged,
    },
  });
}

export async function checkInStatus(user: User) {
  const last = await db.checkIn.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const since = last ? Math.floor((Date.now() - last.createdAt.getTime()) / 86_400_000) : Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
  return { last, due: since >= 7, daysUntil: Math.max(0, 7 - since) };
}
