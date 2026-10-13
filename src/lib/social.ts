import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { addDays, today, weekStart } from "./dates";
import { levelFromXp } from "./levels";
import { liveStreak } from "./gamification";

export type PostView = {
  id: string; type: string; text: string | null; photoUrl: string | null; visibility: string; payload: Record<string, unknown>;
  createdAt: string; mine: boolean;
  author: { id: string; name: string; username: string; avatarColor: string; avatarUrl: string | null; level: number };
  w: number; l: number; myReaction: "W" | "L" | null; commentCount: number;
  comments: { id: string; text: string; createdAt: string; mine: boolean; user: { name: string; username: string; avatarColor: string; avatarUrl: string | null } }[];
};

export async function relationSets(userId: string) {
  const [following, followers] = await Promise.all([
    db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    db.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
  ]);
  const followingSet = new Set(following.map((f) => f.followingId));
  const followerSet = new Set(followers.map((f) => f.followerId));
  const mutual = new Set([...followingSet].filter((id) => followerSet.has(id)));
  return { following: followingSet, followers: followerSet, mutual };
}

/** Whether `viewerId` may see a post given the author's privacy settings. */
export function canSee(viewerId: string, post: { userId: string; visibility: string }, author: { profilePublic: boolean }, mutual: Set<string>) {
  if (post.userId === viewerId) return true;
  const isFriend = mutual.has(post.userId);
  if (!author.profilePublic && !isFriend) return false;
  if (post.visibility === "public") return true;
  if (post.visibility === "friends") return isFriend;
  return false;
}

const postInclude = (viewerId: string) => ({
  user: { select: { id: true, name: true, username: true, avatarColor: true, avatarUrl: true, xp: true, profilePublic: true } },
  reactions: { select: { userId: true, kind: true } },
  comments: { orderBy: { createdAt: "asc" as const }, take: 50, include: { user: { select: { id: true, name: true, username: true, avatarColor: true, avatarUrl: true } } } },
  _count: { select: { comments: true } },
}) satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

function toView(p: PostRow, viewerId: string): PostView {
  return {
    id: p.id, type: p.type, text: p.text, photoUrl: p.photoUrl, visibility: p.visibility, payload: (p.payload ?? {}) as Record<string, unknown>,
    createdAt: p.createdAt.toISOString(), mine: p.userId === viewerId,
    author: { id: p.user.id, name: p.user.name, username: p.user.username, avatarColor: p.user.avatarColor, avatarUrl: p.user.avatarUrl, level: levelFromXp(p.user.xp).level },
    w: p.reactions.filter((r) => r.kind === "W").length,
    l: p.reactions.filter((r) => r.kind === "L").length,
    myReaction: (p.reactions.find((r) => r.userId === viewerId)?.kind as "W" | "L" | undefined) ?? null,
    commentCount: p._count.comments,
    comments: p.comments.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt.toISOString(), mine: c.userId === viewerId, user: c.user })),
  };
}

export async function feed(viewerId: string, mode: "following" | "discover", cursor?: string) {
  const rel = await relationSets(viewerId);
  const where: Prisma.PostWhereInput =
    mode === "following"
      ? { userId: { in: [viewerId, ...rel.following] } }
      : { visibility: "public", user: { profilePublic: true }, NOT: { userId: viewerId } };
  const rows = await db.post.findMany({
    where: { ...where, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: postInclude(viewerId),
  });
  return rows.filter((p) => canSee(viewerId, p, p.user, rel.mutual)).slice(0, 25).map((p) => toView(p, viewerId));
}

export async function userPosts(viewerId: string, authorId: string) {
  const rel = await relationSets(viewerId);
  const rows = await db.post.findMany({ where: { userId: authorId }, orderBy: { createdAt: "desc" }, take: 30, include: postInclude(viewerId) });
  return rows.filter((p) => canSee(viewerId, p, p.user, rel.mutual)).map((p) => toView(p, viewerId));
}

export type BoardRow = { id: string; name: string; username: string; avatarColor: string; avatarUrl: string | null; level: number; value: number; me: boolean };

export async function leaderboard(viewerId: string, scope: "friends" | "global", metric: "week" | "xp" | "streak" | "minutes"): Promise<BoardRow[]> {
  const rel = await relationSets(viewerId);
  const users = await db.user.findMany({
    where: scope === "friends" ? { id: { in: [viewerId, ...rel.following] } } : { OR: [{ profilePublic: true }, { id: viewerId }], onboarded: true },
    select: { id: true, name: true, username: true, avatarColor: true, avatarUrl: true, xp: true, streak: true, lastLogDate: true },
    take: 500,
  });
  const ids = users.map((u) => u.id);
  let values: Record<string, number> = {};
  if (metric === "week") {
    const rows = await db.xpEvent.groupBy({ by: ["userId"], where: { userId: { in: ids }, date: { gte: weekStart(today()) } }, _sum: { amount: true } });
    values = Object.fromEntries(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
  } else if (metric === "minutes") {
    // Strava activities are excluded: Strava data may not be shown to other users.
    const rows = await db.activity.groupBy({
      by: ["userId"], where: { userId: { in: ids }, date: { gte: weekStart(today()) }, NOT: { source: "strava" } }, _sum: { durationSec: true },
    });
    values = Object.fromEntries(rows.map((r) => [r.userId, Math.round((r._sum.durationSec ?? 0) / 60)]));
  }
  return users
    .map((u) => ({
      id: u.id, name: u.name, username: u.username, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl, level: levelFromXp(u.xp).level, me: u.id === viewerId,
      value: metric === "xp" ? u.xp : metric === "streak" ? liveStreak(u) : values[u.id] ?? 0,
    }))
    .sort((a, b) => b.value - a.value || b.level - a.level)
    .slice(0, 50);
}

export async function searchUsers(viewerId: string, q: string) {
  const n = q.trim().toLowerCase();
  if (n.length < 2) {
    // Suggestions: active public users the viewer doesn't follow yet.
    const rel = await relationSets(viewerId);
    return db.user.findMany({
      where: { profilePublic: true, onboarded: true, id: { notIn: [viewerId, ...rel.following] }, lastLogDate: { gte: addDays(today(), -14) } },
      select: { id: true, name: true, username: true, avatarColor: true, avatarUrl: true, xp: true },
      orderBy: { xp: "desc" },
      take: 10,
    });
  }
  return db.user.findMany({
    where: { NOT: { id: viewerId }, OR: [{ username: { contains: n } }, { name: { contains: q.trim() } }] },
    select: { id: true, name: true, username: true, avatarColor: true, avatarUrl: true, xp: true },
    take: 20,
  });
}
