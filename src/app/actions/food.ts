"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { isValidDay, today } from "@/lib/dates";
import { persistFood, type FoodItem } from "@/lib/foods";
import { asMicros, scaleMicros, type Micros } from "@/lib/nutrients";
import { awardCapped, touchStreak, unlock, XP } from "@/lib/gamification";

const Meal = z.enum(["breakfast", "lunch", "dinner", "snack"]);
const r1 = (n: number) => Math.round(n * 10) / 10;

async function afterLog(userId: string, logId: string, date: string) {
  await awardCapped(userId, "log", logId, XP.log, XP.logDailyCap);
  await touchStreak(userId, date);
  await unlock(userId, "first_log");
  revalidatePath("/today");
}

export async function logFood(input: { item: FoodItem; grams: number; meal: string; date?: string; source?: string }) {
  const user = await requireUserApi();
  const meal = Meal.parse(input.meal);
  const grams = z.number().positive().max(5000).parse(input.grams);
  const date = isValidDay(input.date) ? input.date : today();
  const item = input.item;
  const foodId = await persistFood(item, user.id);
  const f = grams / 100;
  const log = await db.foodLog.create({
    data: {
      userId: user.id, date, meal, foodId, name: item.brand ? `${item.name} · ${item.brand}` : item.name, grams,
      kcal: r1(item.kcal * f), protein: r1(item.protein * f), carbs: r1(item.carbs * f), fat: r1(item.fat * f),
      fiber: r1(item.fiber * f), sugar: r1(item.sugar * f), micros: scaleMicros(asMicros(item.micros), f),
      source: input.source === "barcode" || input.source === "meal" ? input.source : "search",
    },
  });
  await afterLog(user.id, log.id, date);
  return { id: log.id };
}

const AiItem = z.object({
  name: z.string().min(1).max(120), grams: z.number().positive().max(5000), kcal: z.number().min(0), protein: z.number().min(0),
  carbs: z.number().min(0), fat: z.number().min(0), fiber: z.number().min(0), sugar: z.number().min(0), micros: z.record(z.string(), z.number()),
});

/** Logs AI-estimated items. Values are absolute for the given grams. */
export async function logEstimated(input: { items: z.input<typeof AiItem>[]; meal: string; date?: string; source: "ai_photo" | "ai_text"; photoUrl?: string | null }) {
  const user = await requireUserApi();
  const meal = Meal.parse(input.meal);
  const items = z.array(AiItem).min(1).max(30).parse(input.items);
  const date = isValidDay(input.date) ? input.date : today();
  const photoUrl = input.photoUrl && input.photoUrl.startsWith("/api/files/") ? input.photoUrl : null;
  const ids: string[] = [];
  for (const it of items) {
    const per100 = 100 / it.grams;
    // Save as a reusable "ai" food so it shows in recents and search.
    const food = await db.food.create({
      data: {
        name: it.name, source: "ai", servingG: it.grams, createdById: user.id,
        kcal: r1(it.kcal * per100), protein: r1(it.protein * per100), carbs: r1(it.carbs * per100), fat: r1(it.fat * per100),
        fiber: r1(it.fiber * per100), sugar: r1(it.sugar * per100), micros: scaleMicros(asMicros(it.micros), per100),
      },
    });
    const log = await db.foodLog.create({
      data: {
        userId: user.id, date, meal, foodId: food.id, name: it.name, grams: it.grams, kcal: r1(it.kcal), protein: r1(it.protein),
        carbs: r1(it.carbs), fat: r1(it.fat), fiber: r1(it.fiber), sugar: r1(it.sugar), micros: asMicros(it.micros),
        source: input.source, photoUrl,
      },
    });
    ids.push(log.id);
    await afterLog(user.id, log.id, date);
  }
  if (input.source === "ai_photo") await unlock(user.id, "first_scan");
  return { ids };
}

export async function quickAdd(input: { name: string; kcal: number; protein: number; carbs: number; fat: number; meal: string; date?: string }) {
  const user = await requireUserApi();
  const d = z.object({ name: z.string().trim().min(1).max(120), kcal: z.number().min(0).max(10000), protein: z.number().min(0), carbs: z.number().min(0), fat: z.number().min(0) }).parse(input);
  const meal = Meal.parse(input.meal);
  const date = isValidDay(input.date) ? input.date : today();
  const log = await db.foodLog.create({
    data: { userId: user.id, date, meal, name: d.name, grams: 0, kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat, micros: {}, source: "quick" },
  });
  await afterLog(user.id, log.id, date);
  return { id: log.id };
}

export async function createFood(input: { name: string; brand?: string; servingG: number; kcal: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number }) {
  const user = await requireUserApi();
  const d = z.object({
    name: z.string().trim().min(1).max(120), brand: z.string().trim().max(80).optional(), servingG: z.number().positive().max(2000),
    kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100),
    fiber: z.number().min(0).max(100).optional(), sugar: z.number().min(0).max(100).optional(),
  }).parse(input);
  const food = await db.food.create({
    data: { ...d, brand: d.brand || null, fiber: d.fiber ?? 0, sugar: d.sugar ?? 0, micros: {}, source: "custom", createdById: user.id },
  });
  return { id: food.id };
}

export async function updateLogGrams(id: string, grams: number) {
  const user = await requireUserApi();
  const g = z.number().positive().max(5000).parse(grams);
  const log = await db.foodLog.findFirst({ where: { id, userId: user.id } });
  if (!log || log.grams <= 0) return;
  const f = g / log.grams;
  await db.foodLog.update({
    where: { id },
    data: {
      grams: g, kcal: r1(log.kcal * f), protein: r1(log.protein * f), carbs: r1(log.carbs * f), fat: r1(log.fat * f),
      fiber: r1(log.fiber * f), sugar: r1(log.sugar * f), micros: scaleMicros(asMicros(log.micros) as Micros, f),
    },
  });
  revalidatePath("/today");
}

export async function moveLog(id: string, meal: string) {
  const user = await requireUserApi();
  await db.foodLog.updateMany({ where: { id, userId: user.id }, data: { meal: Meal.parse(meal) } });
  revalidatePath("/today");
}

export async function deleteLog(id: string) {
  const user = await requireUserApi();
  await db.foodLog.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/today");
}

export async function copyMeal(input: { fromDate: string; meal: string; toDate: string }) {
  const user = await requireUserApi();
  const meal = Meal.parse(input.meal);
  if (!isValidDay(input.fromDate) || !isValidDay(input.toDate)) return;
  const logs = await db.foodLog.findMany({ where: { userId: user.id, date: input.fromDate, meal } });
  for (const l of logs) {
    const { id: _id, createdAt: _c, ...rest } = l;
    const created = await db.foodLog.create({ data: { ...rest, micros: asMicros(l.micros), date: input.toDate } });
    await afterLog(user.id, created.id, input.toDate);
  }
}

export async function toggleFavorite(foodId: string) {
  const user = await requireUserApi();
  const key = { userId_foodId: { userId: user.id, foodId } };
  const exists = await db.favoriteFood.findUnique({ where: key });
  if (exists) await db.favoriteFood.delete({ where: key });
  else await db.favoriteFood.create({ data: { userId: user.id, foodId } });
  return !exists;
}
