import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stravaExchange, stravaSync } from "@/lib/integrations/strava";

export async function GET(req: NextRequest) {
  const user = await getUser();
  const sp = req.nextUrl.searchParams;
  const state = sp.get("state") ?? "";
  const code = sp.get("code");
  const saved = await db.oAuthState.findUnique({ where: { state } });
  if (saved) await db.oAuthState.delete({ where: { state } });
  if (!user || !saved || saved.userId !== user.id || saved.provider !== "strava" || !code || sp.get("error")) {
    return NextResponse.redirect(new URL("/settings?error=strava", req.url));
  }
  try {
    await stravaExchange(user.id, code);
    await stravaSync(user.id).catch(() => 0);
  } catch {
    return NextResponse.redirect(new URL("/settings?error=strava", req.url));
  }
  return NextResponse.redirect(new URL("/settings?connected=strava", req.url));
}
