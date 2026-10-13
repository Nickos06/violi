import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Activity } from "@prisma/client";
import { db } from "./db";
import { awardCapped, unlock, XP } from "./gamification";
import { asRoute, simplify, trimEnds } from "./route";

export const Visibility = z.enum(["public", "friends", "private"]);

/** Only accept images this app stored (see /api/uploads). */
export const ownPhoto = (url?: string | null) => (url && /^\/api\/files\/[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(url) ? url : null);

export async function afterPost(userId: string, postId: string) {
  await awardCapped(userId, "post", postId, XP.post, XP.postDailyCap);
  await unlock(userId, "first_post");
  revalidatePath("/social");
}

/**
 * Feed post for an activity. Strava data is never shareable (Strava API Agreement). The map is optional and,
 * like Strava's privacy controls, never shows the first and last 200 m, so a start at home stays private.
 */
export async function createWorkoutPost(
  user: { id: string; defaultVisibility: string },
  a: Activity,
  opts: { text?: string; visibility?: string; photoUrl?: string | null; showMap?: boolean },
) {
  if (a.source === "strava") throw new Error("NOT_SHAREABLE");
  const route = opts.showMap !== false ? asRoute(a.route) : null;
  const shared = route ? simplify(trimEnds(route), 160) : null;
  const post = await db.post.create({
    data: {
      userId: user.id, type: "workout", text: opts.text?.trim().slice(0, 1000) || null, photoUrl: ownPhoto(opts.photoUrl ?? a.photoUrl),
      visibility: Visibility.parse(opts.visibility ?? user.defaultVisibility), refId: a.id,
      payload: {
        type: a.type, name: a.name, durationSec: a.durationSec, distanceM: a.distanceM, kcal: a.kcal, avgHr: a.avgHr, source: a.source,
        elevationM: a.elevationM, effort: a.effort,
        route: shared && shared.pts.length > 1 ? { pts: shared.pts.map((p) => [p[0], p[1], null, 0, 0]), breaks: shared.breaks } : null,
      },
    },
  });
  await afterPost(user.id, post.id);
  return post.id;
}
