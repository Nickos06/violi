import Link from "next/link";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { trendSeries } from "@/lib/nutrition";
import { checkInStatus, exerciseKcalByDay } from "@/lib/plan";
import { exerciseBonus } from "@/lib/nutrition";
import { Card, IconTile, SectionTitle, fmt, cn } from "@/components/ui";
import { Leaf } from "lucide-react";
import { IntakeBars, WeightChart } from "@/components/charts";
import { WeighInButton } from "@/components/weigh-in";
import { CheckInCard } from "@/components/checkin-card";

export const metadata = { title: "Progress" };

const RANGES = { "30": 30, "90": 90, "365": 365 } as const;

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { r } = await searchParams;
  const range = RANGES[(r ?? "90") as keyof typeof RANGES] ?? 90;
  const from = addDays(today(), -range);

  const [weights, logs, checkIn, history] = await Promise.all([
    db.weightEntry.findMany({ where: { userId: user.id, date: { gte: addDays(from, -30) } }, orderBy: { date: "asc" } }),
    db.foodLog.groupBy({ by: ["date"], where: { userId: user.id, date: { gte: addDays(today(), -13) } }, _sum: { kcal: true } }),
    checkInStatus(user),
    db.checkIn.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const ex = await exerciseKcalByDay(user.id, addDays(today(), -13), today());
  const series = trendSeries(weights).filter((p) => p.date >= from);
  const latest = series.at(-1);
  const weekAgo = series.find((p) => p.date >= addDays(today(), -7));
  const weekly = latest && weekAgo ? latest.trend - weekAgo.trend : null;

  const kcalByDay = Object.fromEntries(logs.map((l) => [l.date, l._sum.kcal ?? 0]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today(), i - 13);
    return { date, kcal: kcalByDay[date] ?? 0, budget: (user.targetKcal ?? 2000) + exerciseBonus(ex[date] ?? 0, user.exerciseCreditPct).kcal };
  });
  const logged = days.filter((d) => d.kcal > 0);
  const avg = logged.length ? logged.reduce((s, d) => s + d.kcal, 0) / logged.length : 0;

  return (
    <div className="animate-rise">
      <header className="flex items-end justify-between pb-2 pt-4">
        <h1 className="font-display text-[34px] font-semibold">{t.progress.title}</h1>
        <WeighInButton last={weights.at(-1)?.weightKg} className="h-9 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-fg">+ {t.progress.logWeight}</WeighInButton>
      </header>

      {/* Weight */}
      <Card className="mt-3 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] text-muted">{t.progress.trend}</div>
            <div className="tabular text-3xl font-bold">{latest ? fmt(latest.trend, 1) : "—"} <span className="text-base font-medium text-muted">kg</span></div>
            {weekly !== null && (
              <div className={cn("tabular mt-0.5 text-[13px] font-semibold", (user.goalType === "gain" ? weekly >= 0 : weekly <= 0) ? "text-good" : "text-warn")}>
                {weekly > 0 ? "+" : ""}{fmt(weekly, 2)} kg {t.progress.weekly}
              </div>
            )}
          </div>
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["30", "90", "365"] as const).map((k) => (
              <Link key={k} href={`/progress?r=${k}`} className={cn("rounded-lg px-2.5 py-1 text-[12px] font-semibold", String(range) === k ? "bg-surface text-text shadow" : "text-muted")}>
                {k === "365" ? "1Y" : `${k}D`}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {series.length >= 2 ? <WeightChart points={series} locale={locale} /> : <p className="py-8 text-center text-[14px] text-faint">{t.progress.noWeights}</p>}
        </div>
      </Card>

      {/* Check-in */}
      <div id="checkin" className="scroll-mt-6">
        <SectionTitle>{t.progress.checkIn}</SectionTitle>
        <CheckInCard
          due={checkIn.due}
          daysUntil={checkIn.daysUntil}
          expenditure={user.expenditure ?? 0}
          last={checkIn.last ? { expenditure: checkIn.last.expenditure, prev: checkIn.last.prevExpenditure, target: checkIn.last.targetKcal, daysLogged: checkIn.last.daysLogged, weeklyChangeKg: checkIn.last.weeklyChangeKg } : null}
        />
      </div>

      {/* Expenditure + targets */}
      <SectionTitle>{t.progress.targets}</SectionTitle>
      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
        {[
          { l: t.progress.expenditure, v: `${fmt(user.expenditure ?? 0)}`, u: "kcal" },
          { l: t.macros.calories, v: fmt(user.targetKcal ?? 0), u: "kcal" },
          { l: t.macros.protein, v: fmt(user.targetProtein ?? 0), u: "g", c: "var(--protein)" },
          { l: `${t.macros.carbs} / ${t.macros.fat}`, v: `${fmt(user.targetCarbs ?? 0)}/${fmt(user.targetFat ?? 0)}`, u: "g" },
        ].map((x) => (
          <div key={x.l} className="bg-surface p-4">
            <div className="truncate text-[12px] text-muted">{x.l}</div>
            <div className="tabular mt-1 text-xl font-bold" style={x.c ? { color: x.c } : undefined}>{x.v} <span className="text-[12px] font-normal text-muted">{x.u}</span></div>
          </div>
        ))}
      </Card>
      <p className="mt-2 px-1 text-[12px] text-faint">{t.progress.expenditureD} <Link href="/settings#goals" className="font-semibold text-accent">{t.progress.editGoal} →</Link></p>

      {/* Intake */}
      <SectionTitle>{t.progress.intake} · 14 {locale === "el" ? "ημέρες" : "days"}</SectionTitle>
      <Card className="p-5">
        <div className="mb-3 flex items-baseline justify-between text-[13px]">
          <span className="text-muted">Ø</span>
          <span className="tabular font-semibold">{fmt(avg)} kcal</span>
        </div>
        <IntakeBars days={days} target={user.targetKcal ?? 2000} locale={locale} />
      </Card>

      <Link href="/nutrients" className="card mt-3 flex items-center justify-between p-4 transition hover:bg-surface-2">
        <span className="flex items-center gap-3 font-bold"><IconTile tone="var(--fiber)" size={36}><Leaf className="size-[18px]" /></IconTile>{t.progress.nutrients}</span>
        <span className="text-muted">›</span>
      </Link>

      {history.length > 0 && (
        <>
          <SectionTitle>{t.progress.history}</SectionTitle>
          <Card className="divide-y divide-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 text-[14px]">
                <span className="text-muted">{new Date(`${h.date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" })}</span>
                <span className="tabular">{fmt(h.expenditure)} kcal</span>
                <span className="tabular font-semibold">{fmt(h.targetKcal)} kcal</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
