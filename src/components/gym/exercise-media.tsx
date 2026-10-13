"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Lightbulb } from "lucide-react";
import { mediaUrl, type ExerciseGuide } from "@/lib/exercise-media";
import { EQUIPMENT_LABEL, MUSCLE_LABEL, type Muscle } from "@/lib/gym";
import { useT } from "../i18n-provider";
import { Sheet } from "../sheet";
import { cn } from "../ui";
import { exerciseName, type ExerciseLite } from "./exercise-picker";

/** Small square thumbnail (start position). Monochrome to match the app. */
export function ExerciseThumb({ media, name, size = 44, className }: { media?: string | null; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!media || broken) {
    return (
      <span className={cn("edge-strong grid shrink-0 place-items-center rounded-xl text-[13px] font-black text-muted", className)} style={{ width: size, height: size }}>
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(media, 0)}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("shrink-0 rounded-xl border border-border bg-white object-cover grayscale contrast-[1.08] dark:brightness-[0.92]", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Looping demonstration: cross-fades between the start and end position so you can see the movement.
 * With reduced motion the two positions are shown side by side instead.
 */
export function ExerciseDemo({ media, className }: { media?: string | null; className?: string }) {
  const { locale } = useT();
  if (!media) return null;
  return (
    <div className={cn("card overflow-hidden p-0", className)}>
      <div className="relative aspect-[3/2] bg-white motion-reduce:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(media, 0)} alt="" className="absolute inset-0 size-full object-cover grayscale contrast-[1.08]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(media, 1)} alt="" className="demo-frame absolute inset-0 size-full object-cover grayscale contrast-[1.08]" />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span className="demo-dot-a size-1.5 rounded-full bg-white shadow" />
          <span className="demo-dot-b size-1.5 rounded-full bg-white shadow" />
        </div>
      </div>
      <div className="hidden grid-cols-2 bg-white motion-reduce:grid">
        {[0, 1].map((f) => (
          <figure key={f} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(media, f as 0 | 1)} alt="" className="aspect-square w-full object-contain grayscale" />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
              {f === 0 ? (locale === "el" ? "Αρχή" : "Start") : locale === "el" ? "Τέλος" : "End"}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function ExerciseGuideView({ guide }: { guide?: ExerciseGuide | null }) {
  const { locale } = useT();
  if (!guide || (!guide.steps.length && !guide.tips.length)) return null;
  return (
    <div className="space-y-4">
      {guide.steps.length > 0 && (
        <ol className="space-y-3">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="varnish grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-black">{i + 1}</span>
              <span className="pt-0.5 text-[14.5px] leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      )}
      {guide.tips.length > 0 && (
        <div className="edge rounded-2xl p-4" style={{ ["--edge-fill" as string]: "var(--surface-2)" }}>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.1em] text-muted">
            <Lightbulb className="size-4" /> {locale === "el" ? "Τεχνική" : "Form cues"}
          </div>
          <ul className="space-y-1.5">
            {guide.tips.map((t, i) => <li key={i} className="text-[14px] leading-relaxed">{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MuscleChips({ exercise }: { exercise: ExerciseLite }) {
  const { locale } = useT();
  const L = locale === "el" ? "el" : "en";
  const secondary = exercise.secondary.split(",").filter(Boolean) as Muscle[];
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="varnish rounded-full px-2.5 py-1 text-[12px] font-bold">{MUSCLE_LABEL[exercise.muscle as Muscle]?.[L] ?? exercise.muscle}</span>
      {secondary.map((m) => (
        <span key={m} className="edge rounded-full px-2.5 py-1 text-[12px] font-bold text-muted">{MUSCLE_LABEL[m]?.[L] ?? m}</span>
      ))}
      <span className="edge rounded-full px-2.5 py-1 text-[12px] font-bold text-muted">{EQUIPMENT_LABEL[exercise.equipment as keyof typeof EQUIPMENT_LABEL]?.[L] ?? exercise.equipment}</span>
    </div>
  );
}

/** Tap-an-exercise sheet: animated demo + how to perform it. */
export function ExerciseInfoSheet({ exercise, onClose }: { exercise: ExerciseLite | null; onClose: () => void }) {
  const { t, locale } = useT();
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise ? exerciseName(exercise, locale) : ""}>
      {exercise && (
        <div className="space-y-5">
          <ExerciseDemo media={exercise.media} />
          <MuscleChips exercise={exercise} />
          <ExerciseGuideView guide={exercise.guide} />
          <Link href={`/gym/exercises/${exercise.id}`} className="press edge flex items-center justify-between rounded-2xl px-4 py-3.5 text-[14.5px] font-bold">
            {t.gym.history} · {t.gym.prs}
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </div>
      )}
    </Sheet>
  );
}
