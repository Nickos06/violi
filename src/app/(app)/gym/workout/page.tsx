import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exerciseLibrary } from "@/lib/gym-library";
import { WorkoutClient, type RoutineSeed } from "./workout-client";

export const metadata = { title: "Workout" };

export default async function LiveWorkoutPage({ searchParams }: { searchParams: Promise<{ routine?: string }> }) {
  const user = await requireUser();
  const { routine: routineId } = await searchParams;
  const [library, routine] = await Promise.all([
    exerciseLibrary(user.id, user.locale),
    routineId ? db.routine.findFirst({ where: { id: routineId, userId: user.id }, include: { exercises: { orderBy: { position: "asc" } } } }) : null,
  ]);
  const seed: RoutineSeed | null = routine
    ? {
        id: routine.id,
        name: routine.name,
        exercises: routine.exercises.map((e) => ({
          exerciseId: e.exerciseId, restSec: e.restSec, notes: e.notes ?? "", superset: e.superset,
          sets: ((e.sets as { type: string; weight: number | null; reps: number | null }[]) ?? []).map((s) => ({ type: s.type, weight: s.weight, reps: s.reps })),
        })),
      }
    : null;
  return <WorkoutClient library={library} routine={seed} bodyweightKg={null} userName={user.name} defaultVisibility={user.defaultVisibility} />;
}
