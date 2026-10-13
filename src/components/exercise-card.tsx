"use client";

import Link from "next/link";
import { Circle, Footprints, Lock, PenLine } from "lucide-react";
import { useT } from "./i18n-provider";
import { Card, fmt, IconTile } from "./ui";
import { WorkoutIcon } from "./icons";
import { formatDuration } from "@/lib/workouts";

type Act = { id: string; type: string; name: string; source: string; durationSec: number; distanceM: number | null; kcal: number };

const SOURCE_LABEL: Record<string, string> = { garmin: "Garmin", strava: "Strava", fit: ".FIT", manual: "", violi: "" };

export function ExerciseCard({ activities, steps, date }: { activities: Act[]; steps: number | null; date: string }) {
  const { t } = useT();
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {steps !== null && (
          <li className="flex items-center gap-3 px-4 py-3.5">
            <IconTile tone="var(--fiber)"><Footprints className="size-5" /></IconTile>
            <div className="flex-1">
              <div className="tabular text-[15px] font-extrabold">{fmt(steps)}</div>
              <div className="text-[12px] font-semibold text-faint">{t.today.steps} · Garmin</div>
            </div>
          </li>
        )}
        {activities.map((a) => (
          <li key={a.id}>
           <Link href={`/workouts/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60">
            <IconTile><WorkoutIcon type={a.type} className="size-5" /></IconTile>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-bold">{a.name}</div>
              <div className="flex items-center gap-1 text-[12px] font-semibold text-faint">
                {formatDuration(a.durationSec)}
                {a.distanceM ? ` · ${(a.distanceM / 1000).toFixed(1)} km` : ""}
                {SOURCE_LABEL[a.source] && ` · ${SOURCE_LABEL[a.source]}`}
                {a.source === "strava" && <Lock className="size-3" aria-label={t.workouts.privateStrava} />}
              </div>
            </div>
            <div className="tabular text-right text-[15px] font-extrabold text-good">
              +{fmt(a.kcal)}
              <div className="text-[10px] font-semibold text-faint">kcal</div>
            </div>
           </Link>
          </li>
        ))}
        <li className="grid grid-cols-2 divide-x divide-border">
          <Link href="/record" className="flex items-center gap-2.5 px-4 py-3.5 text-[14px] font-semibold text-faint transition-colors hover:bg-surface-2/60 hover:text-muted">
            <Circle className="size-3.5" fill="currentColor" strokeWidth={0} /> {t.record.record}
          </Link>
          <Link href={`/workouts?add=1&d=${date}`} className="flex items-center gap-2.5 px-4 py-3.5 text-[14px] font-semibold text-faint transition-colors hover:bg-surface-2/60 hover:text-muted">
            <PenLine className="size-4" /> {t.today.addWorkout}
          </Link>
        </li>
      </ul>
    </Card>
  );
}
