"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { awardCapped, awardXp, unlock, XP } from "@/lib/gamification";
import { trendSeries } from "@/lib/nutrition";
import { addDays, today } from "@/lib/dates";

const Visibility = z.enum(["public", "friends", "private"]);

/** Only accept images this app stored (see /api/uploads). */
const ownPhoto = (url?: string | null) => (url && /^\/api\/files\/[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(url) ? url : null);

async function afterPost(userId: string, postId: string) {
  await awardCapped(userId, "post", postId, XP.post, XP.postDailyCap);
  await unlock(userId, "first_post");
  revalidatePath("/social");
}

export async function createTextPost(input: { text?: string; visibility?: string; photoUrl?: string | null }) {
  const user = await requireUserApi();
  const text = z.string().trim().max(1000).parse(input.text ?? "");
  const visibility = Visibility.parse(input.visibility ?? user.defaultVisibility);
  const photoUrl = ownPhoto(input.photoUrl);
  if (!text && !photoUrl) return;
  const post = await db.post.create({ data: { userId: user.id, type: "text", text: text || null, photoUrl, visibility, payload: {} } });
  await afterPost(user.id, post.id);
}

export async function shareMeal(input: { date: string; meal: string; text?: string; visibility?: string; photoUrl?: string | null }) {
  const user = await requireUserApi();
  if (!user.shareMeals) throw new Error("SHARING_DISABLED");
  const logs = await db.foodLog.findMany({ where: { userId: user.id, date: input.date, meal: input.meal }, orderBy: { createdAt: "asc" } });
  if (!logs.length) return;
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") => Math.round(logs.reduce((s, l) => s + l[k], 0));
  const post = await db.post.create({
    data: {
      userId: user.id, type: "meal", text: input.text?.trim().slice(0, 1000) || null,
      photoUrl: ownPhoto(input.photoUrl) ?? logs.find((l) => l.photoUrl)?.photoUrl ?? null,
      visibility: Visibility.parse(input.visibility ?? user.defaultVisibility), refId: `${input.date}:${input.meal}`,
      payload: { meal: input.meal, items: logs.map((l) => ({ name: l.name, grams: l.grams, kcal: Math.round(l.kcal) })), kcal: sum("kcal"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") },
    },
  });
  await afterPost(user.id, post.id);
  return post.id;
}

export async function shareWorkout(input: { activityId: string; text?: string; visibility?: string; photoUrl?: string | null }) {
  const user = await requireUserApi();
  const a = await db.activity.findFirst({ where: { id: input.activityId, userId: user.id } });
  // Strava data may only be displayed to the athlete who owns it (Strava API Agreement).
  if (!a || a.source === "strava") throw new Error("NOT_SHAREABLE");
  const post = await db.post.create({
    data: {
      userId: user.id, type: "workout", text: input.text?.trim().slice(0, 1000) || null, photoUrl: ownPhoto(input.photoUrl),
      visibility: Visibility.parse(input.visibility ?? user.defaultVisibility), refId: a.id,
      payload: { type: a.type, name: a.name, durationSec: a.durationSec, distanceM: a.distanceM, kcal: a.kcal, avgHr: a.avgHr, source: a.source },
    },
  });
  await afterPost(user.id, post.id);
  return post.id;
}

export async function shareProgress(input: { text?: string; visibility?: string; photoUrl?: string | null }) {
  const user = await requireUserApi();
  if (!user.shareWeight) throw new Error("SHARING_DISABLED");
  const weights = await db.weightEntry.findMany({ where: { userId: user.id, date: { gte: addDays(today(), -60) } }, orderBy: { date: "asc" } });
  const s = trendSeries(weights);
  if (s.length < 2) return;
  const monthAgo = s.find((x) => x.date >= addDays(today(), -30)) ?? s[0];
  const post = await db.post.create({
    data: {
      userId: user.id, type: "progress", text: input.text?.trim().slice(0, 1000) || null, photoUrl: ownPhoto(input.photoUrl),
      visibility: Visibility.parse(input.visibility ?? user.defaultVisibility),
      payload: { change30: Math.round((s.at(-1)!.trend - monthAgo.trend) * 10) / 10, goal: user.goalType, streak: user.streak },
    },
  });
  await afterPost(user.id, post.id);
}

export async function deletePost(id: string) {
  const user = await requireUserApi();
  await db.post.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/social");
}

/** W = like, L = dislike. Same reaction again removes it. */
export async function react(postId: string, kind: "W" | "L") {
  const user = await requireUserApi();
  const k = z.enum(["W", "L"]).parse(kind);
  const post = await db.post.findUnique({ where: { id: postId }, select: { userId: true } });
  if (!post) return;
  const key = { postId_userId: { postId, userId: user.id } };
  const existing = await db.reaction.findUnique({ where: key });
  if (existing?.kind === k) {
    await db.reaction.delete({ where: key });
  } else {
    await db.reaction.upsert({ where: key, create: { postId, userId: user.id, kind: k }, update: { kind: k } });
    if (post.userId !== user.id) {
      await db.notification.create({ data: { userId: post.userId, actorId: user.id, type: k, postId } });
      if (k === "W") {
        await awardXp(post.userId, "w", `${postId}:${user.id}`, XP.wReceived);
        const ws = await db.reaction.count({ where: { kind: "W", post: { userId: post.userId }, NOT: { userId: post.userId } } });
        if (ws >= 10) await unlock(post.userId, "w_10");
      }
    }
  }
}

export async function addComment(postId: string, text: string) {
  const user = await requireUserApi();
  const body = z.string().trim().min(1).max(500).parse(text);
  const post = await db.post.findUnique({ where: { id: postId }, select: { userId: true } });
  if (!post) return;
  const c = await db.comment.create({ data: { postId, userId: user.id, text: body }, include: { user: { select: { name: true, username: true, avatarColor: true, avatarUrl: true } } } });
  if (post.userId !== user.id) await db.notification.create({ data: { userId: post.userId, actorId: user.id, type: "comment", postId, text: body.slice(0, 120) } });
  return { id: c.id, text: c.text, createdAt: c.createdAt.toISOString(), user: c.user, mine: true };
}

export async function deleteComment(id: string) {
  const user = await requireUserApi();
  await db.comment.deleteMany({ where: { id, OR: [{ userId: user.id }, { post: { userId: user.id } }] } });
}

export async function toggleFollow(targetId: string) {
  const user = await requireUserApi();
  if (targetId === user.id) return;
  const key = { followerId_followingId: { followerId: user.id, followingId: targetId } };
  const exists = await db.follow.findUnique({ where: key });
  if (exists) {
    await db.follow.delete({ where: key });
  } else {
    await db.follow.create({ data: { followerId: user.id, followingId: targetId } });
    await db.notification.create({ data: { userId: targetId, actorId: user.id, type: "follow" } });
  }
  revalidatePath("/social");
  return !exists;
}

export async function markNotificationsRead() {
  const user = await requireUserApi();
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
}
