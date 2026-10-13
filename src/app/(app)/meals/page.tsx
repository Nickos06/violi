import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { MealIconKey } from "@/lib/meal-icons";
import { SAVED_MEAL_ICON } from "@/components/icons";
import { Card, Empty, fmt, IconTile, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Meals" };

export default async function MealsPage() {
  const user = await requireUser();
  const { t } = await getT();
  const meals = await db.savedMeal.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { food: true, items: { orderBy: { position: "asc" }, select: { name: true } } },
  });
  return (
    <div className="animate-rise">
      <PageHeader
        title={t.saved.title}
        subtitle={t.saved.subtitle}
        action={<LinkButton href="/meals/new" size="sm"><Plus className="size-4" strokeWidth={2.6} /> {t.saved.new}</LinkButton>}
      />
      {meals.length === 0 ? (
        <Card>
          <Empty icon={<ChefHat className="size-6" />} title={t.saved.none}>
            <LinkButton href="/meals/new" className="mt-2"><Plus className="size-4" strokeWidth={2.6} /> {t.saved.new}</LinkButton>
          </Empty>
        </Card>
      ) : (
        <div className="stagger space-y-3">
          {meals.map((m) => {
            const Icon = SAVED_MEAL_ICON[m.icon as MealIconKey] ?? ChefHat;
            const portion = m.portionG / 100;
            return (
              <Link key={m.id} href={`/meals/${m.id}`} className="card press flex items-center gap-4 p-4">
                <IconTile size={48}><Icon className="size-[22px]" strokeWidth={2.1} /></IconTile>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15.5px] font-bold">{m.name}</div>
                  <div className="truncate text-[12.5px] font-semibold text-faint">{m.items.map((i) => i.name).join(" · ")}</div>
                  <div className="tabular mt-1.5 flex gap-2.5 text-[12px] font-bold">
                    <span>{fmt(m.food.kcal * portion)} kcal</span>
                    <span style={{ color: "var(--protein)" }}>P {fmt(m.food.protein * portion)}</span>
                    <span style={{ color: "var(--carbs)" }}>C {fmt(m.food.carbs * portion)}</span>
                    <span style={{ color: "var(--fat)" }}>F {fmt(m.food.fat * portion)}</span>
                    <span className="text-faint">/ {fmt(m.portionG)} g</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
