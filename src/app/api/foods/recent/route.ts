import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fromDb } from "@/lib/foods";

/** Recently logged and favourite foods for the quick-pick list. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [logs, favs] = await Promise.all([
    db.foodLog.findMany({ where: { userId: user.id, foodId: { not: null } }, orderBy: { createdAt: "desc" }, take: 120, include: { food: true } }),
    db.favoriteFood.findMany({ where: { userId: user.id }, include: { food: true } }),
  ]);
  const seen = new Set<string>();
  const recent = [];
  for (const l of logs) {
    if (!l.food || seen.has(l.food.id)) continue;
    seen.add(l.food.id);
    recent.push({ ...fromDb(l.food, user.locale), lastGrams: l.grams });
    if (recent.length >= 20) break;
  }
  return NextResponse.json({ recent, favorites: favs.map((f) => fromDb(f.food, user.locale)), favoriteIds: favs.map((f) => f.foodId) });
}
