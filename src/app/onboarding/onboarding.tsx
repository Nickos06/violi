"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Beef, Check, Flame, Leaf, Salad, Scale, Dumbbell, Droplet, type LucideIcon } from "lucide-react";
import { completeOnboarding } from "@/app/actions/profile";
import { useT } from "@/components/i18n-provider";
import { Button, cn, Field, IconTile, Input, Ring } from "@/components/ui";
import { BrandMark } from "@/components/logo";
import { computeTargets, initialExpenditure, type ActivityLevel, type DietType, type GoalType } from "@/lib/nutrition";

const ACTIVITY: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const DIETS: DietType[] = ["balanced", "high_protein", "low_carb", "keto", "plant"];
const RATES = { lose: [0.25, 0.5, 0.75, 1], gain: [0.1, 0.25, 0.5] } as const;

/** `profile` prefills what is already known about the user (e.g. an account set up for them). */
export function Onboarding({ name, profile }: { name: string; profile?: { sex: string | null; birthYear: number | null; heightCm: number | null } }) {
  const { t } = useT();
  const o = t.onboarding;
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [s, setS] = useState({
    goalType: "lose" as GoalType, sex: (profile?.sex === "female" ? "female" : "male") as "male" | "female",
    birthYear: String(profile?.birthYear ?? 1995), heightCm: String(profile?.heightCm ?? 175), weightKg: "80",
    targetWeightKg: "", activityLevel: "light" as ActivityLevel, goalRatePct: 0.5, dietType: "balanced" as DietType,
  });
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));

  const plan = useMemo(() => {
    const p = {
      sex: s.sex, weightKg: Number(s.weightKg) || 75, heightCm: Number(s.heightCm) || 175,
      age: new Date().getFullYear() - (Number(s.birthYear) || 1995), activityLevel: s.activityLevel,
    };
    const expenditure = initialExpenditure(p);
    return { expenditure, ...computeTargets({ ...p, expenditure, goal: s.goalType, ratePct: s.goalType === "maintain" ? 0 : s.goalRatePct, diet: s.dietType }) };
  }, [s]);

  const steps = ["goal", "about", "activity", "rate", "diet", "plan"].filter((x) => !(x === "rate" && s.goalType === "maintain"));
  const current = steps[step];
  const aboutValid = Number(s.birthYear) > 1920 && Number(s.heightCm) >= 120 && Number(s.weightKg) >= 30;
  const next = () => setStep((n) => Math.min(steps.length - 1, n + 1));

  const finish = () =>
    start(() =>
      completeOnboarding({
        goalType: s.goalType, sex: s.sex, birthYear: Number(s.birthYear), heightCm: Number(s.heightCm), weightKg: Number(s.weightKg),
        targetWeightKg: s.targetWeightKg ? Number(s.targetWeightKg) : undefined, activityLevel: s.activityLevel,
        goalRatePct: s.goalRatePct, dietType: s.dietType,
      }),
    );

  const Option = ({ active, onClick, title, desc, icon: Icon, tone }: { active: boolean; onClick: () => void; title: string; desc?: string; icon?: LucideIcon; tone?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn("press flex w-full items-center gap-4 rounded-[20px] border p-4 text-left transition-colors", active ? "border-accent/60 bg-accent-soft" : "border-border bg-surface hover:bg-surface-2")}
    >
      {Icon && <IconTile tone={tone} size={44}><Icon className="size-5" strokeWidth={2.2} /></IconTile>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {desc && <span className="mt-0.5 block text-[13px] text-muted">{desc}</span>}
      </span>
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border transition-colors", active ? "varnish border-transparent" : "border-border-strong")}>
        {active && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label={t.common.back}>
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <BrandMark height={26} />
        )}
        <div className="flex flex-1 gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-surface-3")} />
          ))}
        </div>
      </div>

      <div key={current} className="animate-rise mt-10 flex-1">
        {current === "goal" && (
          <>
            <p className="text-[15px] font-semibold text-muted">{name},</p>
            <h1 className="font-display mt-1 text-[34px] font-semibold leading-tight">{o.goal}</h1>
            <div className="mt-6 space-y-3">
              <Option icon={Flame} tone="var(--accent)" active={s.goalType === "lose"} onClick={() => { set("goalType", "lose"); set("goalRatePct", 0.5); }} title={o.lose} desc={o.loseD} />
              <Option icon={Scale} tone="var(--protein)" active={s.goalType === "maintain"} onClick={() => set("goalType", "maintain")} title={o.maintain} desc={o.maintainD} />
              <Option icon={Dumbbell} tone="var(--fat)" active={s.goalType === "gain"} onClick={() => { set("goalType", "gain"); set("goalRatePct", 0.25); }} title={o.gain} desc={o.gainD} />
            </div>
          </>
        )}

        {current === "about" && (
          <>
            <h1 className="font-display text-[34px] font-semibold leading-tight">{o.about}</h1>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
                {(["male", "female"] as const).map((x) => (
                  <button key={x} type="button" onClick={() => set("sex", x)} className={cn("h-10 rounded-xl text-[15px] font-semibold transition", s.sex === x ? "bg-surface text-text shadow" : "text-muted")}>
                    {o[x]}
                  </button>
                ))}
              </div>
              <Field label={o.birthYear}><Input inputMode="numeric" type="number" value={s.birthYear} onChange={(e) => set("birthYear", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={o.height}><Input inputMode="decimal" type="number" value={s.heightCm} onChange={(e) => set("heightCm", e.target.value)} /></Field>
                <Field label={o.weight}><Input inputMode="decimal" type="number" step="0.1" value={s.weightKg} onChange={(e) => set("weightKg", e.target.value)} /></Field>
              </div>
              {s.goalType !== "maintain" && (
                <Field label={`${o.targetWeight} · ${t.common.optional}`}>
                  <Input inputMode="decimal" type="number" step="0.1" value={s.targetWeightKg} onChange={(e) => set("targetWeightKg", e.target.value)} />
                </Field>
              )}
            </div>
          </>
        )}

        {current === "activity" && (
          <>
            <h1 className="font-display text-[34px] font-semibold leading-tight">{o.activity}</h1>
            <p className="mt-2 text-[14px] text-muted">{o.activityHint}</p>
            <div className="mt-6 space-y-2.5">
              {ACTIVITY.map((a) => (
                <Option key={a} active={s.activityLevel === a} onClick={() => set("activityLevel", a)} title={o[a]} desc={o[`${a}D`]} />
              ))}
            </div>
          </>
        )}

        {current === "rate" && s.goalType !== "maintain" && (
          <>
            <h1 className="font-display text-[34px] font-semibold leading-tight">{o.rate}</h1>
            <div className="mt-6 space-y-2.5">
              {RATES[s.goalType].map((r) => {
                const kg = ((r / 100) * (Number(s.weightKg) || 75)).toFixed(2);
                return (
                  <Option
                    key={r}
                    active={s.goalRatePct === r}
                    onClick={() => set("goalRatePct", r)}
                    title={`${s.goalType === "lose" ? "−" : "+"}${kg} kg ${o.ratePerWeek}`}
                    desc={`≈ ${Math.round((r / 100) * (Number(s.weightKg) || 75) * 7700 / 7)} kcal ${t.common.perDay} · ${r}%`}
                  />
                );
              })}
            </div>
          </>
        )}

        {current === "diet" && (
          <>
            <h1 className="font-display text-[34px] font-semibold leading-tight">{o.diet}</h1>
            <div className="mt-6 space-y-2.5">
              {DIETS.map((d) => (
                <Option key={d} active={s.dietType === d} onClick={() => set("dietType", d)} title={o[d]} icon={({ balanced: Salad, high_protein: Beef, low_carb: Leaf, keto: Droplet, plant: Leaf } as Record<string, LucideIcon>)[d]} tone={({ balanced: "var(--fiber)", high_protein: "var(--protein)", low_carb: "var(--carbs)", keto: "var(--fat)", plant: "var(--good)" } as Record<string, string>)[d]} />
              ))}
            </div>
          </>
        )}

        {current === "plan" && (
          <>
            <h1 className="font-display text-[34px] font-semibold leading-tight">{o.planTitle}</h1>
            <p className="mt-2 text-muted">{o.planSub}</p>
            <div className="card mt-6 grid place-items-center p-6">
              <Ring value={plan.kcal} max={plan.kcal} size={190} stroke={14}>
                <div>
                  <div className="font-display tabular text-[46px] font-semibold leading-none">{plan.kcal.toLocaleString()}</div>
                  <div className="text-[13px] text-muted">kcal · {o.dailyTarget.toLowerCase()}</div>
                </div>
              </Ring>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                {[
                  { l: t.macros.protein, v: plan.protein, c: "var(--protein)" },
                  { l: t.macros.carbs, v: plan.carbs, c: "var(--carbs)" },
                  { l: t.macros.fat, v: plan.fat, c: "var(--fat)" },
                ].map((m) => (
                  <div key={m.l} className="rounded-2xl bg-surface-2 py-3">
                    <div className="tabular text-xl font-bold" style={{ color: m.c }}>{m.v}g</div>
                    <div className="text-xs text-muted">{m.l}</div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-[13px] text-muted">
                {o.expenditure}: <span className="tabular font-semibold text-text">{plan.expenditure.toLocaleString()} kcal</span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="pt-6">
        {current === "plan" ? (
          <Button size="lg" className="w-full" onClick={finish} disabled={pending}>{pending ? t.common.loading : o.start}</Button>
        ) : (
          <Button size="lg" className="w-full" onClick={next} disabled={current === "about" && !aboutValid}>{t.common.next}</Button>
        )}
      </div>
    </div>
  );
}
