import Link from "next/link";
import { BarChart3, BookOpen, Calculator, ChevronRight, Circle, Footprints, Play, Plus, Trophy } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { today, weekStart } from "@/lib/dates";
import { fmtClock } from "@/lib/gym";
import { Card, Empty, fmt, IconTile, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { StartWorkoutButton } from "@/components/gym/live-banner";

export const metadata = { title: "Gym" };

export default async function GymPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const [routines, recent, week] = await Promise.all([
    db.routine.findMany({
      where: { userId: user.id }, orderBy: { updatedAt: "desc" },
      include: { exercises: { orderBy: { position: "asc" }, include: { exercise: { select: { name: true, nameEl: true } } } } },
    }),
    db.gymWorkout.findMany({
      where: { userId: user.id }, orderBy: { startedAt: "desc" }, take: 8,
      include: { exercises: { orderBy: { position: "asc" }, include: { exercise: { select: { name: true, nameEl: true } }, _count: { select: { sets: true } } } } },
    }),
    db.gymWorkout.aggregate({ where: { userId: user.id, date: { gte: weekStart(today()) } }, _count: true, _sum: { volumeKg: true, setsCount: true, durationSec: true } }),
  ]);
  const exName = (e: { name: string; nameEl: string | null }) => (locale === "el" && e.nameEl ? e.nameEl : e.name);

  return (
    <div className="animate-rise">
      <PageHeader title={t.gym.title} subtitle={t.gym.subtitle} />

      <StartWorkoutButton label={t.gym.startEmpty} resumeLabel={`${t.gym.resume} · ${t.gym.inProgress}`} />
      <Link href="/record" className="card press mt-2 flex h-14 items-center gap-3 px-4 text-[15px] font-bold">
        <Circle className="size-3.5" fill="currentColor" strokeWidth={0} />
        <span className="flex-1">{t.record.record} · <span className="font-semibold text-muted">{locale === "el" ? "τρέξιμο, ποδήλατο και άλλα" : "run, ride and more"}</span></span>
        <ChevronRight className="size-4 text-faint" />
      </Link>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { href: "/gym/exercises", icon: BookOpen, l: t.gym.exercises },
          { href: "/gym/stats", icon: BarChart3, l: t.gym.stats },
          { href: "/gym/tools", icon: Calculator, l: t.gym.tools },
          { href: "/workouts", icon: Footprints, l: t.gym.activities },
        ].map(({ href, icon: Icon, l }) => (
          <Link key={href} href={href} className="card press flex flex-col items-center gap-1.5 px-1 py-3 text-center">
            <Icon className="size-5" />
            <span className="w-full truncate text-[11.5px] font-bold">{l}</span>
          </Link>
        ))}
      </div>

      <SectionTitle>{t.gym.thisWeek}</SectionTitle>
      <Card className="grid grid-cols-3 divide-x divide-border">
        {[
          { l: t.gym.workouts, v: String(week._count) },
          { l: t.gym.volume, v: `${fmt((week._sum.volumeKg ?? 0) / 1000, 1)} t` },
          { l: t.gym.duration, v: fmtClock(week._sum.durationSec ?? 0) },
        ].map((x) => (
          <div key={x.l} className="px-3 py-4 text-center">
            <div className="tabular text-[20px] font-extrabold">{x.v}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{x.l}</div>
          </div>
        ))}
      </Card>

      <SectionTitle action={<Link href="/gym/routines/new" className="flex items-center gap-1 text-[13px] font-bold"><Plus className="size-4" strokeWidth={2.6} /> {t.gym.newRoutine}</Link>}>
        {t.gym.routines}
      </SectionTitle>
      {routines.length === 0 ? (
        <Card><Empty title={t.gym.noRoutines}><LinkButton href="/gym/routines/new" size="sm" className="mt-1"><Plus className="size-4" /> {t.gym.newRoutine}</LinkButton></Empty></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {routines.map((r) => (
            <div key={r.id} className="card flex flex-col p-4">
              <Link href={`/gym/routines/${r.id}`} className="min-w-0">
                <div className="truncate text-[16px] font-extrabold">{r.name}</div>
                <p className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug text-faint">{r.exercises.map((e) => exName(e.exercise)).join(" · ")}</p>
              </Link>
              <div className="mt-3 flex gap-2">
                <Link href={`/gym/workout?routine=${r.id}`} className="press varnish flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-bold">
                  <Play className="size-4" fill="currentColor" /> {t.gym.start}
                </Link>
                <Link href={`/gym/routines/${r.id}`} className="press edge flex h-10 items-center rounded-xl px-3.5 text-[13px] font-bold">{t.common.edit}</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>{t.gym.history}</SectionTitle>
      {recent.length === 0 ? (
        <Card><Empty title={t.gym.noHistory} /></Card>
      ) : (
        <div className="space-y-3">
          {recent.map((w) => (
            <Link key={w.id} href={`/gym/history/${w.id}`} className="card press block p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15.5px] font-extrabold">{w.name}</div>
                  <div className="text-[12px] font-semibold capitalize text-faint">
                    {w.startedAt.toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                </div>
                <ChevronRight className="mt-1 size-4 text-faint" />
              </div>
              <div className="tabular mt-3 flex gap-4 text-[12.5px] font-bold">
                <span>{fmtClock(w.durationSec)}</span>
                <span>{fmt(w.volumeKg)} kg</span>
                <span>{w.setsCount} {t.gym.sets.toLowerCase()}</span>
                {w.prCount > 0 && <span className="flex items-center gap-1"><Trophy className="size-3.5" /> {w.prCount}</span>}
              </div>
              <ul className="mt-2.5 space-y-0.5 border-t border-border pt-2.5 text-[12.5px] font-semibold text-muted">
                {w.exercises.slice(0, 4).map((e) => (
                  <li key={e.id} className="truncate">{e._count.sets} × {exName(e.exercise)}</li>
                ))}
                {w.exercises.length > 4 && <li className="text-faint">+{w.exercises.length - 4}</li>}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
