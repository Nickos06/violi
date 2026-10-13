import "server-only";
import { db } from "./db";
import { addDays, today } from "./dates";
import { MUSCLES, type Muscle } from "./gym";

export type PrevSet = { type: string; weightKg: number | null; reps: number | null; durationSec: number | null };
export type Bests = { weight: number; e1rm: number; volume: number; reps: number };

/** Sets from the most recent session of each exercise, in order — Hevy's "Previous" column. */
export async function previousFor(userId: string, exerciseIds: string[]) {
  const out: Record<string, PrevSet[]> = {};
  if (!exerciseIds.length) return out;
  const rows = await db.gymSet.findMany({
    where: { userId, exerciseId: { in: exerciseIds } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { exerciseId: true, gymExerciseId: true, type: true, weightKg: true, reps: true, durationSec: true, position: true },
    take: 2000,
  });
  const latestSession: Record<string, string> = {};
  for (const r of rows) latestSession[r.exerciseId] ??= r.gymExerciseId;
  for (const r of rows) {
    if (latestSession[r.exerciseId] !== r.gymExerciseId) continue;
    (out[r.exerciseId] ??= []).push(r);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => (a as { position: number } & PrevSet).position - (b as { position: number } & PrevSet).position);
  return out;
}

/** All-time bests per exercise, from working sets (warm-ups excluded). */
export async function bestsFor(userId: string, exerciseIds: string[]) {
  const out: Record<string, Bests> = {};
  if (!exerciseIds.length) return out;
  const rows = await db.gymSet.findMany({
    where: { userId, exerciseId: { in: exerciseIds }, NOT: { type: "warmup" } },
    select: { exerciseId: true, weightKg: true, reps: true, e1rm: true },
  });
  for (const r of rows) {
    const b = (out[r.exerciseId] ??= { weight: 0, e1rm: 0, volume: 0, reps: 0 });
    b.weight = Math.max(b.weight, r.weightKg ?? 0);
    b.e1rm = Math.max(b.e1rm, r.e1rm ?? 0);
    b.volume = Math.max(b.volume, (r.weightKg ?? 0) * (r.reps ?? 0));
    b.reps = Math.max(b.reps, r.reps ?? 0);
  }
  return out;
}

/** Sets per muscle over the last `days` days. Secondary muscles count half a set. */
export async function muscleDistribution(userId: string, days: number) {
  const from = addDays(today(), -days + 1);
  const sets = await db.gymSet.findMany({
    where: { userId, date: { gte: from }, NOT: { type: "warmup" } },
    select: { gymExercise: { select: { exercise: { select: { muscle: true, secondary: true } } } } },
  });
  const counts = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const s of sets) {
    const ex = s.gymExercise.exercise;
    if (ex.muscle in counts) counts[ex.muscle as Muscle] += 1;
    for (const m of ex.secondary.split(",").filter(Boolean)) if (m in counts) counts[m as Muscle] += 0.5;
  }
  return counts;
}

export async function exerciseHistory(userId: string, exerciseId: string) {
  const sessions = await db.gymExercise.findMany({
    where: { exerciseId, workout: { userId } },
    orderBy: { workout: { startedAt: "desc" } },
    take: 60,
    include: { workout: { select: { id: true, name: true, startedAt: true, date: true } }, sets: { orderBy: { position: "asc" } } },
  });
  return sessions;
}
