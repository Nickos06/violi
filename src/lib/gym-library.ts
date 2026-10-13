import "server-only";
import { db } from "./db";
import type { ExerciseLite } from "@/components/gym/exercise-picker";

/** Built-in exercises plus the user's own custom ones. */
export async function exerciseLibrary(userId: string): Promise<ExerciseLite[]> {
  const rows = await db.exercise.findMany({ where: { OR: [{ createdById: null }, { createdById: userId }] } });
  return rows.map((e) => ({ id: e.id, name: e.name, nameEl: e.nameEl, muscle: e.muscle, secondary: e.secondary, equipment: e.equipment, kind: e.kind, custom: !!e.createdById }));
}
