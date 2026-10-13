import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { hourNow, isValidDay, today } from "@/lib/dates";
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
  await requireUser();
  const sp = await searchParams;
  const meal = ["breakfast", "lunch", "dinner", "snack"].includes(sp.meal ?? "") ? sp.meal! : mealByTime();
  const date = isValidDay(sp.d) ? sp.d : today();
  const tab = ["search", "scan", "describe", "barcode", "quick"].includes(sp.tab ?? "") ? sp.tab! : "search";
  return <LogClient initialMeal={meal} date={date} ai={aiEnabled()} initialTab={tab} />;
}
