// Seeds the food database plus a demo account with three weeks of history and a few friends.
// Demo login (local development only): demo@violi.app / demo1234 — friends use the same password.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FOODS } from "./foods";
import { computeTargets, initialExpenditure } from "../src/lib/nutrition";
import { scaleMicros } from "../src/lib/nutrients";
import { addDays, today, toDay, weekStart } from "../src/lib/dates";
import { disconnectGymDb, seedExercises, seedGymDemo } from "./seed-gym";

const db = new PrismaClient();
const r1 = (n: number) => Math.round(n * 10) / 10;

async function seedFoods() {
  await db.food.deleteMany({ where: { source: "seed" } });
  await db.food.createMany({
    data: FOODS.map(([name, nameEl, kcal, protein, carbs, fat, fiber, sugar, servingG, servingLabel, micros]) => ({
      name, nameEl, kcal, protein, carbs, fat, fiber, sugar, servingG, servingLabel, micros, source: "seed",
    })),
  });
  console.log(`✓ ${FOODS.length} foods`);
}

type Plan = { meal: string; food: string; grams: number }[];

const DAY_PLANS: Plan[] = [
  [
    { meal: "breakfast", food: "Γιαούρτι στραγγιστό 2%", grams: 200 }, { meal: "breakfast", food: "Βρώμη", grams: 40 }, { meal: "breakfast", food: "Μέλι", grams: 15 },
    { meal: "lunch", food: "Στήθος κοτόπουλο ψητό", grams: 180 }, { meal: "lunch", food: "Ρύζι λευκό βρασμένο", grams: 200 }, { meal: "lunch", food: "Χωριάτικη σαλάτα", grams: 250 },
    { meal: "snack", food: "Μπανάνα", grams: 120 }, { meal: "snack", food: "Αμύγδαλα", grams: 25 },
    { meal: "dinner", food: "Φακές σούπα", grams: 350 }, { meal: "dinner", food: "Ψωμί ολικής άλεσης", grams: 60 }, { meal: "dinner", food: "Φέτα", grams: 40 },
  ],
  [
    { meal: "breakfast", food: "Αυγό", grams: 150 }, { meal: "breakfast", food: "Ψωμί ολικής άλεσης", grams: 60 }, { meal: "breakfast", food: "Freddo cappuccino σκέτο", grams: 250 },
    { meal: "lunch", food: "Γεμιστά", grams: 400 }, { meal: "lunch", food: "Φέτα", grams: 50 },
    { meal: "snack", food: "Πρωτεΐνη whey", grams: 30 }, { meal: "snack", food: "Μήλο", grams: 180 },
    { meal: "dinner", food: "Σολομός ψητός", grams: 170 }, { meal: "dinner", food: "Πατάτα βραστή", grams: 250 }, { meal: "dinner", food: "Μπρόκολο βραστό", grams: 150 },
  ],
  [
    { meal: "breakfast", food: "Κουλούρι Θεσσαλονίκης", grams: 90 }, { meal: "breakfast", food: "Freddo cappuccino σκέτο", grams: 250 },
    { meal: "lunch", food: "Πίτα γύρος", grams: 320 },
    { meal: "snack", food: "Γιαούρτι στραγγιστό 0%", grams: 170 }, { meal: "snack", food: "Μύρτιλα", grams: 100 },
    { meal: "dinner", food: "Μουσακάς", grams: 350 }, { meal: "dinner", food: "Χωριάτικη σαλάτα", grams: 200 },
  ],
];

async function upsertUser(u: { email: string; username: string; name: string; color: string; sex: "male" | "female"; birthYear: number; heightCm: number; weightKg: number; goal: "lose" | "maintain" | "gain"; xp: number; streak: number; bio?: string }) {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await db.user.deleteMany({ where: { email: u.email } });
  const p = { sex: u.sex, weightKg: u.weightKg, heightCm: u.heightCm, age: new Date().getFullYear() - u.birthYear, activityLevel: "light" as const };
  const expenditure = initialExpenditure(p);
  const t = computeTargets({ ...p, expenditure, goal: u.goal, ratePct: u.goal === "maintain" ? 0 : 0.5, diet: "balanced" });
  return db.user.create({
    data: {
      email: u.email, username: u.username, name: u.name, passwordHash, avatarColor: u.color, bio: u.bio, onboarded: true,
      sex: u.sex, birthYear: u.birthYear, heightCm: u.heightCm, activityLevel: "light", goalType: u.goal, goalRatePct: u.goal === "maintain" ? 0 : 0.5,
      expenditure, expenditureAt: new Date(Date.now() - 8 * 86_400_000), targetKcal: t.kcal, targetProtein: t.protein, targetCarbs: t.carbs, targetFat: t.fat,
      xp: u.xp, streak: u.streak, longestStreak: Math.max(u.streak, 12), lastLogDate: today(), defaultVisibility: "friends",
      createdAt: new Date(Date.now() - 30 * 86_400_000),
    },
  });
}

