"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { toDay } from "@/lib/dates";
import { e1rm, EQUIPMENT, KINDS, MUSCLES, SET_TYPES, setVolume } from "@/lib/gym";
import { bestsFor } from "@/lib/gym-server";
import { awardCapped, awardXp, checkWorkoutAchievements, unlock, workoutXp, XP } from "@/lib/gamification";
import { estimateWorkoutKcal } from "@/lib/workouts";
import { latestWeight } from "@/lib/plan";

const ownPhoto = (url?: string | null) => (url && /^\/api\/files\/[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(url) ? url : null);

// ---------- Exercises ----------

export async function createExercise(input: { name: string; muscle: string; equipment: string; kind: string; secondary?: string[] }) {
  const user = await requireUserApi();
  const d = z.object({
    name: z.string().trim().min(2).max(80),
    muscle: z.enum(MUSCLES),
    equipment: z.enum(EQUIPMENT),
    kind: z.enum(KINDS),
    secondary: z.array(z.enum(MUSCLES)).max(6).optional(),
  }).parse(input);
  const ex = await db.exercise.create({
    data: { name: d.name, muscle: d.muscle, equipment: d.equipment, kind: d.kind, secondary: (d.secondary ?? []).join(","), createdById: user.id },
  });
  return { id: ex.id, name: ex.name, nameEl: null, muscle: ex.muscle, secondary: ex.secondary, equipment: ex.equipment, kind: ex.kind, custom: true };
}

// ---------- Routines ----------

const TargetSet = z.object({ type: z.enum(SET_TYPES), weight: z.number().min(0).max(1000).nullable(), reps: z.number().int().min(0).max(1000).nullable() });
const RoutineInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).optional(),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    restSec: z.number().int().min(0).max(900),
    notes: z.string().trim().max(300).optional(),
    superset: z.number().int().nullable().optional(),
    sets: z.array(TargetSet).min(1).max(30),
  })).min(1).max(40),
});

export async function saveRoutine(input: z.input<typeof RoutineInput>) {
  const user = await requireUserApi();
  const d = RoutineInput.parse(input);
  const items = d.exercises.map((e, position) => ({
    exerciseId: e.exerciseId, position, restSec: e.restSec, notes: e.notes || null, superset: e.superset ?? null, sets: e.sets,
  }));
  let id = d.id;
  if (id) {
    const r = await db.routine.findFirst({ where: { id, userId: user.id } });
    if (!r) throw new Error("NOT_FOUND");
    await db.routineExercise.deleteMany({ where: { routineId: id } });
    await db.routine.update({ where: { id }, data: { name: d.name, notes: d.notes || null, exercises: { create: items } } });
  } else {
    id = (await db.routine.create({ data: { userId: user.id, name: d.name, notes: d.notes || null, exercises: { create: items } } })).id;
  }
  revalidatePath("/gym");
  return id;
}

export async function deleteRoutine(id: string) {
  const user = await requireUserApi();
  await db.routine.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/gym");
}

export async function duplicateRoutine(id: string) {
  const user = await requireUserApi();
  const r = await db.routine.findFirst({ where: { id, userId: user.id }, include: { exercises: true } });
  if (!r) return;
  await db.routine.create({
    data: {
      userId: user.id, name: `${r.name} (2)`, notes: r.notes,
      exercises: { create: r.exercises.map(({ exerciseId, position, restSec, notes, superset, sets }) => ({ exerciseId, position, restSec, notes, superset, sets: sets ?? [] })) },
    },
  });
  revalidatePath("/gym");
}

// ---------- Finishing a live workout ----------

const LiveSetIn = z.object({
  type: z.enum(SET_TYPES),
  weight: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  durationSec: z.number().int().min(0).max(36000).nullable(),
  rpe: z.number().min(1).max(10).nullable(),
});
const FinishInput = z.object({
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional(),
  routineId: z.string().nullable().optional(),
  startedAt: z.number(),
  endedAt: z.number(),
  photoUrl: z.string().nullable().optional(),
  share: z.boolean(),
  visibility: z.enum(["public", "friends", "private"]),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    notes: z.string().trim().max(300).optional(),
    superset: z.number().int().nullable().optional(),
    sets: z.array(LiveSetIn).max(50),
  })).max(40),
});

