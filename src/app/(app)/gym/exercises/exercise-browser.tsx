"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { cn, Input } from "@/components/ui";
import { exerciseName, type ExerciseLite } from "@/components/gym/exercise-picker";
import { EQUIPMENT_LABEL, MUSCLE_LABEL, MUSCLES, type Muscle } from "@/lib/gym";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ExerciseBrowser({ library }: { library: ExerciseLite[] }) {
  const { t, locale } = useT();
  const L = locale === "el" ? "el" : "en";
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const list = useMemo(() => {
    const n = strip(q.trim());
    return library
      .filter((e) => (muscle === "all" || e.muscle === muscle) && (!n || strip(`${e.nameEl ?? ""} ${e.name}`).includes(n)))
      .sort((a, b) => exerciseName(a, locale).localeCompare(exerciseName(b, locale), locale));
  }, [library, q, muscle, locale]);
  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" strokeWidth={2.4} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.gym.searchExercises} className="pl-11" />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {(["all", ...MUSCLES] as const).map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className={cn("press h-8 shrink-0 rounded-full px-3 text-[12.5px] font-bold", muscle === m ? "varnish" : "edge text-muted")}>
            {m === "all" ? t.gym.allMuscles : MUSCLE_LABEL[m][L]}
          </button>
        ))}
      </div>
      <div className="card mt-4 divide-y divide-border overflow-hidden">
        {list.map((e) => (
          <Link key={e.id} href={`/gym/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
            <span className="edge-strong grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-black text-muted">{exerciseName(e, locale).slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold">{exerciseName(e, locale)}</span>
              <span className="block truncate text-[12px] font-semibold text-faint">
                {MUSCLE_LABEL[e.muscle as Muscle]?.[L]} · {EQUIPMENT_LABEL[e.equipment as keyof typeof EQUIPMENT_LABEL]?.[L]}{e.custom ? ` · ${t.gym.custom}` : ""}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
