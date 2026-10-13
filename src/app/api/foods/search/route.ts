import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { searchLocal, searchOff, searchUsda } from "@/lib/foods";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ items: [] });
  if (req.nextUrl.searchParams.get("online") === "1") {
    const [off, usda] = await Promise.all([searchOff(q), searchUsda(q)]);
    return NextResponse.json({ items: [...off, ...usda] });
  }
  return NextResponse.json({ items: await searchLocal(q, user.id, user.locale) });
}
