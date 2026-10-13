// Adds the built-in exercise library (idempotent) and, when SEED_DEMO is not "0", demo routines and
// four weeks of strength history for the demo account. Safe to run on an existing database.
import { PrismaClient } from "@prisma/client";
import { EXERCISES } from "./exercises";
import { EXERCISE_MEDIA } from "./exercise-media";
import { GUIDE_EL } from "./exercise-guide-el";
import { addDays, today } from "../src/lib/dates";
import { e1rm } from "../src/lib/gym";

const db = new PrismaClient();
export const disconnectGymDb = () => db.$disconnect();

export async function seedExercises() {
  const existing = new Set((await db.exercise.findMany({ where: { createdById: null }, select: { name: true } })).map((e) => e.name));
  const missing = EXERCISES.filter(([name]) => !existing.has(name));
  if (missing.length) {
    await db.exercise.createMany({
      data: missing.map(([name, nameEl, muscle, secondary, equipment, kind]) => ({ name, nameEl, muscle, secondary, equipment, kind })),
    });
  }
  // Attach demo media + execution guides (kept up to date on every run).
  let withMedia = 0;
  for (const [name] of EXERCISES) {
    const m = EXERCISE_MEDIA[name];
    const el = GUIDE_EL[name];
    if (m?.media) withMedia++;
    await db.exercise.updateMany({
      where: { name, createdById: null },
      data: { media: m?.media ?? null, guide: { el: el ?? { steps: [], tips: [] }, en: { steps: m?.stepsEn ?? [], tips: [] } } },
    });
  }
  console.log(`✓ exercises: ${EXERCISES.length} (${missing.length} added, ${withMedia} with demo media)`);
}

export async function seedGymDemo() {
  const demo = await db.user.findUnique({ where: { email: "demo@violi.app" } });
  if (!demo) return;
  if (await db.routine.count({ where: { userId: demo.id } })) return console.log("✓ demo gym data already present");
  const ex = async (name: string) => (await db.exercise.findFirstOrThrow({ where: { name, createdById: null } })).id;

  const push = [
    { id: await ex("Bench Press (Barbell)"), base: 70, reps: 8, sets: 3, rest: 150 },
    { id: await ex("Incline Bench Press (Dumbbell)"), base: 26, reps: 10, sets: 3, rest: 120 },
    { id: await ex("Overhead Press (Barbell)"), base: 42.5, reps: 8, sets: 3, rest: 120 },
    { id: await ex("Lateral Raise (Dumbbell)"), base: 10, reps: 14, sets: 3, rest: 60 },
    { id: await ex("Triceps Rope Pushdown"), base: 25, reps: 12, sets: 3, rest: 60 },
  ];
  const pull = [
    { id: await ex("Deadlift (Barbell)"), base: 120, reps: 5, sets: 3, rest: 180 },
    { id: await ex("Lat Pulldown (Cable)"), base: 60, reps: 10, sets: 3, rest: 90 },
    { id: await ex("Seated Cable Row"), base: 55, reps: 10, sets: 3, rest: 90 },
    { id: await ex("Face Pull (Cable)"), base: 20, reps: 15, sets: 3, rest: 60 },
    { id: await ex("Hammer Curl (Dumbbell)"), base: 14, reps: 10, sets: 3, rest: 60 },
  ];
  const legs = [
    { id: await ex("Squat (Barbell)"), base: 90, reps: 6, sets: 4, rest: 180 },
    { id: await ex("Romanian Deadlift (Barbell)"), base: 80, reps: 8, sets: 3, rest: 120 },
    { id: await ex("Leg Press (Machine)"), base: 160, reps: 12, sets: 3, rest: 120 },
    { id: await ex("Lying Leg Curl (Machine)"), base: 40, reps: 12, sets: 3, rest: 60 },
    { id: await ex("Standing Calf Raise (Machine)"), base: 60, reps: 15, sets: 3, rest: 60 },
  ];
  const plans = [["Push", push], ["Pull", pull], ["Legs", legs]] as const;
  for (const [name, items] of plans) {
    await db.routine.create({
      data: {
        userId: demo.id, name,
        exercises: { create: items.map((it, position) => ({ exerciseId: it.id, position, restSec: it.rest, sets: Array.from({ length: it.sets }, () => ({ type: "normal", weight: it.base, reps: it.reps })) })) },
      },
    });
  }
  // 4 weeks, 3 sessions/week, slow linear progression.
  let n = 0;
  for (let week = 3; week >= 0; week--) {
    for (const [i, [name, items]] of plans.entries()) {
      const date = addDays(today(), -(week * 7 + (5 - i * 2)));
      if (date >= today()) continue;
      const start = new Date(`${date}T18:${10 + i}:00`);
      const bump = (3 - week) * 2.5;
      let volume = 0, sets = 0;
      const w = await db.gymWorkout.create({
        data: { userId: demo.id, name, startedAt: start, endedAt: new Date(start.getTime() + 62 * 60_000), date, durationSec: 62 * 60 },
      });
      for (const [position, it] of items.entries()) {
        const ge = await db.gymExercise.create({ data: { workoutId: w.id, exerciseId: it.id, position } });
        for (let s = 0; s < it.sets; s++) {
          const weight = it.base + bump;
          const reps = it.reps - (s === it.sets - 1 ? 1 : 0);
          volume += weight * reps; sets++;
          await db.gymSet.create({
            data: { gymExerciseId: ge.id, userId: demo.id, exerciseId: it.id, date, position: s, type: "normal", weightKg: weight, reps, e1rm: e1rm(weight, reps) },
          });
        }
      }
      await db.gymWorkout.update({ where: { id: w.id }, data: { volumeKg: volume, setsCount: sets } });
      n++;
    }
  }
  console.log(`✓ demo gym: 3 routines, ${n} workouts`);
}

if (process.argv[1]?.endsWith("seed-gym.ts")) {
  (async () => {
    await seedExercises();
    if (process.env.SEED_DEMO !== "0") await seedGymDemo();
  })()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => db.$disconnect());
}
