"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { isValidDay, toDay, today } from "@/lib/dates";
import { awardXp, checkWorkoutAchievements, revokeXp, workoutXp } from "@/lib/gamification";
import { parseFit } from "@/lib/integrations/fit";
import { stravaSync } from "@/lib/integrations/strava";
import type { Activity } from "@prisma/client";
import { WORKOUT_TYPES } from "@/lib/workouts";
import { estimateKcal, sportOf } from "@/lib/sports";
import { latestWeight } from "@/lib/plan";
import { createWorkoutPost, ownPhoto } from "@/lib/social-post";

const Share = z.object({ visibility: z.string().optional(), text: z.string().max(1000).optional(), showMap: z.boolean().optional() }).nullish();

const Manual = z.object({
  type: z.enum(WORKOUT_TYPES),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional(),
  date: z.string().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  seconds: z.number().int().positive().max(48 * 3600),
  distanceKm: z.number().min(0).max(2000).optional(),
  elevationM: z.number().min(0).max(20000).optional(),
  kcal: z.number().min(0).max(20000).optional(),
  avgHr: z.number().int().min(30).max(250).optional(),
  effort: z.number().int().min(1).max(10).optional(),
  photoUrl: z.string().nullish(),
  share: Share,
});

/** Strava-style manual activity: sport, title, description, start date & time, duration, distance, elevation, effort. */
export async function addWorkout(input: z.input<typeof Manual>) {
  const user = await requireUserApi();
  const d = Manual.parse(input);
  const date = isValidDay(d.date) ? d.date : today();
  const kcal = d.kcal ?? estimateKcal(d.type, d.seconds, (await latestWeight(user.id)) ?? 75);
  const a = await db.activity.create({
    data: {
      userId: user.id, source: "manual", type: d.type, name: d.name, description: d.description || null, startAt: new Date(`${date}T${d.time ?? "12:00"}:00`), date,
      durationSec: d.seconds, elapsedSec: d.seconds, distanceM: d.distanceKm ? Math.round(d.distanceKm * 1000) : null, elevationM: d.elevationM ?? null,
      kcal: Math.round(kcal), avgHr: d.avgHr ?? null, effort: d.effort ?? null, photoUrl: ownPhoto(d.photoUrl),
    },
  });
  await afterSave(user, a, d.share);
  return a.id;
}

const Recorded = z.object({
  type: z.enum(WORKOUT_TYPES),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional(),
  startedAt: z.number().int().positive(),
  elapsedSec: z.number().int().min(1).max(48 * 3600),
  movingSec: z.number().int().min(0).max(48 * 3600),
  distM: z.number().min(0).max(2_000_000),
  elevGainM: z.number().min(0).max(20000),
  maxSpeed: z.number().min(0).max(100),
  effort: z.number().int().min(1).max(10).optional(),
  route: z.object({ pts: z.array(z.tuple([z.number(), z.number(), z.number().nullable(), z.number(), z.number()])).max(5000), breaks: z.array(z.number().int()).max(5000) }),
  splits: z.array(z.object({ sec: z.number().int(), elev: z.number() })).max(2000),
  photoUrl: z.string().nullish(),
  share: Share,
});

/** Saves an activity recorded live in the app (/record). */
export async function saveRecorded(input: z.input<typeof Recorded>) {
  const user = await requireUserApi();
  const d = Recorded.parse(input);
  const startAt = new Date(d.startedAt);
  if (startAt.getTime() > Date.now() + 60_000) throw new Error("BAD_START");
  const moving = d.movingSec || d.elapsedSec;
  const sport = sportOf(d.type);
  const a = await db.activity.create({
    data: {
      userId: user.id, source: "violi", type: d.type, name: d.name, description: d.description || null, startAt, date: toDay(startAt),
      durationSec: moving, elapsedSec: d.elapsedSec, distanceM: sport.gps && d.distM > 0 ? d.distM : null, elevationM: sport.gps ? d.elevGainM : null,
      maxSpeed: d.maxSpeed || null, effort: d.effort ?? null, kcal: estimateKcal(d.type, moving, (await latestWeight(user.id)) ?? 75),
      route: d.route.pts.length > 1 ? d.route : undefined, splits: d.splits.length ? d.splits : undefined, photoUrl: ownPhoto(d.photoUrl),
    },
  });
  await afterSave(user, a, d.share);
  return a.id;
}

const Edit = z.object({
  id: z.string(),
  type: z.enum(WORKOUT_TYPES).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  effort: z.number().int().min(1).max(10).nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export async function updateWorkout(input: z.input<typeof Edit>) {
  const user = await requireUserApi();
  const d = Edit.parse(input);
  const a = await db.activity.findFirst({ where: { id: d.id, userId: user.id } });
  if (!a) throw new Error("NOT_FOUND");
  await db.activity.update({
    where: { id: a.id },
    data: {
      // Strava-imported activities keep their sport and title from Strava.
      ...(a.source !== "strava" && d.type ? { type: d.type } : {}),
      ...(a.source !== "strava" && d.name ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.effort !== undefined ? { effort: d.effort } : {}),
      ...(d.photoUrl !== undefined ? { photoUrl: ownPhoto(d.photoUrl) } : {}),
    },
  });
  revalidatePath("/", "layout");
}

async function afterSave(user: { id: string; defaultVisibility: string; shareWorkouts: boolean }, a: Activity, share: z.infer<typeof Share>) {
  await awardXp(user.id, "workout", a.id, workoutXp(a.durationSec, a.kcal), a.date);
  await checkWorkoutAchievements(user.id);
  if (share && user.shareWorkouts) await createWorkoutPost(user, a, share);
  revalidatePath("/", "layout");
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
  const { count } = await db.activity.deleteMany({ where: { id, userId: user.id } });
  if (count) {
    // Its feed posts and the XP it earned go with it.
    await db.post.deleteMany({ where: { userId: user.id, type: "workout", refId: id } });
    await revokeXp(user.id, "workout", id);
  }
  revalidatePath("/", "layout");
}

export async function syncStrava() {
  const user = await requireUserApi();
  const n = await stravaSync(user.id);
  revalidatePath("/", "layout");
  return n;
}
