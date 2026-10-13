import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EQUIPMENT_LABEL, fmtKg, fmtSet, MUSCLE_LABEL, setVolume, type Muscle } from "@/lib/gym";
import { exerciseHistory } from "@/lib/gym-server";
import { Card, Empty, fmt, PageHeader, SectionTitle } from "@/components/ui";
import { ProgressChart } from "./progress-chart";

export const metadata = { title: "Exercise" };

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const L = locale === "el" ? "el" : "en";
  const { id } = await params;
  const ex = await db.exercise.findFirst({ where: { id, OR: [{ createdById: null }, { createdById: user.id }] } });
  if (!ex) notFound();
  const sessions = await exerciseHistory(user.id, ex.id);

  // Per-session metrics (oldest → newest) and all-time records.
  const points = [...sessions].reverse().map((s) => {
    const work = s.sets.filter((x) => x.type !== "warmup");
    return {
      date: s.workout.date,
      e1rm: Math.max(0, ...work.map((x) => x.e1rm ?? 0)),
      weight: Math.max(0, ...work.map((x) => x.weightKg ?? 0)),
      volume: work.reduce((v, x) => v + setVolume(ex.kind, x.weightKg, x.reps), 0),
      reps: Math.max(0, ...work.map((x) => x.reps ?? 0)),
    };
  });
  const all = sessions.flatMap((s) => s.sets.filter((x) => x.type !== "warmup"));
  const heaviest = all.reduce<(typeof all)[number] | null>((b, x) => (!b || (x.weightKg ?? 0) > (b.weightKg ?? 0) ? x : b), null);
  const best1 = all.reduce<(typeof all)[number] | null>((b, x) => (!b || (x.e1rm ?? 0) > (b.e1rm ?? 0) ? x : b), null);
  const bestVol = all.reduce<(typeof all)[number] | null>((b, x) => (!b || setVolume(ex.kind, x.weightKg, x.reps) > setVolume(ex.kind, b.weightKg, b.reps) ? x : b), null);
  const mostReps = all.reduce<(typeof all)[number] | null>((b, x) => (!b || (x.reps ?? 0) > (b.reps ?? 0) ? x : b), null);
  const weighted = ex.kind === "weight_reps" || ex.kind === "weighted_bodyweight";

  return (
    <div className="animate-rise">
      <PageHeader
        back="/gym/exercises"
        title={L === "el" && ex.nameEl ? ex.nameEl : ex.name}
        subtitle={`${MUSCLE_LABEL[ex.muscle as Muscle]?.[L] ?? ex.muscle} · ${EQUIPMENT_LABEL[ex.equipment as keyof typeof EQUIPMENT_LABEL]?.[L] ?? ex.equipment}`}
      />
      {sessions.length === 0 ? (
        <Card><Empty icon={<Trophy className="size-6" />} title={t.gym.noHistory} /></Card>
      ) : (
        <>
          {weighted && <ProgressChart points={points} />}
          <SectionTitle>{t.gym.prs}</SectionTitle>
          <Card className="divide-y divide-border">
            {(weighted
              ? [
                  { l: t.gym.heaviest, v: heaviest ? `${fmtKg(heaviest.weightKg ?? 0)} kg` : "—", d: heaviest?.date },
                  { l: t.gym.best1rm, v: best1?.e1rm ? `${fmt(best1.e1rm, 1)} kg` : "—", d: best1?.date },
                  { l: t.gym.bestVolume, v: bestVol ? `${fmtSet(ex.kind, bestVol)} · ${fmt(setVolume(ex.kind, bestVol.weightKg, bestVol.reps))} kg` : "—", d: bestVol?.date },
                ]
              : [{ l: t.gym.mostReps, v: mostReps ? String(mostReps.reps ?? 0) : "—", d: mostReps?.date }]
            ).map((r) => (
              <div key={r.l} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-muted"><Trophy className="size-4 text-text" /> {r.l}</span>
                <span className="text-right">
                  <span className="tabular block text-[15px] font-extrabold">{r.v}</span>
                  {r.d && <span className="block text-[11px] font-semibold text-faint">{new Date(`${r.d}T12:00:00`).toLocaleDateString(L === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </span>
              </div>
            ))}
          </Card>

          <SectionTitle>{t.gym.history} · {sessions.length} {t.gym.sessions.toLowerCase()}</SectionTitle>
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[14.5px] font-extrabold">{s.workout.name}</span>
                  <span className="shrink-0 text-[12px] font-semibold text-faint">{s.workout.startedAt.toLocaleDateString(L === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" })}</span>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {s.sets.map((x, i) => (
                    <li key={x.id} className="tabular flex items-center gap-3 text-[13.5px]">
                      <span className="w-5 text-center text-[11.5px] font-black text-muted">{x.type === "warmup" ? "W" : x.type === "failure" ? "F" : x.type === "drop" ? "D" : i + 1}</span>
                      <span className="font-bold">{fmtSet(ex.kind, x)}</span>
                      {x.e1rm ? <span className="text-[12px] font-semibold text-faint">1RM {fmt(x.e1rm, 1)}</span> : null}
                      {x.prs && <Trophy className="ml-auto size-3.5" />}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
