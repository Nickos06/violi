import "server-only";
import { db } from "../db";
import { toDay } from "../dates";
import { checkWorkoutAchievements, unlock } from "../gamification";

// Strava API v3. Per the Strava API Agreement, a user's Strava data may only be shown to that user:
// Strava activities feed the owner's energy balance but never appear in the feed, leaderboards or XP.

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API = "https://www.strava.com/api/v3";

export const stravaConfigured = () => !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
const appUrl = () => process.env.APP_URL || "http://localhost:3000";

export function stravaAuthorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${appUrl()}/api/integrations/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } };

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, ...body }),
  });
  if (!res.ok) throw new Error(`Strava token error ${res.status}`);
  return (await res.json()) as TokenResponse;
}

export async function stravaExchange(userId: string, code: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete) throw new Error("Strava: missing athlete");
  await db.integration.deleteMany({ where: { provider: "strava", externalUserId: String(t.athlete.id), NOT: { userId } } });
  await db.integration.upsert({
    where: { userId_provider: { userId, provider: "strava" } },
    create: { userId, provider: "strava", externalUserId: String(t.athlete.id), accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(t.expires_at * 1000) },
    update: { externalUserId: String(t.athlete.id), accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(t.expires_at * 1000) },
  });
  await unlock(userId, "connected");
}

async function accessToken(userId: string) {
  const integ = await db.integration.findUnique({ where: { userId_provider: { userId, provider: "strava" } } });
  if (!integ) throw new Error("Strava not connected");
  if (integ.expiresAt && integ.expiresAt.getTime() - Date.now() > 60_000) return integ.accessToken;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: integ.refreshToken ?? "" });
  await db.integration.update({
    where: { id: integ.id },
    data: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(t.expires_at * 1000) },
  });
  return t.access_token;
}

type StravaActivity = {
  id: number; name: string; sport_type?: string; type?: string; start_date: string; moving_time: number; elapsed_time: number;
  distance?: number; calories?: number; kilojoules?: number; average_heartrate?: number; total_elevation_gain?: number;
};

const TYPE_MAP: Record<string, string> = {
  Run: "run", TrailRun: "run", VirtualRun: "run", Ride: "ride", VirtualRide: "ride", MountainBikeRide: "ride", GravelRide: "ride", EBikeRide: "ride",
  Swim: "swim", Walk: "walk", Hike: "hike", WeightTraining: "strength", Crossfit: "hiit", HighIntensityIntervalTraining: "hiit",
  Yoga: "yoga", Soccer: "football", Basketball: "basketball", Tennis: "tennis",
};

function kcalOf(a: StravaActivity) {
  if (a.calories && a.calories > 0) return a.calories;
  if (a.kilojoules && a.kilojoules > 0) return a.kilojoules; // cycling: kJ of work ≈ kcal burned (≈24% efficiency)
  return 0;
}

async function upsertActivity(userId: string, a: StravaActivity) {
  const type = TYPE_MAP[a.sport_type ?? a.type ?? ""] ?? "other";
  const startAt = new Date(a.start_date);
  const data = {
    userId, source: "strava", externalId: String(a.id), type, name: a.name, startAt, date: toDay(startAt),
    durationSec: a.moving_time || a.elapsed_time, distanceM: a.distance ?? null, kcal: Math.round(kcalOf(a)),
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null, elevationM: a.total_elevation_gain ?? null,
  };
  await db.activity.upsert({ where: { source_externalId: { source: "strava", externalId: String(a.id) } }, create: data, update: data });
}

async function fetchDetailed(token: string, id: number | string) {
  const res = await fetch(`${API}/activities/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json()) as StravaActivity;
}

/** Pulls recent activities. Detailed requests (for calories) are limited to stay within Strava rate limits. */
export async function stravaSync(userId: string, days = 30) {
  const token = await accessToken(userId);
  const after = Math.floor(Date.now() / 1000) - days * 86400;
  const res = await fetch(`${API}/athlete/activities?after=${after}&per_page=60`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Strava activities error ${res.status}`);
  const list = (await res.json()) as StravaActivity[];
  const known = new Set(
    (await db.activity.findMany({ where: { userId, source: "strava", kcal: { gt: 0 } }, select: { externalId: true } })).map((a) => a.externalId),
  );
  let detailed = 0;
  for (const a of list) {
    if (!known.has(String(a.id)) && detailed < 20) {
      const d = await fetchDetailed(token, a.id);
      detailed++;
      await upsertActivity(userId, d ?? a);
    } else if (!known.has(String(a.id))) {
      await upsertActivity(userId, a);
    }
  }
  await db.integration.update({ where: { userId_provider: { userId, provider: "strava" } }, data: { lastSyncAt: new Date() } });
  await checkWorkoutAchievements(userId);
  return list.length;
}

/** Webhook event: https://developers.strava.com/docs/webhooks/ */
export async function stravaWebhookEvent(e: { object_type: string; aspect_type: string; object_id: number; owner_id: number; updates?: Record<string, string> }) {
  const integ = await db.integration.findUnique({ where: { provider_externalUserId: { provider: "strava", externalUserId: String(e.owner_id) } } });
  if (!integ) return;
  if (e.object_type === "athlete" && e.updates?.authorized === "false") {
    await db.integration.delete({ where: { id: integ.id } });
    await db.activity.deleteMany({ where: { userId: integ.userId, source: "strava" } });
    return;
  }
  if (e.object_type !== "activity") return;
  if (e.aspect_type === "delete") {
    await db.activity.deleteMany({ where: { source: "strava", externalId: String(e.object_id) } });
    return;
  }
  const token = await accessToken(integ.userId);
  const a = await fetchDetailed(token, e.object_id);
  if (a) {
    await upsertActivity(integ.userId, a);
    await checkWorkoutAchievements(integ.userId);
  }
}

export async function stravaDisconnect(userId: string) {
  const integ = await db.integration.findUnique({ where: { userId_provider: { userId, provider: "strava" } } });
  if (!integ) return;
  try {
    await fetch(`https://www.strava.com/oauth/deauthorize`, { method: "POST", headers: { Authorization: `Bearer ${integ.accessToken}` } });
  } catch {}
  await db.integration.delete({ where: { id: integ.id } });
  await db.activity.deleteMany({ where: { userId, source: "strava" } });
}
