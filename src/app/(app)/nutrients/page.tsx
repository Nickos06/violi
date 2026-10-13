import Link from "next/link";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, isValidDay, today } from "@/lib/dates";
import { addMicros, asMicros, fiberTarget, microTargets, NUTRIENTS, type Micros, type Sex } from "@/lib/nutrients";
import { ageFromBirthYear } from "@/lib/nutrition";
import { Bar, Card, cn, fmt, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Nutrients" };

export default async function NutrientsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { d } = await searchParams;
  const single = isValidDay(d) ? d : null;
  const from = single ?? addDays(today(), -6);
  const to = single ?? today();

  const logs = await db.foodLog.findMany({ where: { userId: user.id, date: { gte: from, lte: to } } });
  const days = new Set(logs.map((l) => l.date)).size || 1;
  let micros: Micros = {};
  let fiber = 0, sugar = 0;
  for (const l of logs) { micros = addMicros(micros, asMicros(l.micros)); fiber += l.fiber; sugar += l.sugar; }
  const avg = (v: number) => v / days;
  const kcal = user.targetKcal ?? 2000;
  const targets = microTargets((user.sex ?? "male") as Sex, ageFromBirthYear(user.birthYear), kcal);
  // Share of logged items carrying micronutrient data — quick-adds and some products have none.
  const coverage = logs.length ? logs.filter((l) => Object.keys(asMicros(l.micros)).length > 3).length / logs.length : 0;

  const groups = [
    { key: "vitamin", title: t.progress.vitamins },
    { key: "mineral", title: t.progress.minerals },
    { key: "limit", title: t.progress.limits },
  ] as const;

  return (
    <div className="animate-rise">
      <PageHeader back={single ? `/today?d=${single}` : "/progress"} title={t.today.micros} subtitle={single ? single : t.progress.nutrients} />

      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        <Link href={`/nutrients?d=${today()}`} className={cn("flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold", single ? "bg-surface shadow" : "text-muted")}>{t.common.today}</Link>
        <Link href="/nutrients" className={cn("flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold", !single ? "bg-surface shadow" : "text-muted")}>{t.progress.days7}</Link>
      </div>

      {logs.length > 0 && coverage < 0.6 && (
        <p className="mt-3 rounded-xl bg-warn/10 px-3 py-2.5 text-[12px] text-warn">
          {locale === "el" ? `Μόνο το ${Math.round(coverage * 100)}% των καταγραφών έχει δεδομένα βιταμινών — οι τιμές μπορεί να είναι χαμηλότερες από τις πραγματικές.` : `Only ${Math.round(coverage * 100)}% of entries include vitamin data — values may read lower than reality.`}
        </p>
      )}

      <SectionTitle>{t.macros.fiber} & {t.macros.sugar}</SectionTitle>
      <Card className="space-y-4 p-5">
        <Row label={t.macros.fiber} value={avg(fiber)} target={fiberTarget(kcal)} unit="g" />
        <Row label={t.macros.sugar} value={avg(sugar)} target={Math.round((kcal * 0.1) / 4)} unit="g" limit />
      </Card>

      {groups.map((g) => (
        <div key={g.key}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card className="space-y-4 p-5">
            {NUTRIENTS.filter((n) => n.group === g.key).map((n) => (
              <Row key={n.key} label={locale === "el" ? n.el : n.en} value={avg(micros[n.key] ?? 0)} target={targets[n.key]} unit={n.unit} limit={n.group === "limit"} />
            ))}
          </Card>
        </div>
      ))}
      <p className="mt-4 px-1 text-[11px] text-faint">RDA/AI: NIH Office of Dietary Supplements · Dietary Guidelines for Americans.</p>
    </div>
  );
}

function Row({ label, value, target, unit, limit }: { label: string; value: number; target: number; unit: string; limit?: boolean }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const color = limit ? (pct > 100 ? "var(--bad)" : "var(--good)") : pct >= 100 ? "var(--good)" : pct >= 50 ? "var(--fiber)" : "var(--warn)";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted">
          <span className="font-semibold text-text">{fmt(value, value < 10 ? 1 : 0)}</span> / {fmt(target, target < 10 ? 1 : 0)} {unit}
          <span className="ml-2 inline-block w-10 text-right font-semibold" style={{ color }}>{Math.round(pct)}%</span>
        </span>
      </div>
      <Bar value={value} max={target} color={color} className="mt-1.5" />
    </div>
  );
}
