import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stravaAuthorizeUrl, stravaConfigured } from "@/lib/integrations/strava";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!stravaConfigured()) return NextResponse.redirect(new URL("/settings?error=strava_not_configured", req.url));
  const state = randomBytes(16).toString("hex");
  await db.oAuthState.create({ data: { state, userId: user.id, provider: "strava" } });
  return NextResponse.redirect(stravaAuthorizeUrl(state));
}
