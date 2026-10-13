"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { isValidDay } from "@/lib/dates";
import { persistFood, type FoodItem } from "@/lib/foods";
import { addMicros, asMicros, scaleMicros, type Micros } from "@/lib/nutrients";
import { MEAL_ICONS } from "@/lib/meal-icons";

const r1 = (n: number) => Math.round(n * 10) / 10;

type Ingredient = { foodId: string | null; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; micros: Micros };

/** Writes the meal's composite per-100 g Food and its ingredient snapshot. */
async function writeMeal(userId: string, input: { id?: string; name: string; icon: string; totalGrams?: number; portionG?: number; ingredients: Ingredient[] }) {
  const rawTotal = input.ingredients.reduce((s, i) => s + i.grams, 0);
  const totalGrams = input.totalGrams && input.totalGrams > 0 ? input.totalGrams : rawTotal;
  const portionG = input.portionG && input.portionG > 0 ? input.portionG : Math.min(totalGrams, 400);
  const sum = input.ingredients.reduce(
    (s, i) => ({
      kcal: s.kcal + i.kcal, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat,
      fiber: s.fiber + i.fiber, sugar: s.sugar + i.sugar, micros: addMicros(s.micros, i.micros),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, micros: {} as Micros },
  );
  const per100 = 100 / totalGrams;
  const food = {
    name: input.name, source: "meal", createdById: userId, servingG: portionG, servingLabel: null,
    kcal: r1(sum.kcal * per100), protein: r1(sum.protein * per100), carbs: r1(sum.carbs * per100), fat: r1(sum.fat * per100),
    fiber: r1(sum.fiber * per100), sugar: r1(sum.sugar * per100), micros: scaleMicros(sum.micros, per100),
  };
  const items = input.ingredients.map((i, position) => ({ ...i, position }));

  if (input.id) {
    const existing = await db.savedMeal.findFirst({ where: { id: input.id, userId } });
    if (!existing) throw new Error("NOT_FOUND");
    await db.food.update({ where: { id: existing.foodId }, data: food });
    await db.savedMealItem.deleteMany({ where: { mealId: existing.id } });
    await db.savedMeal.update({
      where: { id: existing.id },
      data: { name: input.name, icon: input.icon, totalGrams, portionG, items: { create: items } },
    });
    return existing.id;
  }
  const f = await db.food.create({ data: food });
  const meal = await db.savedMeal.create({
    data: { userId, name: input.name, icon: input.icon, foodId: f.id, totalGrams, portionG, items: { create: items } },
  });
  return meal.id;
}

const Base = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  icon: z.enum(MEAL_ICONS),
  totalGrams: z.number().min(0).max(20000).optional(),
  portionG: z.number().min(0).max(5000).optional(),
});

/** Save from the builder: ingredients are foods (per 100 g) with grams. */
export async function saveMeal(input: z.input<typeof Base> & { ingredients: { item: FoodItem; grams: number }[] }) {
  const user = await requireUserApi();
  const d = Base.parse(input);
  const list = z.array(z.object({ grams: z.number().positive().max(10000) })).min(1).max(40).parse(input.ingredients);
  const ingredients: Ingredient[] = [];
  for (let i = 0; i < input.ingredients.length; i++) {
    const { item } = input.ingredients[i];
    const grams = list[i].grams;
    const f = grams / 100;
    ingredients.push({
      foodId: await persistFood(item, user.id), name: item.brand ? `${item.name} · ${item.brand}` : item.name, grams,
      kcal: r1(item.kcal * f), protein: r1(item.protein * f), carbs: r1(item.carbs * f), fat: r1(item.fat * f),
      fiber: r1(item.fiber * f), sugar: r1(item.sugar * f), micros: scaleMicros(asMicros(item.micros), f),
    });
  }
  const id = await writeMeal(user.id, { ...d, ingredients });
  revalidatePath("/meals");
  return id;
}

/** Turn what was logged in a meal slot into a reusable meal. */
export async function saveMealFromLogs(input: { date: string; meal: string; name: string; icon?: string }) {
  const user = await requireUserApi();
  if (!isValidDay(input.date)) throw new Error("BAD_DATE");
  const name = z.string().trim().min(1).max(80).parse(input.name);
  const icon = z.enum(MEAL_ICONS).catch("utensils").parse(input.icon ?? "utensils");
  const logs = await db.foodLog.findMany({ where: { userId: user.id, date: input.date, meal: input.meal, grams: { gt: 0 } }, orderBy: { createdAt: "asc" } });
  if (!logs.length) throw new Error("EMPTY");
  const id = await writeMeal(user.id, {
    name, icon,
    ingredients: logs.map((l) => ({
      foodId: l.foodId, name: l.name, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat,
      fiber: l.fiber, sugar: l.sugar, micros: asMicros(l.micros),
    })),
  });
  revalidatePath("/meals");
  return id;
}

export async function deleteSavedMeal(id: string) {
  const user = await requireUserApi();
  const meal = await db.savedMeal.findFirst({ where: { id, userId: user.id } });
  if (!meal) return;
  // Deleting the composite food cascades to the meal; past logs keep their values (foodId → null).
  await db.food.delete({ where: { id: meal.foodId } });
  revalidatePath("/meals");
}
