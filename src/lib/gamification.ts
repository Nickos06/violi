import "server-only";
import { db } from "./db";
import { addDays, today } from "./dates";
import { levelFromXp, type AchievementKey } from "./levels";

// XP rules
export const XP = {
  log: 5, // per food entry, capped daily
  logDailyCap: 30,
  dayOnTarget: 40, // calories within ±10% of the day's budget
  dayProtein: 25, // ≥ 90% of protein target
  dayFiber: 10,
  weigh: 10,
  checkin: 50,
  workoutMax: 120,
  post: 5,
  postDailyCap: 15,
  wReceived: 2,
  achievement: 25,
} as const;

/** Workout XP: 1 XP per active minute + 1 per 20 kcal, capped. */
export function workoutXp(durationSec: number, kcal: number) {
  return Math.min(XP.workoutMax, Math.round(durationSec / 60 + kcal / 20));
}

/**
 * Awards XP idempotently: (userId, type, refId) is unique, so repeating an action never double-counts.
 * Returns the amount actually awarded (0 if already awarded).
 */
export async function awardXp(userId: string, type: string, refId: string, amount: number, date = today()) {
  if (amount <= 0) {
    await db.xpEvent.upsert({ where: { userId_type_refId: { userId, type, refId } }, create: { userId, type, refId, amount: 0, date }, update: {} });
    return 0;
  }
  try {
    await db.xpEvent.create({ data: { userId, type, refId, amount, date } });
  } catch {
    return 0; // already awarded
  }
  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, defaultVisibility: true } });
  const after = await db.user.update({ where: { id: userId }, data: { xp: { increment: amount } }, select: { xp: true } });
  const lvBefore = levelFromXp(before.xp).level;
  const lvAfter = levelFromXp(after.xp).level;
  if (lvAfter > lvBefore) {
    await db.post.create({
      data: { userId, type: "achievement", visibility: before.defaultVisibility, payload: { kind: "level", level: lvAfter } },
    });
    for (const [lv, key] of [[5, "level_5"], [10, "level_10"], [20, "level_20"]] as const) {
      if (lvAfter >= lv) await unlock(userId, key);
    }
  }
  return amount;
}

/** Awards XP for a type that has a per-day cap. */
export async function awardCapped(userId: string, type: string, refId: string, amount: number, cap: number) {
  const day = today();
  const agg = await db.xpEvent.aggregate({ where: { userId, type, date: day }, _sum: { amount: true } });
  const remaining = cap - (agg._sum.amount ?? 0);
  if (remaining <= 0) return 0;
  return awardXp(userId, type, refId, Math.min(amount, remaining), day);
}

export async function unlock(userId: string, key: AchievementKey) {
  const exists = await db.achievement.findUnique({ where: { userId_key: { userId, key } } });
  if (exists) return false;
  await db.achievement.create({ data: { userId, key } });
  await awardXp(userId, "achievement", key, XP.achievement);
  return true;
}

/** Updates the logging streak after a food entry on `date`. */
export async function touchStreak(userId: string, date: string) {
  if (date !== today()) return;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { lastLogDate: true, streak: true, longestStreak: true } });
  if (user.lastLogDate === date) return;
  const streak = user.lastLogDate === addDays(date, -1) ? user.streak + 1 : 1;
  await db.user.update({
    where: { id: userId },
    data: { streak, lastLogDate: date, longestStreak: Math.max(user.longestStreak, streak) },
  });
  for (const [n, key, bonus] of [[3, "streak_3", 30], [7, "streak_7", 100], [30, "streak_30", 300], [100, "streak_100", 1000]] as const) {
    if (streak >= n) {
      await unlock(userId, key);
      if (streak === n) await awardXp(userId, "streak", `${key}:${date}`, bonus);
    }
  }
}

/** Streak shown to users: broken if neither today nor yesterday has a log. */
export function liveStreak(user: { streak: number; lastLogDate: string | null }) {
  const t = today();
  if (user.lastLogDate === t || user.lastLogDate === addDays(t, -1)) return user.streak;
  return 0;
}

/**
 * Settles finished days (up to 7 back): awards "day complete" XP for hitting calorie/protein/fiber goals.
 * Runs lazily when the user opens the app.
 */
export async function settleDays(userId: string, budgetFor: (date: string) => Promise<{ kcal: number; protein: number; fiber: number }>) {
  const t = today();
  const from = addDays(t, -7);
  const settled = await db.xpEvent.findMany({ where: { userId, type: "day", refId: { gte: from, lt: t } }, select: { refId: true } });
  const done = new Set(settled.map((s) => s.refId));
  const logs = await db.foodLog.groupBy({
    by: ["date"],
    where: { userId, date: { gte: from, lt: t } },
    _sum: { kcal: true, protein: true, fiber: true },
  });
  for (const day of logs) {
    if (done.has(day.date)) continue;
    const b = await budgetFor(day.date);
    const kcal = day._sum.kcal ?? 0;
    let amount = 0;
    const onTarget = Math.abs(kcal - b.kcal) <= b.kcal * 0.1;
    const protein = (day._sum.protein ?? 0) >= b.protein * 0.9;
    if (onTarget) amount += XP.dayOnTarget;
    if (protein) amount += XP.dayProtein;
    if ((day._sum.fiber ?? 0) >= b.fiber * 0.9) amount += XP.dayFiber;
    await awardXp(userId, "day", day.date, amount, day.date);
    if (onTarget) await awardXp(userId, "day_target", day.date, 0, day.date);
    if (protein) await awardXp(userId, "day_protein", day.date, 0, day.date);
  }
  const [targets, proteins] = await Promise.all([
    db.xpEvent.count({ where: { userId, type: "day_target" } }),
    db.xpEvent.count({ where: { userId, type: "day_protein" } }),
  ]);
  if (targets >= 7) await unlock(userId, "on_target_7");
  if (proteins >= 7) await unlock(userId, "protein_7");
}

export async function checkWorkoutAchievements(userId: string) {
  const count = await db.activity.count({ where: { userId } });
  if (count >= 1) await unlock(userId, "first_workout");
  if (count >= 10) await unlock(userId, "workouts_10");
  if (count >= 50) await unlock(userId, "workouts_50");
}
