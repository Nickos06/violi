import Link from "next/link";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, today, weekStart } from "@/lib/dates";
import { fmtClock, MUSCLE_LABEL, type Muscle } from "@/lib/gym";
import { muscleDistribution } from "@/lib/gym-server";
import { Card, cn, fmt, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Statistics" };

export default async function GymStatsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const L = locale === "el" ? "el" : "en";
  const { r } = await searchParams;
  const days = r === "90" ? 90 : r === "365" ? 365 : 30;
  const [dist, workouts, totals] = await Promise.all([
    muscleDistribution(user.id, days),
    db.gymWorkout.findMany({ where: { userId: user.id, date: { gte: addDays(weekStart(today()), -7 * 11) } }, select: { date: true } }),
    db.gymWorkout.aggregate({ where: { userId: user.id, date: { gte: addDays(today(), -days + 1) } }, _count: true, _sum: { volumeKg: true, setsCount: true, durationSec: true } }),
  ]);
  const muscles = (Object.entries(dist) as [Muscle, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxSets = Math.max(1, ...muscles.map(([, v]) => v));
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(weekStart(today()), -7 * (11 - i)));
  const perWeek = weeks.map((w) => workouts.filter((x) => x.date >= w && x.date < addDays(w, 7)).length);
  const maxWeek = Math.max(1, ...perWeek);

  return (
    <div className="animate-rise">
      <PageHeader back="/gym" title={t.gym.stats} />
      <div className="edge flex gap-1 rounded-2xl p-1">
        {(["30", "90", "365"] as const).map((k) => (
          <Link key={k} href={`/gym/stats?r=${k}`} className={cn("press flex-1 rounded-xl py-2 text-center text-[13px] font-bold", String(days) === k ? "varnish" : "text-muted")}>
            {k === "365" ? "1Y" : `${k}D`}
          </Link>
        ))}
      </div>

      <Card className="mt-4 grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {[
          { l: t.gym.workouts, v: String(totals._count) },
          { l: t.gym.volume, v: `${fmt((totals._sum.volumeKg ?? 0) / 1000, 1)} t` },
          { l: t.gym.sets, v: String(totals._sum.setsCount ?? 0) },
          { l: t.gym.duration, v: fmtClock(totals._sum.durationSec ?? 0) },
        ].map((x) => (
          <div key={x.l} className="px-3 py-4 text-center">
            <div className="tabular text-[20px] font-extrabold">{x.v}</div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint">{x.l}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>{t.gym.muscleDist}</SectionTitle>
      <Card className="space-y-3 p-5">
        {muscles.length === 0 && <p className="text-[14px] text-muted">{t.gym.noHistory}</p>}
        {muscles.map(([m, v]) => (
          <div key={m}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">{MUSCLE_LABEL[m][L]}</span>
              <span className="tabular font-extrabold">{fmt(v, 1)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
              <div className="varnish h-full rounded-full" style={{ width: `${(v / maxSets) * 100}%` }} />
            </div>
          </div>
        ))}
      </Card>

      <SectionTitle>{t.gym.perWeek}</SectionTitle>
      <Card className="p-5">
        <div className="flex h-36 items-end gap-1.5">
          {perWeek.map((n, i) => (
            <div key={weeks[i]} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="tabular text-[10.5px] font-bold text-muted">{n || ""}</span>
              <div className={cn("w-full rounded-md", n ? "varnish" : "bg-surface-3")} style={{ height: `${Math.max(4, (n / maxWeek) * 100)}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] font-semibold text-faint">
          <span>{new Date(`${weeks[0]}T12:00:00`).toLocaleDateString(L === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" })}</span>
          <span>{t.common.today}</span>
        </div>
      </Card>
    </div>
  );
}
