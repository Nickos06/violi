import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtClock, fmtSet } from "@/lib/gym";
import { Card, fmt, PageHeader } from "@/components/ui";
import { PostImage } from "@/components/lightbox";
import { WorkoutActions } from "./workout-actions";

export const metadata = { title: "Workout" };

export default async function WorkoutDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { id } = await params;
  const { done } = await searchParams;
  const w = await db.gymWorkout.findFirst({
    where: { id, userId: user.id },
    include: { exercises: { orderBy: { position: "asc" }, include: { exercise: true, sets: { orderBy: { position: "asc" } } } } },
  });
  if (!w) notFound();
  const prLabel: Record<string, string> = { weight: t.gym.heaviest, e1rm: t.gym.best1rm, volume: t.gym.bestVolume, reps: t.gym.mostReps };

  return (
    <div className="animate-rise">
      <PageHeader
        back="/gym"
        title={done ? t.gym.finishedTitle : w.name}
        subtitle={<span className="capitalize">{done ? `${w.name} · ` : ""}{w.startedAt.toLocaleString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>}
      />
      <Card className="grid grid-cols-4 divide-x divide-border">
        {[
          { l: t.gym.duration, v: fmtClock(w.durationSec) },
          { l: t.gym.volume, v: `${fmt(w.volumeKg)}` },
          { l: t.gym.sets, v: String(w.setsCount) },
          { l: t.gym.prs, v: String(w.prCount) },
        ].map((x) => (
          <div key={x.l} className="px-2 py-4 text-center">
            <div className="tabular text-[18px] font-extrabold">{x.v}</div>
            <div className="truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-faint">{x.l}</div>
          </div>
        ))}
      </Card>
      {w.photoUrl && <div className="-mx-4"><PostImage src={w.photoUrl} /></div>}
      {w.notes && <p className="mt-4 whitespace-pre-wrap px-1 text-[15px] leading-relaxed">{w.notes}</p>}

      <div className="mt-5 space-y-3">
        {w.exercises.map((e) => {
          const name = locale === "el" && e.exercise.nameEl ? e.exercise.nameEl : e.exercise.name;
          let no = 0;
          return (
            <Card key={e.id} className="p-4">
              <Link href={`/gym/exercises/${e.exerciseId}`} className="text-[15.5px] font-extrabold hover:underline">{name}</Link>
              {e.notes && <p className="mt-1 text-[13px] text-muted">{e.notes}</p>}
              <ul className="mt-2 space-y-1">
                {e.sets.map((s) => {
                  if (s.type === "normal") no++;
                  const label = s.type === "normal" ? String(no) : s.type === "warmup" ? "W" : s.type === "failure" ? "F" : "D";
                  const prs = s.prs.split(",").filter(Boolean);
                  return (
                    <li key={s.id} className="flex items-center gap-3 text-[14px]">
                      <span className="w-6 text-center text-[12px] font-black text-muted">{label}</span>
                      <span className="tabular font-bold">{fmtSet(e.exercise.kind, s)}</span>
                      {s.e1rm ? <span className="tabular text-[12px] font-semibold text-faint">1RM {fmt(s.e1rm, 1)}</span> : null}
                      {prs.length > 0 && (
                        <span className="varnish ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" title={prs.map((p) => prLabel[p]).join(" · ")}>
                          <Trophy className="size-3" /> PR
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <WorkoutActions id={w.id} name={w.name} exercises={w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.map((s) => ({ type: s.type, weight: s.weightKg, reps: s.reps })) }))} />
    </div>
  );
}
