import Link from "next/link";
import { ChevronLeft, ChevronRight, Scale, Sparkles } from "lucide-react";
import { requireUser, getT } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, isValidDay, today } from "@/lib/dates";
import { budgetForDay, checkInStatus, daySummary } from "@/lib/plan";
import { liveStreak, settleDays } from "@/lib/gamification";
import { levelFromXp, rankForLevel } from "@/lib/levels";
import { NUTRIENTS } from "@/lib/nutrients";
import { Bar, Card, Ring, SectionTitle, fmt } from "@/components/ui";
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
  const [{ logs, activities, daily, budget, totals, microTargets }, checkIn, weighedToday] = await Promise.all([
    daySummary(fresh, date),
    checkInStatus(fresh),
    db.weightEntry.findUnique({ where: { userId_date: { userId: user.id, date: today() } } }),
  ]);

  const remaining = Math.round(budget.kcal - totals.kcal);
  const over = remaining < 0;
  const lv = levelFromXp(fresh.xp);
  const rank = rankForLevel(lv.level);
  const streak = liveStreak(fresh);
  const label = isToday ? t.common.today : date === addDays(today(), -1) ? t.common.yesterday
    : new Date(`${date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "short" });

  const macros = [
    { key: "protein", label: t.macros.protein, v: totals.protein, max: budget.protein, color: "var(--protein)" },
    { key: "carbs", label: t.macros.carbs, v: totals.carbs, max: budget.carbs, color: "var(--carbs)" },
    { key: "fat", label: t.macros.fat, v: totals.fat, max: budget.fat, color: "var(--fat)" },
  ];
  const highlight = NUTRIENTS.filter((n) => ["vitC", "vitD", "calcium", "iron", "magnesium", "potassium"].includes(n.key));

  return (
    <div className="animate-rise">
      {/* Date + status row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={`/today?d=${addDays(date, -1)}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Previous day">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="min-w-24 text-center text-[17px] font-semibold capitalize">{label}</h1>
          {isToday ? <span className="size-9" /> : (
            <Link href={`/today?d=${addDays(date, 1)}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Next day">
              <ChevronRight className="size-5" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-[13px] font-semibold">
            🔥 <span className="tabular">{streak}</span>
          </span>
          <Link href={`/u/${fresh.username}`} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold" style={{ color: rank.color, background: `${rank.color}1f` }}>
            Lv {lv.level}
          </Link>
        </div>
      </div>

      {/* Calorie ring */}
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-5">
          <Ring value={totals.kcal} max={budget.kcal} size={164} stroke={14} color={over ? "var(--bad)" : "var(--accent)"}>
            <div>
              <div className="tabular text-[34px] font-bold leading-none">{fmt(Math.abs(remaining))}</div>
              <div className="mt-1 text-[12px] text-muted">{over ? t.today.over : t.today.remaining}</div>
            </div>
          </Ring>
          <div className="flex-1 space-y-3">
            <Stat label={t.today.budget} value={budget.baseKcal} />
            <Stat label={t.today.eaten} value={totals.kcal} />
            <Stat label={t.today.burned} value={budget.exerciseBonus} prefix="+" color="var(--good)" hint={budget.exerciseKcal > 0 ? `${fresh.exerciseCreditPct}% ${t.common.of} ${fmt(budget.exerciseKcal)}` : undefined} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {macros.map((m) => (
            <div key={m.key}>
              <Bar value={m.v} max={m.max} color={m.color} over={m.v > m.max * 1.1} />
              <div className="mt-2 text-[12px] text-muted">{m.label}</div>
              <div className="tabular text-[14px] font-semibold">
                {fmt(m.v)}<span className="font-normal text-muted"> / {fmt(m.max)}g</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Nudges */}
      {isToday && (checkIn.due || !weighedToday) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {checkIn.due && (
            <Link href="/progress#checkin" className="card flex items-center gap-3 p-4 transition hover:bg-surface-2">
              <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles className="size-5" /></div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{t.today.checkInDue}</div>
                <div className="text-[12px] text-muted">{t.today.checkInDueD}</div>
              </div>
            </Link>
          )}
          {!weighedToday && (
            <WeighInButton className="card flex items-center gap-3 p-4 text-left transition hover:bg-surface-2">
              <div className="grid size-10 place-items-center rounded-xl bg-surface-2"><Scale className="size-5" /></div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{t.today.weighIn}</div>
                <div className="text-[12px] text-muted">{t.today.weighInD}</div>
              </div>
            </WeighInButton>
          )}
        </div>
      )}

      {/* Meals */}
      {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          date={date}
          canShare={fresh.shareMeals}
          defaultVisibility={fresh.defaultVisibility}
          logs={logs.filter((l) => l.meal === meal).map((l) => ({
            id: l.id, name: l.name, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat, source: l.source, photoUrl: l.photoUrl,
          }))}
        />
      ))}

      {/* Exercise */}
      <SectionTitle action={<Link href="/workouts" className="text-[13px] font-semibold text-accent">{t.common.seeAll}</Link>}>{t.today.exercise}</SectionTitle>
      <ExerciseCard
        date={date}
        steps={daily?.steps ?? null}
        activities={activities.map((a) => ({ id: a.id, type: a.type, name: a.name, source: a.source, durationSec: a.durationSec, distanceM: a.distanceM, kcal: a.kcal }))}
      />

      {/* Micronutrients */}
      <SectionTitle action={<Link href={`/nutrients?d=${date}`} className="text-[13px] font-semibold text-accent">{t.today.viewAll}</Link>}>{t.today.micros}</SectionTitle>
      <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
        {highlight.map((n) => {
          const v = totals.micros[n.key] ?? 0;
          const target = microTargets[n.key];
          return (
            <div key={n.key}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="truncate text-muted">{locale === "el" ? n.el : n.en}</span>
                <span className="tabular font-semibold">{Math.round((v / target) * 100)}%</span>
              </div>
              <Bar value={v} max={target} color="var(--fiber)" className="mt-1.5" />
            </div>
          );
        })}
        <div>
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="text-muted">{t.macros.fiber}</span>
            <span className="tabular font-semibold">{fmt(totals.fiber)}/{budget.fiber}g</span>
          </div>
          <Bar value={totals.fiber} max={budget.fiber} color="var(--fiber)" className="mt-1.5" />
        </div>
      </Card>

      <p className="mt-6 text-center text-[12px] text-faint">
        Lv {lv.level} · {t.ranks[rank.key]} · {fmt(lv.current)}/{fmt(lv.needed)} XP
      </p>
    </div>
  );
}

function Stat({ label, value, prefix = "", color, hint }: { label: string; value: number; prefix?: string; color?: string; hint?: string }) {
  return (
    <div>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="tabular text-[17px] font-semibold" style={color ? { color } : undefined}>
        {prefix}{fmt(value)} <span className="text-[12px] font-normal text-muted">kcal</span>
      </div>
      {hint && <div className="text-[11px] text-faint">{hint}</div>}
    </div>
  );
}
