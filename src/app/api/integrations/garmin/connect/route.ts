import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { garminAuthorizeUrl, garminConfigured, pkcePair } from "@/lib/integrations/garmin";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!garminConfigured()) return NextResponse.redirect(new URL("/settings?error=garmin_not_configured", req.url));
  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = pkcePair();
  await db.oAuthState.create({ data: { state, userId: user.id, provider: "garmin", codeVerifier: verifier } });
  return NextResponse.redirect(garminAuthorizeUrl(state, challenge));
}
