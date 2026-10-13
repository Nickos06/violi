"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Watch } from "lucide-react";
import { setManualTargets, updateGoals, updateSettings } from "@/app/actions/profile";
import { disconnect } from "@/app/actions/integrations";
import { logout } from "@/app/actions/auth";
import { useT } from "@/components/i18n-provider";
import { VisibilityPicker } from "@/components/meal-section";
import { ThemeSwitch } from "@/components/theme-switch";
import { asThemePref } from "@/lib/theme";
import { Button, Card, cn, Field, Input, Select, SectionTitle, Textarea } from "@/components/ui";

type U = {
  name: string; bio: string; email: string; locale: string; theme: string; profilePublic: boolean; shareMeals: boolean; shareWorkouts: boolean;
  shareWeight: boolean; defaultVisibility: string; goalType: string; goalRatePct: number; sex: string; birthYear: number; heightCm: number;
  activityLevel: string; dietType: string; targetWeightKg: number | null; exerciseCreditPct: number; checkInWeekday: number;
  targetKcal: number; targetProtein: number; targetCarbs: number; targetFat: number;
};
type Integ = { configured: boolean; connected: boolean; lastSync: string | null };

export function SettingsClient({ user, garmin, strava, flash }: { user: U; garmin: Integ; strava: Integ; flash: { ok: boolean; msg: string } | null }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);
  const save = (section: string, fn: () => Promise<unknown>) =>
    start(async () => { await fn(); setSaved(section); router.refresh(); setTimeout(() => setSaved(null), 1800); });

  const [acc, setAcc] = useState({ name: user.name, bio: user.bio });
  const [g, setG] = useState({
    goalType: user.goalType, goalRatePct: String(user.goalRatePct || 0.5), sex: user.sex, birthYear: String(user.birthYear), heightCm: String(user.heightCm),
    activityLevel: user.activityLevel, dietType: user.dietType, targetWeightKg: user.targetWeightKg ? String(user.targetWeightKg) : "",
    exerciseCreditPct: user.exerciseCreditPct, checkInWeekday: String(user.checkInWeekday),
  });
  const [m, setM] = useState({ kcal: String(Math.round(user.targetKcal)), protein: String(Math.round(user.targetProtein)), carbs: String(Math.round(user.targetCarbs)), fat: String(Math.round(user.targetFat)) });
  const o = t.onboarding;
  const SavedTag = ({ k }: { k: string }) => (saved === k ? <span className="text-[12px] font-semibold text-good">✓ {t.common.saved}</span> : null);

  return (
    <div>
      {flash && <p className={cn("mb-3 rounded-xl px-3 py-2.5 text-[14px]", flash.ok ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>{flash.msg}</p>}

      {/* Integrations */}
      <SectionTitle>{t.settings.integrations}</SectionTitle>
      <Card className="divide-y divide-border">
        <IntegrationRow
          name="Garmin Connect" logo={<Watch className="size-5 text-text" />} desc={t.settings.garminD} note={t.settings.garminNote}
          state={garmin} provider="garmin" onDisconnect={() => save("integ", () => disconnect("garmin"))} pending={pending}
        />
        <IntegrationRow
          name="Strava" logo={<span className="text-xl font-black text-[#FC4C02]">S</span>} desc={t.settings.stravaD} note={t.settings.stravaNote}
          state={strava} provider="strava" onDisconnect={() => save("integ", () => disconnect("strava"))} pending={pending}
        />
      </Card>

      {/* Appearance */}
      <SectionTitle>{t.settings.appearance}</SectionTitle>
      <Card className="space-y-4 p-4">
        <Row label={t.settings.language}>
          <Seg value={user.locale} options={[{ v: "el", l: "Ελληνικά" }, { v: "en", l: "English" }]} onChange={(v) => save("app", () => updateSettings({ locale: v as "el" | "en" }))} />
        </Row>
        <Row label={t.settings.theme}>
          <ThemeSwitch value={asThemePref(user.theme)} signedIn labels />
        </Row>
      </Card>

      {/* Goals */}
      <div id="goals" className="scroll-mt-6">
        <SectionTitle action={<SavedTag k="goals" />}>{t.settings.goals}</SectionTitle>
        <Card className="space-y-4 p-4">
          <Seg value={g.goalType} options={[{ v: "lose", l: o.lose }, { v: "maintain", l: o.maintain }, { v: "gain", l: o.gain }]} onChange={(v) => setG({ ...g, goalType: v })} />
          <div className="grid grid-cols-2 gap-3">
            {g.goalType !== "maintain" && (
              <Field label={`${o.rate} (% / ${o.ratePerWeek})`}>
                <Select value={g.goalRatePct} onChange={(e) => setG({ ...g, goalRatePct: e.target.value })}>
                  {(g.goalType === "lose" ? [0.25, 0.5, 0.75, 1] : [0.1, 0.25, 0.5]).map((r) => <option key={r} value={r}>{r}%</option>)}
                </Select>
              </Field>
            )}
            <Field label={o.targetWeight}><Input type="number" step="0.1" value={g.targetWeightKg} onChange={(e) => setG({ ...g, targetWeightKg: e.target.value })} /></Field>
            <Field label={o.sex}>
              <Select value={g.sex} onChange={(e) => setG({ ...g, sex: e.target.value })}><option value="male">{o.male}</option><option value="female">{o.female}</option></Select>
            </Field>
            <Field label={o.birthYear}><Input type="number" value={g.birthYear} onChange={(e) => setG({ ...g, birthYear: e.target.value })} /></Field>
            <Field label={o.height}><Input type="number" value={g.heightCm} onChange={(e) => setG({ ...g, heightCm: e.target.value })} /></Field>
            <Field label={t.settings.checkInDay}>
              <Select value={g.checkInWeekday} onChange={(e) => setG({ ...g, checkInWeekday: e.target.value })}>
                {t.settings.days.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={o.activity} hint={o.activityHint}>
            <Select value={g.activityLevel} onChange={(e) => setG({ ...g, activityLevel: e.target.value })}>
              {(["sedentary", "light", "moderate", "active", "very_active"] as const).map((a) => <option key={a} value={a}>{o[a]} — {o[`${a}D`]}</option>)}
            </Select>
          </Field>
          <Field label={o.diet}>
            <Select value={g.dietType} onChange={(e) => setG({ ...g, dietType: e.target.value })}>
              {(["balanced", "high_protein", "low_carb", "keto", "plant"] as const).map((d) => <option key={d} value={d}>{o[d]}</option>)}
            </Select>
          </Field>
          <Field label={`${t.settings.exerciseCredit}: ${g.exerciseCreditPct}%`} hint={t.settings.exerciseCreditD}>
            <input type="range" min={0} max={100} step={5} value={g.exerciseCreditPct} onChange={(e) => setG({ ...g, exerciseCreditPct: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
          </Field>
          <Button
            className="w-full" disabled={pending}
            onClick={() => save("goals", () => updateGoals({
              goalType: g.goalType as "lose", goalRatePct: Number(g.goalRatePct), sex: g.sex as "male", birthYear: Number(g.birthYear), heightCm: Number(g.heightCm),
              activityLevel: g.activityLevel as "light", dietType: g.dietType as "balanced", targetWeightKg: g.targetWeightKg ? Number(g.targetWeightKg) : undefined,
              exerciseCreditPct: g.exerciseCreditPct, checkInWeekday: Number(g.checkInWeekday),
            }))}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : t.settings.recalc}
          </Button>
        </Card>
      </div>

      <SectionTitle action={<SavedTag k="manual" />}>{t.settings.manualTargets}</SectionTitle>
      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-4 gap-2">
          {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
            <Field key={k} label={k === "kcal" ? "kcal" : t.macros[k]}>
              <Input type="number" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} className="px-2 text-center" />
            </Field>
          ))}
        </div>
        <p className="text-[12px] text-faint">
          {locale === "el" ? "Οι μακρο δίνουν" : "Macros add up to"} {Math.round(Number(m.protein) * 4 + Number(m.carbs) * 4 + Number(m.fat) * 9)} kcal. {locale === "el" ? "Το επόμενο check-in θα τους αντικαταστήσει." : "The next check-in will replace them."}
        </p>
        <Button variant="secondary" className="w-full" disabled={pending} onClick={() => save("manual", () => setManualTargets({ kcal: Number(m.kcal), protein: Number(m.protein), carbs: Number(m.carbs), fat: Number(m.fat) }))}>
          {t.common.save}
        </Button>
      </Card>

      {/* Privacy */}
      <SectionTitle action={<SavedTag k="privacy" />}>{t.settings.privacy}</SectionTitle>
      <Card className="divide-y divide-border">
        {([
          ["profilePublic", t.settings.profilePublic, t.settings.profilePublicD],
          ["shareMeals", t.settings.shareMeals, t.settings.shareMealsD],
          ["shareWorkouts", t.settings.shareWorkouts, t.settings.shareWorkoutsD],
          ["shareWeight", t.settings.shareWeight, t.settings.shareWeightD],
        ] as const).map(([k, l, d]) => (
          <Toggle key={k} label={l} desc={d} checked={user[k]} onChange={(v) => save("privacy", () => updateSettings({ [k]: v }))} />
        ))}
        <div className="p-4">
          <div className="mb-2 text-[14px] font-medium">{t.settings.defaultVisibility}</div>
          <VisibilityPicker value={user.defaultVisibility} onChange={(v) => save("privacy", () => updateSettings({ defaultVisibility: v as "public" }))} />
          <p className="mt-2 text-[12px] text-faint">{t.social.mutual}</p>
        </div>
      </Card>

      {/* Account */}
      <SectionTitle action={<SavedTag k="account" />}>{t.settings.account}</SectionTitle>
      <Card className="space-y-3 p-4">
        <Field label={t.auth.name}><Input value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} /></Field>
        <Field label={t.profile.bio}><Textarea value={acc.bio} maxLength={160} onChange={(e) => setAcc({ ...acc, bio: e.target.value })} className="min-h-16" /></Field>
        <p className="text-[12px] text-faint">{user.email}</p>
        <Button variant="secondary" className="w-full" disabled={pending} onClick={() => save("account", () => updateSettings({ name: acc.name, bio: acc.bio }))}>{t.common.save}</Button>
      </Card>

      <form action={logout} className="mt-6">
        <button className="w-full rounded-xl py-3 text-[14px] font-semibold text-bad hover:bg-bad/10">{t.auth.logout}</button>
      </form>
    </div>
  );
}

