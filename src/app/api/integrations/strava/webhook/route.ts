import { NextResponse, type NextRequest } from "next/server";
import { stravaWebhookEvent } from "@/lib/integrations/strava";

// Subscription validation: https://developers.strava.com/docs/webhooks/
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === (process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "violi-strava")) {
    return NextResponse.json({ "hub.challenge": sp.get("hub.challenge") });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  if (event?.object_type) {
    // Respond fast (Strava expects < 2s); process without blocking the response.
    stravaWebhookEvent(event).catch((e) => console.error("strava webhook", e));
  }
  return NextResponse.json({ ok: true });
}