export async function finishWorkout(input: z.input<typeof FinishInput>) {
  const user = await requireUserApi();
  const d = FinishInput.parse(input);
  const exercises = d.exercises.filter((e) => e.sets.length > 0);
  if (!exercises.length) throw new Error("EMPTY");

  const started = new Date(Math.min(d.startedAt, Date.now()));
  const ended = new Date(Math.max(d.endedAt, d.startedAt));
  const durationSec = Math.max(60, Math.round((ended.getTime() - started.getTime()) / 1000));
  const date = toDay(started);

  const exIds = [...new Set(exercises.map((e) => e.exerciseId))];
  const meta = new Map((await db.exercise.findMany({ where: { id: { in: exIds } } })).map((e) => [e.id, e]));
  const bests = await bestsFor(user.id, exIds);

  let volume = 0, setsCount = 0, prCount = 0;
  const workout = await db.gymWorkout.create({
    data: { userId: user.id, name: d.name, notes: d.notes || null, routineId: d.routineId ?? null, startedAt: started, endedAt: ended, date, durationSec, photoUrl: ownPhoto(d.photoUrl) },
  });
  const summary: { name: string; sets: number; best: string; pr: boolean }[] = [];

  for (const [position, e] of exercises.entries()) {
    const ex = meta.get(e.exerciseId);
    if (!ex) continue;
    const ge = await db.gymExercise.create({ data: { workoutId: workout.id, exerciseId: ex.id, position, notes: e.notes || null, superset: e.superset ?? null } });
    const best = { ...(bests[ex.id] ?? { weight: 0, e1rm: 0, volume: 0, reps: 0 }) };
    const hadHistory = !!bests[ex.id];
    let topSet: { w: number; r: number; e: number } | null = null;
    let exPr = false;
    for (const [i, s] of e.sets.entries()) {
      const w = s.weight ?? 0;
      const r = s.reps ?? 0;
      const est = ex.kind === "weight_reps" || ex.kind === "weighted_bodyweight" ? e1rm(w, r) : 0;
      const vol = setVolume(ex.kind, w, r);
      const prs: string[] = [];
      if (s.type !== "warmup" && hadHistory) {
        if (w > best.weight && w > 0 && ex.kind !== "assisted") prs.push("weight");
        if (est > best.e1rm && est > 0) prs.push("e1rm");
        if (vol > best.volume && vol > 0) prs.push("volume");
        if (ex.kind === "bodyweight" && r > best.reps) prs.push("reps");
      }
      if (s.type !== "warmup") {
        best.weight = Math.max(best.weight, w); best.e1rm = Math.max(best.e1rm, est);
        best.volume = Math.max(best.volume, vol); best.reps = Math.max(best.reps, r);
        if (!topSet || est > topSet.e || (est === topSet.e && w * r > topSet.w * topSet.r)) topSet = { w, r, e: est };
      }
      if (prs.length) { prCount++; exPr = true; }
      volume += vol;
      setsCount++;
      await db.gymSet.create({
        data: {
          gymExerciseId: ge.id, userId: user.id, exerciseId: ex.id, date, position: i, type: s.type,
          weightKg: s.weight, reps: s.reps, durationSec: s.durationSec, rpe: s.rpe, e1rm: est || null, prs: prs.join(","),
        },
      });
    }
    const label = user.locale === "en" ? ex.name : ex.nameEl ?? ex.name;
    summary.push({
      name: label, sets: e.sets.length, pr: exPr,
      best: ex.kind === "duration" ? "" : ex.kind === "bodyweight" ? `${best.reps} reps` : topSet ? `${topSet.w}kg × ${topSet.r}` : "",
    });
  }

  // Count the session towards the day's energy balance and XP like any other workout.
  const kcal = estimateWorkoutKcal("strength", durationSec / 60, (await latestWeight(user.id)) ?? 75);
  const activity = await db.activity.create({
    data: { userId: user.id, source: "manual", type: "strength", name: d.name, startAt: started, date, durationSec, kcal },
  });
  await awardXp(user.id, "workout", activity.id, workoutXp(durationSec, kcal) + Math.min(60, prCount * 10), date);
  await checkWorkoutAchievements(user.id);

  let postId: string | null = null;
  if (d.share) {
    const post = await db.post.create({
      data: {
        userId: user.id, type: "strength", text: d.notes || null, photoUrl: ownPhoto(d.photoUrl), visibility: d.visibility, refId: workout.id,
        payload: { name: d.name, durationSec, volumeKg: Math.round(volume), sets: setsCount, prs: prCount, exercises: summary.slice(0, 8) },
      },
    });
    postId = post.id;
    await awardCapped(user.id, "post", post.id, XP.post, XP.postDailyCap);
    await unlock(user.id, "first_post");
  }
  await db.gymWorkout.update({ where: { id: workout.id }, data: { volumeKg: volume, setsCount, prCount, activityId: activity.id, postId } });
  revalidatePath("/", "layout");
  return { id: workout.id, prCount };
}

export async function deleteGymWorkout(id: string) {
  const user = await requireUserApi();
  const w = await db.gymWorkout.findFirst({ where: { id, userId: user.id } });
  if (!w) return;
  if (w.activityId) await db.activity.deleteMany({ where: { id: w.activityId, userId: user.id } });
  if (w.postId) await db.post.deleteMany({ where: { id: w.postId, userId: user.id } });
  await db.gymWorkout.delete({ where: { id } });
  revalidatePath("/", "layout");
}