function IntegrationRow({ name, logo, desc, note, state, provider, onDisconnect, pending }: { name: string; logo: ReactNode; desc: string; note: string; state: Integ; provider: string; onDisconnect: () => void; pending: boolean }) {
  const { t, locale } = useT();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-surface-2">{logo}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold">
            {name}
            {state.connected && <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good">{t.settings.connected}</span>}
          </div>
          <p className="text-[13px] text-muted">{desc}</p>
        </div>
        {state.connected ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={onDisconnect}>{t.settings.disconnect}</Button>
        ) : (
          <a href={`/api/integrations/${provider}/connect`} className={cn("inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold", state.configured ? "bg-accent text-accent-fg" : "pointer-events-none bg-surface-2 text-faint")}>
            {t.settings.connect}
          </a>
        )}
      </div>
      <p className="mt-2 text-[12px] text-faint">
        {!state.configured ? `${t.settings.notConfigured} · ` : ""}{note}
        {state.lastSync && ` · ${t.settings.lastSync}: ${new Date(state.lastSync).toLocaleString(locale === "el" ? "el-GR" : "en-GB")}`}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[14px] font-medium">{label}</span>
      {children}
    </div>
  );
}

function Seg({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", value === o.v ? "bg-surface text-text shadow" : "text-muted")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(checked);
  return (
    <button type="button" onClick={() => { setOn(!on); onChange(!on); }} className="flex w-full items-center gap-4 p-4 text-left">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">{label}</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-accent" : "bg-surface-3")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}
