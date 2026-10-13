import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { garminExchange } from "@/lib/integrations/garmin";

export async function GET(req: NextRequest) {
  const user = await getUser();
  const sp = req.nextUrl.searchParams;
  const state = sp.get("state") ?? "";
  const code = sp.get("code");
  const saved = await db.oAuthState.findUnique({ where: { state } });
  if (saved) await db.oAuthState.delete({ where: { state } });
  if (!user || !saved || saved.userId !== user.id || saved.provider !== "garmin" || !code || !saved.codeVerifier) {
    return NextResponse.redirect(new URL("/settings?error=garmin", req.url));
  }
  try {
    await garminExchange(user.id, code, saved.codeVerifier);
  } catch {
    return NextResponse.redirect(new URL("/settings?error=garmin", req.url));
  }
  return NextResponse.redirect(new URL("/settings?connected=garmin", req.url));
}
