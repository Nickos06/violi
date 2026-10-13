"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteGymWorkout, saveRoutine } from "@/app/actions/gym";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui";
import type { SetType } from "@/lib/gym";

export function WorkoutActions({ id, name, exercises }: { id: string; name: string; exercises: { exerciseId: string; sets: { type: string; weight: number | null; reps: number | null }[] }[] }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 flex gap-2">
      <ConfirmDelete title={t.gym.deleteWorkout} onConfirm={async () => { await deleteGymWorkout(id); router.push("/gym"); router.refresh(); }} />
      <Button variant="secondary" size="lg" className="flex-1" disabled={pending}
        onClick={() => start(async () => {
          const rid = await saveRoutine({
            name, exercises: exercises.map((e) => ({ exerciseId: e.exerciseId, restSec: 90, sets: e.sets.map((s) => ({ type: s.type as SetType, weight: s.weight, reps: s.reps })) })),
          });
          router.push(`/gym/routines/${rid}`);
        })}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <><BookmarkPlus className="size-5" /> {t.gym.newRoutine}</>}
      </Button>
    </div>
  );
}
