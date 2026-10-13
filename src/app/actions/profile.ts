"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { today } from "@/lib/dates";
import { recalcTargets, runCheckIn } from "@/lib/plan";
import { awardXp, unlock, XP } from "@/lib/gamification";

const OnboardingSchema = z.object({
  goalType: z.enum(["lose", "maintain", "gain"]),
  sex: z.enum(["male", "female"]),
  birthYear: z.coerce.number().int().min(1920).max(new Date().getFullYear() - 13),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(30).max(300),
  targetWeightKg: z.coerce.number().min(30).max(300).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goalRatePct: z.coerce.number().min(0).max(1.5),
  dietType: z.enum(["balanced", "high_protein", "low_carb", "keto", "plant"]),
});

export async function completeOnboarding(input: z.input<typeof OnboardingSchema>) {
  const user = await requireUserApi();
  const d = OnboardingSchema.parse(input);
  await db.user.update({
    where: { id: user.id },
    data: {
      goalType: d.goalType, sex: d.sex, birthYear: d.birthYear, heightCm: d.heightCm, targetWeightKg: d.targetWeightKg ?? null,
      activityLevel: d.activityLevel, goalRatePct: d.goalType === "maintain" ? 0 : d.goalRatePct, dietType: d.dietType, onboarded: true,
    },
  });
  await db.weightEntry.upsert({
    where: { userId_date: { userId: user.id, date: today() } },
    create: { userId: user.id, date: today(), weightKg: d.weightKg },
    update: { weightKg: d.weightKg },
  });
  await recalcTargets(user.id, { resetExpenditure: true });
  redirect("/today");
}

const GoalSchema = OnboardingSchema.omit({ weightKg: true }).extend({ exerciseCreditPct: z.coerce.number().int().min(0).max(100), checkInWeekday: z.coerce.number().int().min(0).max(6) });

export async function updateGoals(input: z.input<typeof GoalSchema>) {
  const user = await requireUserApi();
  const d = GoalSchema.parse(input);
  const activityChanged = d.activityLevel !== user.activityLevel;
  await db.user.update({
    where: { id: user.id },
    data: { ...d, targetWeightKg: d.targetWeightKg ?? null, goalRatePct: d.goalType === "maintain" ? 0 : d.goalRatePct },
  });
  // Changing lifestyle activity resets the adaptive estimate; other changes keep it.
  await recalcTargets(user.id, { resetExpenditure: activityChanged });
  revalidatePath("/", "layout");
}

export async function setManualTargets(input: { kcal: number; protein: number; carbs: number; fat: number }) {
  const user = await requireUserApi();
  const d = z.object({ kcal: z.number().min(800).max(8000), protein: z.number().min(0), carbs: z.number().min(0), fat: z.number().min(0) }).parse(input);
  await db.user.update({ where: { id: user.id }, data: { targetKcal: d.kcal, targetProtein: d.protein, targetCarbs: d.carbs, targetFat: d.fat } });
  revalidatePath("/", "layout");
}

export async function logWeight(weightKg: number, date = today()) {
  const user = await requireUserApi();
  const w = z.number().min(30).max(300).parse(weightKg);
  await db.weightEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, weightKg: w },
    update: { weightKg: w },
  });
  await awardXp(user.id, "weigh", date, XP.weigh, date);
  const count = await db.weightEntry.count({ where: { userId: user.id } });
  if (count >= 7) await unlock(user.id, "weigh_7");
  revalidatePath("/", "layout");
}

export async function deleteWeight(id: string) {
  const user = await requireUserApi();
  await db.weightEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/progress");
}

const SettingsSchema = z.object({
  locale: z.enum(["el", "en"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  profilePublic: z.boolean().optional(),
  shareMeals: z.boolean().optional(),
  shareWorkouts: z.boolean().optional(),
  shareWeight: z.boolean().optional(),
  defaultVisibility: z.enum(["public", "friends", "private"]).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(160).optional(),
});

export async function updateSettings(input: z.input<typeof SettingsSchema>) {
  const user = await requireUserApi();
  const d = SettingsSchema.parse(input);
  await db.user.update({ where: { id: user.id }, data: d });
  const jar = await cookies();
  if (d.locale) jar.set("violi_locale", d.locale, { path: "/", maxAge: 31536000 });
  if (d.theme) jar.set("violi_theme", d.theme, { path: "/", maxAge: 31536000 });
  revalidatePath("/", "layout");
}

export async function doCheckIn() {
  const user = await requireUserApi();
  const c = await runCheckIn(user.id);
  await awardXp(user.id, "checkin", c.date, XP.checkin);
  await unlock(user.id, "first_checkin");
  revalidatePath("/", "layout");
  return c;
}
