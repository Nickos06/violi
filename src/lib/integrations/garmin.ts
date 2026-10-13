import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { toDay } from "../dates";
import { awardXp, checkWorkoutAchievements, unlock, workoutXp } from "../gamification";

// Garmin Connect Developer Program (Health + Activity APIs), OAuth 2.0 with PKCE.
// Access requires an approved developer account. Endpoints below follow Garmin's OAuth2 PKCE spec;
// verify them against the docs in the developer portal once approved.

const AUTH_URL = "https://connect.garmin.com/oauth2Confirm";
const TOKEN_URL = process.env.GARMIN_TOKEN_URL || "https://connectapi.garmin.com/di-oauth2-service/oauth/token";
const API = "https://apis.garmin.com";

export const garminConfigured = () => !!(process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET);
const appUrl = () => process.env.APP_URL || "http://localhost:3000";
const redirectUri = () => `${appUrl()}/api/integrations/garmin/callback`;

export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function garminAuthorizeUrl(state: string, challenge: string) {
  const p = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${p}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GARMIN_CLIENT_ID!, client_secret: process.env.GARMIN_CLIENT_SECRET!, ...body }),
  });
  if (!res.ok) throw new Error(`Garmin token error ${res.status}`);
  return (await res.json()) as TokenResponse;
}

export async function garminExchange(userId: string, code: string, verifier: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri() });
  const idRes = await fetch(`${API}/wellness-api/rest/user/id`, { headers: { Authorization: `Bearer ${t.access_token}` } });
  if (!idRes.ok) throw new Error(`Garmin user id error ${idRes.status}`);
  const { userId: garminUserId } = (await idRes.json()) as { userId: string };
  await db.integration.deleteMany({ where: { provider: "garmin", externalUserId: garminUserId, NOT: { userId } } });
  const data = { externalUserId: garminUserId, accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(Date.now() + t.expires_in * 1000) };
  await db.integration.upsert({ where: { userId_provider: { userId, provider: "garmin" } }, create: { userId, provider: "garmin", ...data }, update: data });
  await unlock(userId, "connected");
}

async function tokenFor(integrationId: string) {
  const integ = await db.integration.findUniqueOrThrow({ where: { id: integrationId } });
  if (integ.expiresAt && integ.expiresAt.getTime() - Date.now() > 60_000) return integ.accessToken;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: integ.refreshToken ?? "" });
  await db.integration.update({
    where: { id: integ.id },
    data: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(Date.now() + t.expires_in * 1000) },
  });
  return t.access_token;
}

// --- Webhook payloads (push and ping) ---

type GarminActivity = {
  userId: string; summaryId: string; activityId?: number; activityName?: string; activityType?: string; startTimeInSeconds: number;
  durationInSeconds: number; distanceInMeters?: number; activeKilocalories?: number; averageHeartRateInBeatsPerMinute?: number;
  totalElevationGainInMeters?: number;
};
type GarminDaily = { userId: string; summaryId: string; calendarDate: string; steps?: number; activeKilocalories?: number };

const TYPE_MAP: Record<string, string> = {
  RUNNING: "run", TRAIL_RUNNING: "run", TREADMILL_RUNNING: "run", CYCLING: "ride", ROAD_BIKING: "ride", MOUNTAIN_BIKING: "ride", INDOOR_CYCLING: "ride",
  LAP_SWIMMING: "swim", OPEN_WATER_SWIMMING: "swim", WALKING: "walk", HIKING: "hike", STRENGTH_TRAINING: "strength", HIIT: "hiit",
  YOGA: "yoga", SOCCER: "football", BASKETBALL: "basketball", TENNIS: "tennis",
};

async function userIdFor(garminUserId: string) {
  const integ = await db.integration.findUnique({ where: { provider_externalUserId: { provider: "garmin", externalUserId: garminUserId } } });
  return integ;
}

async function saveActivity(a: GarminActivity) {
  const integ = await userIdFor(a.userId);
  if (!integ) return;
  const startAt = new Date(a.startTimeInSeconds * 1000);
  const externalId = String(a.activityId ?? a.summaryId);
  const data = {
    userId: integ.userId, source: "garmin", externalId, type: TYPE_MAP[a.activityType ?? ""] ?? "other",
    name: a.activityName ?? a.activityType ?? "Garmin", startAt, date: toDay(startAt), durationSec: a.durationInSeconds,
    distanceM: a.distanceInMeters ?? null, kcal: Math.round(a.activeKilocalories ?? 0),
    avgHr: a.averageHeartRateInBeatsPerMinute ?? null, elevationM: a.totalElevationGainInMeters ?? null,
  };
  const act = await db.activity.upsert({ where: { source_externalId: { source: "garmin", externalId } }, create: data, update: data });
  await awardXp(integ.userId, "workout", act.id, workoutXp(act.durationSec, act.kcal), act.date);
  await checkWorkoutAchievements(integ.userId);
  await db.integration.update({ where: { id: integ.id }, data: { lastSyncAt: new Date() } });
}

async function saveDaily(d: GarminDaily) {
  const integ = await userIdFor(d.userId);
  if (!integ) return;
  await db.dailyActivity.upsert({
    where: { userId_date_source: { userId: integ.userId, date: d.calendarDate, source: "garmin" } },
    create: { userId: integ.userId, date: d.calendarDate, source: "garmin", steps: d.steps ?? 0, activeKcal: d.activeKilocalories ?? 0 },
    update: { steps: d.steps ?? 0, activeKcal: d.activeKilocalories ?? 0 },
  });
}

type PingEntry = { userId: string; callbackURL?: string };

async function resolve<T>(entries: (T | PingEntry)[] | undefined): Promise<T[]> {
  const out: T[] = [];
  for (const e of entries ?? []) {
    const ping = e as PingEntry;
    if (ping.callbackURL) {
      const integ = await userIdFor(ping.userId);
      if (!integ || !ping.callbackURL.startsWith(API)) continue;
      const res = await fetch(ping.callbackURL, { headers: { Authorization: `Bearer ${await tokenFor(integ.id)}` } });
      if (res.ok) out.push(...((await res.json()) as T[]));
    } else out.push(e as T);
  }
  return out;
}

export async function garminWebhook(body: Record<string, unknown>) {
  for (const a of await resolve<GarminActivity>(body.activities as GarminActivity[] | undefined)) await saveActivity(a);
  for (const d of await resolve<GarminDaily>(body.dailies as GarminDaily[] | undefined)) await saveDaily(d);
  for (const d of (body.deregistrations as { userId: string }[] | undefined) ?? []) {
    await db.integration.deleteMany({ where: { provider: "garmin", externalUserId: d.userId } });
  }
}

export async function garminDisconnect(userId: string) {
  const integ = await db.integration.findUnique({ where: { userId_provider: { userId, provider: "garmin" } } });
  if (!integ) return;
  try {
    await fetch(`${API}/wellness-api/rest/user/registration`, { method: "DELETE", headers: { Authorization: `Bearer ${await tokenFor(integ.id)}` } });
  } catch {}
  await db.integration.delete({ where: { id: integ.id } });
}
