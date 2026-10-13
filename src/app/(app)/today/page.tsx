import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, Scale, Sparkles, ArrowUpRight } from "lucide-react";
import { requireUser, getT } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, isValidDay, today } from "@/lib/dates";
import { budgetForDay, checkInStatus, daySummary } from "@/lib/plan";
import { liveStreak, settleDays } from "@/lib/gamification";
import { levelFromXp, rankForLevel } from "@/lib/levels";
import { NUTRIENTS } from "@/lib/nutrients";
import { Bar, Card, IconTile, Ring, SectionTitle, fmt, cn } from "@/components/ui";
import { MealSection } from "@/components/meal-section";
import { ExerciseCard } from "@/components/exercise-card";
import { WeighInButton } from "@/components/weigh-in";

export const metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { d } = await searchParams;
  const date = isValidDay(d) && d <= today() ? d : today();
  const isToday = date === today();

  await settleDays(user.id, (day) => budgetForDay(user, day));
  const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const [{ logs, activities, daily, budget, totals, microTargets }, checkIn, weighedToday, savedMeals] = await Promise.all([
    daySummary(fresh, date),
    checkInStatus(fresh),
    db.weightEntry.findUnique({ where: { userId_date: { userId: user.id, date: today() } } }),
    db.savedMeal.count({ where: { userId: user.id } }),
  ]);

  const remaining = Math.round(budget.kcal - totals.kcal);
  const over = remaining < 0;
  const lv = levelFromXp(fresh.xp);
  const rank = rankForLevel(lv.level);
  const streak = liveStreak(fresh);
  const dateLabel = isToday ? t.common.today : date === addDays(today(), -1) ? t.common.yesterday
    : new Date(`${date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
  const longDate = new Date(`${date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  const macros = [
    { key: "protein", label: t.macros.protein, v: totals.protein, max: budget.protein, color: "var(--protein)" },
    { key: "carbs", label: t.macros.carbs, v: totals.carbs, max: budget.carbs, color: "var(--carbs)" },
    { key: "fat", label: t.macros.fat, v: totals.fat, max: budget.fat, color: "var(--fat)" },
  ];
  const highlight = NUTRIENTS.filter((n) => ["vitC", "vitD", "calcium", "iron", "magnesium", "potassium"].includes(n.key));

  return (
    <div className="stagger">
      {/* Date + status */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="edge flex items-center rounded-full p-1">
          <Link href={`/today?d=${addDays(date, -1)}`} className="press grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Previous day">
            <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
          </Link>
          <span className="min-w-[84px] px-1 text-center text-[14px] font-bold capitalize">{dateLabel}</span>
          <Link
            href={`/today?d=${addDays(date, 1)}`}
            aria-disabled={isToday}
            className={cn("press grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text", isToday && "pointer-events-none opacity-25")}
            aria-label="Next day"
          >
            <ChevronRight className="size-[18px]" strokeWidth={2.4} />
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-bold", streak > 0 ? "varnish" : "bg-surface-2 text-faint")}>
            <Flame className="size-4" strokeWidth={2.4} fill={streak > 0 ? "currentColor" : "none"} />
            <span className="tabular">{streak}</span>
          </span>
          <Link href={`/u/${fresh.username}`} className="edge-strong press flex h-9 items-center rounded-full px-3 text-[13px] font-extrabold">
            Lv {lv.level}
          </Link>
        </div>
      </div>

      {/* Energy hero */}
      <Card className="relative mt-4 overflow-hidden p-5 sm:p-6">
        <p className="text-[12px] font-bold capitalize text-muted">{longDate}</p>
        <div className="mt-3 flex items-center gap-5">
          <Ring value={totals.kcal} max={budget.kcal} size={156} stroke={13} color={over ? "var(--bad)" : undefined}>
            <div>
              <div className={cn("font-display tabular text-[40px] font-semibold leading-none", over ? "text-bad" : "text-chrome")}>{fmt(Math.abs(remaining))}</div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{over ? t.today.over : t.today.remaining}</div>
            </div>
          </Ring>
          <dl className="flex-1 space-y-3.5">
            <Stat label={t.today.budget} value={budget.baseKcal} />
            <Stat label={t.today.eaten} value={totals.kcal} />
            <Stat
              label={t.today.burned}
              value={budget.exerciseBonus}
              prefix="+"
              color="var(--good)"
              hint={budget.exerciseKcal > 0 ? `${fresh.exerciseCreditPct}% · ${fmt(budget.exerciseKcal)}` : undefined}
            />
          </dl>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {macros.map((m) => (
            <div key={m.key} className="rounded-2xl bg-surface-2/70 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-muted">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: m.color }} />
                <span className="truncate">{m.label}</span>
              </div>
              <div className="tabular mt-1 text-[15px] font-extrabold">
                {fmt(m.v)}<span className="text-[12px] font-semibold text-faint">/{fmt(m.max)}g</span>
              </div>
              <Bar value={m.v} max={m.max} color={m.color} over={m.v > m.max * 1.15} className="mt-2 h-[5px]" />
            </div>
          ))}
        </div>
      </Card>

      {/* Nudges */}
      {isToday && (checkIn.due || !weighedToday) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {checkIn.due && (
            <Link href="/progress#checkin" className="card press flex items-center gap-3.5 p-4">
              <IconTile><Sparkles className="size-5" /></IconTile>
              <div className="min-w-0">
                <div className="text-[14px] font-bold">{t.today.checkInDue}</div>
                <div className="text-[12.5px] leading-snug text-muted">{t.today.checkInDueD}</div>
              </div>
            </Link>
          )}
          {!weighedToday && (
            <WeighInButton className="card press flex items-center gap-3.5 p-4 text-left">
              <IconTile tone="var(--protein)"><Scale className="size-5" /></IconTile>
              <div className="min-w-0">
                <div className="text-[14px] font-bold">{t.today.weighIn}</div>
                <div className="text-[12.5px] leading-snug text-muted">{t.today.weighInD}</div>
              </div>
            </WeighInButton>
          )}
        </div>
      )}

      {/* Meals */}
      <div>
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            date={date}
            canShare={fresh.shareMeals}
            hasSavedMeals={savedMeals > 0}
            defaultVisibility={fresh.defaultVisibility}
            logs={logs.filter((l) => l.meal === meal).map((l) => ({
              id: l.id, name: l.name, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat, source: l.source, photoUrl: l.photoUrl,
            }))}
          />
        ))}
      </div>

      {/* Exercise */}
      <div>
        <SectionTitle action={<Link href="/workouts" className="text-[13px] font-bold text-accent">{t.common.seeAll}</Link>}>{t.today.exercise}</SectionTitle>
        <ExerciseCard
          date={date}
          steps={daily?.steps ?? null}
          activities={activities.map((a) => ({ id: a.id, type: a.type, name: a.name, source: a.source, durationSec: a.durationSec, distanceM: a.distanceM, kcal: a.kcal }))}
        />
      </div>

      {/* Micronutrients */}
      <div>
        <SectionTitle action={<Link href={`/nutrients?d=${date}`} className="text-[13px] font-bold text-accent">{t.today.viewAll}</Link>}>{t.today.micros}</SectionTitle>
        <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
          {highlight.map((n) => {
            const v = totals.micros[n.key] ?? 0;
            const target = microTargets[n.key];
            const pct = Math.round((v / target) * 100);
            return (
              <div key={n.key}>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="truncate font-semibold text-muted">{locale === "el" ? n.el : n.en}</span>
                  <span className={cn("tabular font-extrabold", pct >= 100 && "text-good")}>{pct}%</span>
                </div>
                <Bar value={v} max={target} color="var(--fiber)" className="mt-1.5 h-[5px]" />
              </div>
            );
          })}
          <div>
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="font-semibold text-muted">{t.macros.fiber}</span>
              <span className="tabular font-extrabold">{fmt(totals.fiber)}/{budget.fiber}g</span>
            </div>
            <Bar value={totals.fiber} max={budget.fiber} color="var(--fiber)" className="mt-1.5 h-[5px]" />
          </div>
        </Card>
      </div>

      {/* Level */}
      <Link href={`/u/${fresh.username}`} className="card press mt-8 flex items-center gap-4 p-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl text-[15px] font-black" style={{ color: rank.color, background: `color-mix(in oklab, ${rank.color} 15%, transparent)` }}>
          {lv.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-bold">{t.ranks[rank.key]} · {t.profile.level} {lv.level}</span>
            <span className="tabular text-[12px] font-semibold text-muted">{fmt(lv.current)}/{fmt(lv.needed)} XP</span>
          </div>
          <Bar value={lv.current} max={lv.needed} color={rank.color} className="mt-2" />
        </div>
        <ArrowUpRight className="size-4 text-faint" />
      </Link>
    </div>
  );
}

function Stat({ label, value, prefix = "", color, hint }: { label: string; value: number; prefix?: string; color?: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</dt>
      <dd className="tabular text-[19px] font-extrabold leading-tight" style={color ? { color } : undefined}>
        {prefix}{fmt(value)} <span className="text-[12px] font-semibold text-faint">kcal</span>
        {hint && <span className="block text-[11px] font-semibold text-faint">{hint}</span>}
      </dd>
    </div>
  );
}
