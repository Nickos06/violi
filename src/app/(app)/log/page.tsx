import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { db } from "@/lib/db";
import { hourNow, isValidDay, today } from "@/lib/dates";
import { fromDb } from "@/lib/foods";
import { LogClient } from "./log-client";

export const metadata = { title: "Log" };

function mealByTime() {
  const h = hourNow();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export default async function LogPage({ searchParams }: { searchParams: Promise<{ meal?: string; d?: string; tab?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const meal = ["breakfast", "lunch", "dinner", "snack"].includes(sp.meal ?? "") ? sp.meal! : mealByTime();
  const date = isValidDay(sp.d) ? sp.d : today();
  const tab = ["search", "meals", "scan", "describe", "barcode", "quick"].includes(sp.tab ?? "") ? sp.tab! : "search";
  const meals = await db.savedMeal.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { food: true, _count: { select: { items: true } } },
  });
  return (
    <LogClient
      initialMeal={meal}
      date={date}
      ai={aiEnabled()}
      initialTab={tab}
      savedMeals={meals.map((m) => ({
        id: m.id, name: m.name, icon: m.icon, items: m._count.items, totalGrams: m.totalGrams, portionG: m.portionG, food: fromDb(m.food, user.locale),
      }))}
    />
  );
}
