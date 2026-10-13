"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveWorkout, useNow } from "@/lib/live-workout";
import { loadRecording, movingMs, type RecState } from "@/lib/recorder";
import { clock, km, SPORT, sportName } from "@/lib/sports";
import { WorkoutIcon } from "../icons";
import { useT } from "../i18n-provider";

/** Floating "recording in progress" pill, so an activity left running is one tap away. */
export function RecordingBanner() {
  const { t, locale } = useT();
  const [rec, setRec] = useState<RecState | null>(null);
  const { workout } = useLiveWorkout();
  const now = useNow();
  useEffect(() => {
    const read = () => setRec(loadRecording());
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("focus", read); window.removeEventListener("storage", read); };
  }, []);
  if (!rec) return null;
  const sec = movingMs(rec, now) / 1000;
  return (
    <Link
      href="/record"
      className={`press varnish fixed inset-x-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-[20px] px-4 py-3 shadow-2xl md:left-[calc(16rem+1.5rem)] md:right-6 md:mx-0 md:ml-auto ${workout ? "bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+148px)] md:bottom-24" : "bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+76px)] md:bottom-6"}`}
    >
      <WorkoutIcon type={rec.sport} className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold">{sportName(rec.sport, locale)}{SPORT[rec.sport].gps ? ` · ${km(rec.distM)} km` : ""}</span>
        <span className="block text-[12px] font-semibold opacity-70">{rec.status === "recording" ? t.record.inProgress : rec.status === "autopaused" ? t.record.autopaused : t.record.paused}</span>
      </span>
      <span className="tabular text-[15px] font-extrabold">{clock(sec)}</span>
    </Link>
  );
}
