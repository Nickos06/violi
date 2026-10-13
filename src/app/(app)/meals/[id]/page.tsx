import { notFound } from "next/navigation";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fromDb, type FoodItem } from "@/lib/foods";
import { asMicros, scaleMicros } from "@/lib/nutrients";
import { MEAL_ICONS, type MealIconKey } from "@/lib/meal-icons";
import { PageHeader } from "@/components/ui";
import { MealBuilder } from "../meal-builder";

export const metadata = { title: "Edit meal" };

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const meal = await db.savedMeal.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!meal) notFound();
  const foods = await db.food.findMany({ where: { id: { in: meal.items.map((i) => i.foodId).filter((x): x is string => !!x) } } });
  const byId = new Map(foods.map((f) => [f.id, f]));

  const ingredients = meal.items.map((i) => {
    const food = i.foodId ? byId.get(i.foodId) : undefined;
    // Fall back to the snapshot (converted to per 100 g) when the original food no longer exists.
    const per100 = 100 / i.grams;
    const item: FoodItem = food
      ? fromDb(food, user.locale)
      : {
          key: `snap:${i.id}`, name: i.name, source: "custom", servingG: i.grams, kcal: i.kcal * per100, protein: i.protein * per100,
          carbs: i.carbs * per100, fat: i.fat * per100, fiber: i.fiber * per100, sugar: i.sugar * per100, micros: scaleMicros(asMicros(i.micros), per100),
        };
    return { key: i.id, item: { ...item, name: i.name }, grams: i.grams };
  });

  return (
    <div className="animate-rise">
      <PageHeader back="/meals" title={t.saved.edit} />
      <MealBuilder
        initial={{
          id: meal.id, name: meal.name, icon: (MEAL_ICONS as readonly string[]).includes(meal.icon) ? (meal.icon as MealIconKey) : "utensils",
          totalGrams: meal.totalGrams, portionG: meal.portionG, ingredients, rawTotal: meal.items.reduce((s, i) => s + i.grams, 0),
        }}
      />
    </div>
  );
}
