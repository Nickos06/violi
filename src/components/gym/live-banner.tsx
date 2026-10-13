"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { fmtClock } from "@/lib/gym";
import { useLiveWorkout, useNow } from "@/lib/live-workout";
import { useT } from "../i18n-provider";

/** Floating "workout in progress" pill shown everywhere except the live workout screen. */
export function LiveWorkoutBanner() {
  const { t } = useT();
  const path = usePathname();
  const { workout } = useLiveWorkout();
  const now = useNow();
  if (!workout || path.startsWith("/gym/workout")) return null;
  return (
    <Link
      href="/gym/workout"
      className="press varnish fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+76px)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-[20px] px-4 py-3 shadow-2xl md:bottom-6 md:left-[calc(16rem+1.5rem)] md:right-6 md:mx-0 md:ml-auto"
    >
      <Dumbbell className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold">{workout.name}</span>
        <span className="block text-[12px] font-semibold opacity-70">{t.gym.inProgress}</span>
      </span>
      <span className="tabular text-[15px] font-extrabold">{fmtClock(Math.max(0, Math.floor((now - workout.startedAt) / 1000)))}</span>
    </Link>
  );
}

export function StartWorkoutButton({ label, resumeLabel }: { label: string; resumeLabel: string }) {
  const { workout } = useLiveWorkout();
  return (
    <Link href="/gym/workout" className="press varnish flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold">
      <Dumbbell className="size-5" /> {workout ? resumeLabel : label}
    </Link>
  );
}
