import { notFound } from "next/navigation";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exerciseLibrary } from "@/lib/gym-library";
import { PageHeader } from "@/components/ui";
import { RoutineEditor } from "../routine-editor";

export const metadata = { title: "Edit routine" };

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const r = await db.routine.findFirst({ where: { id, userId: user.id }, include: { exercises: { orderBy: { position: "asc" } } } });
  if (!r) notFound();
  return (
    <div className="animate-rise">
      <PageHeader back="/gym" title={t.gym.editRoutine} />
      <RoutineEditor
        library={await exerciseLibrary(user.id)}
        initial={{
          id: r.id, name: r.name, notes: r.notes ?? "",
          exercises: r.exercises.map((e) => ({ exerciseId: e.exerciseId, restSec: e.restSec, notes: e.notes ?? "", sets: (e.sets as { type: string; weight: number | null; reps: number | null }[]) ?? [] })),
        }}
      />
    </div>
  );
}
