"use client";

import Link from "next/link";
import { Footprints, Lock, Plus } from "lucide-react";
import { useT } from "./i18n-provider";
import { Card, fmt } from "./ui";
import { WORKOUT_ICON, formatDuration } from "@/lib/workouts";

type Act = { id: string; type: string; name: string; source: string; durationSec: number; distanceM: number | null; kcal: number };

const SOURCE_LABEL: Record<string, string> = { garmin: "Garmin", strava: "Strava", fit: ".FIT", manual: "" };

export function ExerciseCard({ activities, steps, date }: { activities: Act[]; steps: number | null; date: string }) {
  const { t } = useT();
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {steps !== null && (
          <li className="flex items-center gap-3 px-4 py-3">
            <div className="grid size-10 place-items-center rounded-xl bg-surface-2"><Footprints className="size-5 text-muted" /></div>
            <div className="flex-1 text-[14px] font-medium">{fmt(steps)} {t.today.steps}</div>
            <span className="text-[12px] text-muted">Garmin</span>
          </li>
        )}
        {activities.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3">
            <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-lg">{WORKOUT_ICON[a.type] ?? "💪"}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{a.name}</div>
              <div className="flex items-center gap-1 text-[12px] text-muted">
                {formatDuration(a.durationSec)}
                {a.distanceM ? ` · ${(a.distanceM / 1000).toFixed(1)} km` : ""}
                {SOURCE_LABEL[a.source] && ` · ${SOURCE_LABEL[a.source]}`}
                {a.source === "strava" && <Lock className="size-3" aria-label={t.workouts.privateStrava} />}
              </div>
            </div>
            <div className="tabular text-[14px] font-semibold text-good">{fmt(a.kcal)}</div>
          </li>
        ))}
        <li>
          <Link href={`/workouts?add=1&d=${date}`} className="flex items-center gap-3 px-4 py-3.5 text-[14px] text-faint transition hover:bg-surface-2">
            <Plus className="size-4" /> {t.today.addWorkout}
          </Link>
        </li>
      </ul>
    </Card>
  );
}
