import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { bestsFor, previousFor } from "@/lib/gym-server";

/** Previous-session sets and all-time bests for the exercises in a live workout. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 60);
  const [previous, bests] = await Promise.all([previousFor(user.id, ids), bestsFor(user.id, ids)]);
  return NextResponse.json({ previous, bests });
}
