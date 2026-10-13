import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { aiEnabled, estimateMeal } from "@/lib/ai";
import { saveImage } from "@/lib/uploads";

export const maxDuration = 60;

const Body = z.object({
  image: z.string().max(11_000_000).optional(),
  mediaType: z.string().optional(),
  text: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success || (!parsed.data.image && !parsed.data.text)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { image, mediaType, text } = parsed.data;

  let photoUrl: string | null = null;
  if (image) {
    try {
      photoUrl = await saveImage(Buffer.from(image, "base64"), mediaType ?? "image/jpeg");
    } catch {
      return NextResponse.json({ error: "bad_image" }, { status: 400 });
    }
  }
  try {
    const estimate = await estimateMeal({ imageBase64: image, mediaType, text, locale: user.locale });
    return NextResponse.json({ estimate, photoUrl });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "ai_auth" }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: "ai_error" }, { status: 502 });
    console.error(e);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }
}
