"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { isValidDay, today } from "@/lib/dates";
import { awardXp, checkWorkoutAchievements, workoutXp } from "@/lib/gamification";
import { parseFit } from "@/lib/integrations/fit";
import { stravaSync } from "@/lib/integrations/strava";
import { WORKOUT_TYPES } from "@/lib/workouts";

const Manual = z.object({
  type: z.enum(WORKOUT_TYPES),
  name: z.string().trim().min(1).max(80),
  minutes: z.number().positive().max(24 * 60),
  distanceKm: z.number().min(0).max(1000).optional(),
  kcal: z.number().min(0).max(10000),
  avgHr: z.number().int().min(30).max(250).optional(),
  date: z.string().optional(),
});

export async function addWorkout(input: z.input<typeof Manual>) {
  const user = await requireUserApi();
  const d = Manual.parse(input);
  const date = isValidDay(d.date) ? d.date : today();
  const a = await db.activity.create({
    data: {
      userId: user.id, source: "manual", type: d.type, name: d.name, startAt: new Date(`${date}T12:00:00`), date,
      durationSec: Math.round(d.minutes * 60), distanceM: d.distanceKm ? d.distanceKm * 1000 : null, kcal: Math.round(d.kcal), avgHr: d.avgHr ?? null,
    },
  });
  await awardXp(user.id, "workout", a.id, workoutXp(a.durationSec, a.kcal), date);
  await checkWorkoutAchievements(user.id);
  revalidatePath("/", "layout");
  return a.id;
}

export async function uploadFit(form: FormData) {
  const user = await requireUserApi();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error("BAD_FILE");
  const buf = await file.arrayBuffer();
  const s = await parseFit(buf);
  const externalId = `${user.id}:${s.startAt.toISOString()}`;
  const data = {
    userId: user.id, source: "fit", externalId, type: s.type, name: file.name.replace(/\.fit$/i, "") || s.sport, startAt: s.startAt, date: s.date,
    durationSec: s.durationSec, distanceM: s.distanceM, kcal: s.kcal, avgHr: s.avgHr, elevationM: s.elevationM,
  };
  const a = await db.activity.upsert({ where: { source_externalId: { source: "fit", externalId } }, create: data, update: data });
  await awardXp(user.id, "workout", a.id, workoutXp(a.durationSec, a.kcal), a.date);
  await checkWorkoutAchievements(user.id);
  revalidatePath("/", "layout");
  return { id: a.id, kcal: a.kcal, type: a.type };
}

export async function deleteWorkout(id: string) {
  const user = await requireUserApi();
  await db.activity.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}

export async function syncStrava() {
  const user = await requireUserApi();
  const n = await stravaSync(user.id);
  revalidatePath("/", "layout");
  return n;
}
