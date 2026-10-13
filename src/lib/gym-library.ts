import "server-only";
import { db } from "./db";
import type { ExerciseLite } from "@/components/gym/exercise-picker";

type GuideJson = { el?: { steps: string[]; tips: string[] }; en?: { steps: string[]; tips: string[] } } | null;

/** Built-in exercises plus the user's own custom ones, with the demo media and guide in the user's language. */
export async function exerciseLibrary(userId: string, locale = "el"): Promise<ExerciseLite[]> {
  const rows = await db.exercise.findMany({ where: { OR: [{ createdById: null }, { createdById: userId }] } });
  return rows.map((e) => toLite(e, locale));
}

export function toLite(
  e: { id: string; name: string; nameEl: string | null; muscle: string; secondary: string; equipment: string; kind: string; createdById: string | null; media: string | null; guide: unknown },
  locale: string,
): ExerciseLite {
  const g = e.guide as GuideJson;
  const guide = (locale === "en" ? g?.en : g?.el) ?? g?.en ?? null;
  return {
    id: e.id, name: e.name, nameEl: e.nameEl, muscle: e.muscle, secondary: e.secondary, equipment: e.equipment, kind: e.kind,
    custom: !!e.createdById, media: e.media, guide: guide && (guide.steps.length || guide.tips.length) ? guide : null,
  };
}
