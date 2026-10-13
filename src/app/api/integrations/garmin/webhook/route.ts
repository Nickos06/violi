import { NextResponse } from "next/server";
import { garminWebhook } from "@/lib/integrations/garmin";

// Configure this URL as the push/ping endpoint for Activities and Dailies in the Garmin developer portal.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body && typeof body === "object") {
    garminWebhook(body as Record<string, unknown>).catch((e) => console.error("garmin webhook", e));
  }
  return NextResponse.json({ ok: true });
}