async function seedDemo() {
  const foods = await db.food.findMany({ where: { source: "seed" } });
  const byName = new Map(foods.map((f) => [f.nameEl ?? f.name, f]));

  const demo = await upsertUser({ email: "demo@violi.app", username: "demo", name: "Νίκος Demo", color: "#8B7CFF", sex: "male", birthYear: 1996, heightCm: 180, weightKg: 84, goal: "lose", xp: 2350, streak: 21, bio: "Τρέχω, τρώω, ανεβαίνω level." });
  const friends = await Promise.all([
    upsertUser({ email: "maria@violi.app", username: "maria", name: "Μαρία Παπαδοπούλου", color: "#FF7A6B", sex: "female", birthYear: 1998, heightCm: 166, weightKg: 61, goal: "maintain", xp: 3900, streak: 34, bio: "Yoga & φρέσκια φέτα 🧘‍♀️" }),
    upsertUser({ email: "giorgos@violi.app", username: "giorgos", name: "Γιώργος Κ.", color: "#5AA9FF", sex: "male", birthYear: 1993, heightCm: 178, weightKg: 79, goal: "gain", xp: 5200, streak: 9, bio: "Marathon training · Garmin addict" }),
    upsertUser({ email: "eleni@violi.app", username: "eleni", name: "Ελένη Μ.", color: "#34D399", sex: "female", birthYear: 2000, heightCm: 170, weightKg: 68, goal: "lose", xp: 1450, streak: 5 }),
    upsertUser({ email: "kostas@violi.app", username: "kostas", name: "Κώστας Δ.", color: "#FFC24B", sex: "male", birthYear: 1990, heightCm: 184, weightKg: 92, goal: "lose", xp: 900, streak: 2 }),
  ]);

  // Follows: demo ↔ everyone (mutual friends), plus a few between friends.
  for (const f of friends) {
    await db.follow.createMany({ data: [{ followerId: demo.id, followingId: f.id }, { followerId: f.id, followingId: demo.id }] });
  }
  await db.follow.createMany({ data: [{ followerId: friends[0].id, followingId: friends[1].id }, { followerId: friends[1].id, followingId: friends[0].id }] });

  // 21 days of logs + weigh-ins for the demo user (≈ −0.45 kg/week with noise).
  const t0 = today();
  for (let i = 21; i >= 0; i--) {
    const date = addDays(t0, -i);
    const noise = Math.sin(i * 1.7) * 0.35 + Math.cos(i * 0.9) * 0.2;
    if (i % 3 !== 1 || i < 3) await db.weightEntry.create({ data: { userId: demo.id, date, weightKg: r1(84 - (21 - i) * 0.065 + noise) } });
    if (i === 0) continue; // leave today for the user to log
    const plan = DAY_PLANS[i % DAY_PLANS.length];
    for (const item of plan) {
      const f = byName.get(item.food);
      if (!f) throw new Error(`missing food ${item.food}`);
      const k = item.grams / 100;
      await db.foodLog.create({
        data: {
          userId: demo.id, date, meal: item.meal, foodId: f.id, name: f.nameEl ?? f.name, grams: item.grams, kcal: r1(f.kcal * k), protein: r1(f.protein * k),
          carbs: r1(f.carbs * k), fat: r1(f.fat * k), fiber: r1(f.fiber * k), sugar: r1(f.sugar * k), micros: scaleMicros(f.micros as object, k), source: "search",
          createdAt: new Date(`${date}T${item.meal === "breakfast" ? "08" : item.meal === "lunch" ? "14" : item.meal === "snack" ? "17" : "21"}:00:00`),
        },
      });
    }
    if (i % 2 === 0) {
      await db.activity.create({
        data: {
          userId: demo.id, source: i % 4 === 0 ? "garmin" : "manual", externalId: i % 4 === 0 ? `demo-garmin-${i}` : null, type: i % 4 === 0 ? "run" : "strength",
          name: i % 4 === 0 ? "Πρωινό τρέξιμο" : "Push day", startAt: new Date(`${date}T07:30:00`), date,
          durationSec: i % 4 === 0 ? 2580 : 3600, distanceM: i % 4 === 0 ? 7400 : null, kcal: i % 4 === 0 ? 520 : 310, avgHr: i % 4 === 0 ? 152 : 118,
        },
      });
    }
  }
  await db.dailyActivity.create({ data: { userId: demo.id, date: t0, source: "garmin", steps: 6840, activeKcal: 310 } });

  // XP history this week so the leaderboard is alive.
  const ws = weekStart(t0);
  const weekly = [[demo, 420], [friends[0], 610], [friends[1], 780], [friends[2], 260], [friends[3], 140]] as const;
  for (const [u, amount] of weekly) {
    await db.xpEvent.create({ data: { userId: u.id, type: "seed", refId: `week-${ws}`, amount, date: ws } });
  }
  for (const key of ["first_log", "streak_3", "streak_7", "first_workout", "workouts_10", "weigh_7", "level_5", "first_post"]) {
    await db.achievement.create({ data: { userId: demo.id, key } });
  }

  // Friends' posts with W/L and comments.
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
  const p1 = await db.post.create({
    data: {
      userId: friends[1].id, type: "workout", visibility: "friends", text: "Long run Κυριακής ✅ Τα πόδια μου δεν υπάρχουν πια.", createdAt: hoursAgo(3),
      payload: { type: "run", name: "Long run · Σέιχ Σου", durationSec: 6300, distanceM: 21100, kcal: 1380, avgHr: 148, source: "garmin" },
    },
  });
  const p2 = await db.post.create({
    data: {
      userId: friends[0].id, type: "meal", visibility: "public", text: "Μεσημεριανό στο σπίτι 🍅", createdAt: hoursAgo(6),
      payload: { meal: "lunch", kcal: 612, protein: 38, carbs: 52, fat: 27, items: [{ name: "Φασολάκια λαδερά", grams: 300, kcal: 285 }, { name: "Φέτα", grams: 50, kcal: 132 }, { name: "Ψωμί ολικής άλεσης", grams: 60, kcal: 151 }] },
    },
  });
  const p3 = await db.post.create({
    data: { userId: friends[2].id, type: "achievement", visibility: "friends", createdAt: hoursAgo(20), payload: { kind: "level", level: 6 } },
  });
  const p4 = await db.post.create({
    data: { userId: friends[3].id, type: "text", visibility: "friends", text: "Πρώτη εβδομάδα χωρίς αναψυκτικά. Ποιος θα με νικήσει στο streak; 😤", createdAt: hoursAgo(28), payload: {} },
  });
  await db.reaction.createMany({
    data: [
      { postId: p1.id, userId: demo.id, kind: "W" }, { postId: p1.id, userId: friends[0].id, kind: "W" }, { postId: p1.id, userId: friends[2].id, kind: "W" },
      { postId: p2.id, userId: friends[1].id, kind: "W" }, { postId: p2.id, userId: friends[3].id, kind: "W" },
      { postId: p3.id, userId: friends[0].id, kind: "W" }, { postId: p4.id, userId: friends[1].id, kind: "L" }, { postId: p4.id, userId: friends[2].id, kind: "W" },
    ],
  });
  await db.comment.createMany({
    data: [
      { postId: p1.id, userId: friends[0].id, text: "Μηχανή! 🔥", createdAt: hoursAgo(2.5) },
      { postId: p1.id, userId: demo.id, text: "Τι pace έβγαλες;", createdAt: hoursAgo(2) },
      { postId: p1.id, userId: friends[1].id, text: "5:00/km, άνετο 😅", createdAt: hoursAgo(1.5) },
      { postId: p4.id, userId: friends[1].id, text: "L γιατί ξέρω ότι έχεις Coca-Cola στο ψυγείο 😂", createdAt: hoursAgo(26) },
    ],
  });
  await db.notification.create({ data: { userId: demo.id, actorId: friends[0].id, type: "follow", createdAt: hoursAgo(30) } });

  console.log(`✓ demo user (${demo.email}) with ${friends.length} friends — see prisma/seed.ts for the password`);
  console.log(`  today: ${toDay(new Date())}`);
}

async function main() {
  await seedFoods();
  await seedExercises();
  if (process.env.SEED_DEMO !== "0") {
    await seedDemo();
    await seedGymDemo();
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); await disconnectGymDb(); });
