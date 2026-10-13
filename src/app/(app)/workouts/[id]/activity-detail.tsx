"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, Loader2, Lock, Pencil, Share2 } from "lucide-react";
import { deleteWorkout, updateWorkout } from "@/app/actions/workouts";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { Button, cn, Input, Textarea } from "@/components/ui";
import { WorkoutIcon } from "@/components/icons";
import { PostImage } from "@/components/lightbox";
import { ConfirmDelete } from "@/components/confirm-delete";
import { RouteMap } from "@/components/activity/route-map";
import { EffortSlider, SportPicker } from "@/components/activity/sport-picker";
import { ActivityShareSheet } from "@/components/activity/share-sheet";
import { clock, effortLabel, km, SPORT, sportName, sportOf, speedOf, type Sport } from "@/lib/sports";
import type { Route, Split } from "@/lib/route";

type A = {
  id: string; type: string; name: string; description: string | null; source: string; startAt: string; durationSec: number; elapsedSec: number | null;
  distanceM: number | null; kcal: number; avgHr: number | null; elevationM: number | null; maxSpeed: number | null; effort: number | null;
  photoUrl: string | null; route: Route | null; splits: Split[];
};

export function ActivityDetail({ a, canShare, defaultVisibility }: { a: A; canShare: boolean; defaultVisibility: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const def = sportOf(a.type);
  const speedSport = def.metric === "speed" || def.metric === "none";
  const avg = speedOf(a.type, a.distanceM ?? 0, a.durationSec);
  const strava = a.source === "strava";
  const when = new Date(a.startAt).toLocaleString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const stats: { l: string; v: string; u?: string }[] = [];
  if (a.distanceM) stats.push({ l: t.record.distance, v: km(a.distanceM), u: "km" });
  stats.push({ l: t.record.movingTime, v: clock(a.durationSec) });
  if (a.distanceM && avg.v !== "–") stats.push({ l: speedSport ? t.record.avgSpeed : t.record.avgPace, v: avg.v, u: avg.unit });
  if (a.elevationM != null && def.gps) stats.push({ l: t.record.elevation, v: String(Math.round(a.elevationM)), u: "m" });
  if (a.elapsedSec && a.elapsedSec - a.durationSec > 30) stats.push({ l: t.record.elapsed, v: clock(a.elapsedSec) });
  stats.push({ l: t.record.calories, v: String(Math.round(a.kcal)), u: "kcal" });
  if (a.avgHr) stats.push({ l: t.workouts.avgHr, v: String(a.avgHr), u: "bpm" });
  if (a.maxSpeed && def.gps) stats.push({ l: t.record.maxSpeed, v: (a.maxSpeed * 3.6).toFixed(1), u: "km/h" });

  return (
    <div className="animate-rise pb-6">
      <header className="flex items-center justify-between gap-2 pb-3 pt-3">
        <Link href="/workouts" className="press -ml-2 grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Back"><ChevronLeft className="size-6" /></Link>
        <div className="flex gap-1">
          {canShare && !strava && (
            <button onClick={() => setSharing(true)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label={t.workouts.shareWorkout}><Share2 className="size-5" /></button>
          )}
          <button onClick={() => setEditing(true)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label={t.record.edit}><Pencil className="size-5" /></button>
        </div>
      </header>

      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <WorkoutIcon type={a.type} className="size-4" /> {sportName(a.type, locale)} · <span className="first-letter:uppercase">{when}</span>
      </div>
      <h1 className="font-display mt-1.5 text-balance text-[32px] font-semibold leading-[1.08] [overflow-wrap:anywhere]">{a.name}</h1>
      {a.description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted">{a.description}</p>}
      {a.effort != null && (
        <span className="edge mt-3 inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12.5px] font-bold">
          {t.record.effortShort} <span className="tabular">{a.effort}/10</span> · {effortLabel(a.effort, locale)}
        </span>
      )}
      {strava && <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-faint"><Lock className="size-3.5" />{t.record.stravaReadOnly}</p>}

      {a.route && <RouteMap route={a.route} className="mt-5 h-72 rounded-3xl border border-border" recenterLabel={t.record.recenter} />}

      <div className="card mt-4 grid grid-cols-3 gap-y-5 px-2 py-5 text-center">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="tabular text-[21px] font-extrabold leading-none">{s.v}{s.u && <span className="ml-0.5 text-[11px] font-bold text-muted">{s.u}</span>}</div>
            <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">{s.l}</div>
          </div>
        ))}
      </div>

      {a.photoUrl && <div className="mt-4 overflow-hidden rounded-3xl"><PostImage src={a.photoUrl} alt={a.name} /></div>}

      {a.route && <Charts route={a.route} sport={a.type} />}
      {a.splits.length > 0 && <Splits splits={a.splits} sport={a.type} distanceM={a.distanceM ?? 0} durationSec={a.durationSec} />}

      <EditSheet a={a} open={editing} onClose={() => setEditing(false)} onDeleted={() => { router.replace("/workouts"); router.refresh(); }} />
      <ActivityShareSheet
        act={sharing ? { id: a.id, type: a.type, name: a.name, durationSec: a.durationSec, kcal: a.kcal, hasRoute: !!a.route } : null}
        onClose={() => setSharing(false)} defaultVisibility={defaultVisibility}
      />
    </div>
  );
}

// ── Splits ──────────────────────────────────────────────────────────────────

function Splits({ splits, sport, distanceM, durationSec }: { splits: Split[]; sport: string; distanceM: number; durationSec: number }) {
  const { t } = useT();
  const speedSport = SPORT[sport as Sport]?.metric === "speed" || SPORT[sport as Sport]?.metric === "none";
  // Include the partial last kilometre, like Strava.
  const rest = distanceM - splits.length * 1000;
  const restSec = durationSec - splits.reduce((s, x) => s + x.sec, 0);
  const rows = [...splits.map((s, i) => ({ k: String(i + 1), dist: 1000, sec: s.sec, elev: s.elev })), ...(rest >= 50 && restSec > 0 ? [{ k: (rest / 1000).toFixed(1), dist: rest, sec: restSec, elev: 0 }] : [])];
  const speeds = rows.map((r) => r.dist / r.sec);
  const best = Math.max(...speeds), worst = Math.min(...speeds);
  return (
    <section className="mt-6">
      <h2 className="mb-2.5 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.record.splits}</h2>
      <div className="card px-4 py-3">
        <div className="grid grid-cols-[36px_64px_1fr_44px] gap-3 pb-2 text-[10.5px] font-black uppercase tracking-[0.08em] text-faint">
          <span>{t.record.km}</span><span>{speedSport ? "km/h" : t.record.pace}</span><span /><span className="text-right">m</span>
        </div>
        {rows.map((r, i) => {
          const sp = speeds[i];
          const w = best === worst ? 100 : 35 + 65 * ((sp - worst) / (best - worst));
          return (
            <div key={r.k} className="grid grid-cols-[36px_64px_1fr_44px] items-center gap-3 py-1.5 text-[13.5px] font-bold">
              <span className="tabular text-muted">{r.k}</span>
              <span className="tabular">{speedSport ? (sp * 3.6).toFixed(1) : clock((r.sec / r.dist) * 1000)}</span>
              <span className="h-2.5 rounded-full bg-surface-2"><span className={cn("block h-full rounded-full", sp === best ? "bg-text" : "bg-muted/60")} style={{ width: `${w}%` }} /></span>
              <span className="tabular text-right text-muted">{r.elev > 0 ? "+" : ""}{r.elev}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Charts (elevation profile and pace/speed over distance) ─────────────────

function Charts({ route, sport }: { route: Route; sport: string }) {
  const { t } = useT();
  const def = sportOf(sport);
  const speedSport = def.metric === "speed" || def.metric === "none";
  const data = useMemo(() => {
    const pts = route.pts;
    const ele = pts.filter((p) => p[2] != null).map((p) => ({ x: p[4], y: p[2] as number }));
    // Speed over a ~30 s window, restarting after pauses and auto-pauses (gaps > 10 s).
    const breaks = new Set(route.breaks);
    const spd: { x: number; y: number }[] = [];
    let j = 0;
    for (let i = 1; i < pts.length; i++) {
      if (breaks.has(i) || pts[i][3] - pts[i - 1][3] > 10) { j = i; continue; }
      while (j < i && pts[i][3] - pts[j][3] > 30) j++;
      const dt = pts[i][3] - pts[j][3], dd = pts[i][4] - pts[j][4];
      if (dt >= 5 && dd > 0) spd.push({ x: pts[i][4], y: dd / dt });
    }
    return { ele: downsample(ele, 160), spd: downsample(spd, 160) };
  }, [route]);
  const fmtSpeed = (v: number) => (speedSport ? `${(v * 3.6).toFixed(1)}` : clock(1000 / v));
  return (
    <section className="mt-6 space-y-3">
      {data.spd.length > 4 && (
        <Chart title={speedSport ? t.record.speedChart : t.record.paceChart} unit={speedSport ? "km/h" : "/km"} points={data.spd} pace={!speedSport} fmt={fmtSpeed} />
      )}
      {data.ele.length > 4 && <Chart title={t.record.elevationChart} unit="m" points={data.ele} fmt={(v) => String(Math.round(v))} />}
    </section>
  );
}

function downsample<T>(xs: T[], n: number) {
  if (xs.length <= n) return xs;
  const step = xs.length / n;
  return Array.from({ length: n }, (_, i) => xs[Math.floor(i * step)]);
}

/** Area chart over distance. Faster is always higher; for pace the range label reads fastest → slowest. */
function Chart({ title, unit, points, fmt, pace = false }: { title: string; unit: string; points: { x: number; y: number }[]; fmt: (v: number) => string; pace?: boolean }) {
  const W = 320, H = 96;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  // Clip outliers (GPS spikes) to the 3rd–97th percentile.
  const sorted = [...ys].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.03)], hi = sorted[Math.ceil(sorted.length * 0.97) - 1];
  const range = hi - lo || 1;
  const X = (x: number) => ((x - x0) / (x1 - x0 || 1)) * W;
  const Y = (y: number) => 6 + (1 - (Math.min(hi, Math.max(lo, y)) - lo) / range) * (H - 12);
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join("");
  const avg = ys.reduce((s, y) => s + y, 0) / ys.length;
  return (
    <div className="card px-4 pb-3 pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{title}</span>
        <span className="tabular text-[12px] font-bold text-faint">{fmt(pace ? hi : lo)} – {fmt(pace ? lo : hi)} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-24 w-full text-text" aria-label={`${title}: ${fmt(avg)} ${unit}`}>
        <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="currentColor" opacity={0.08} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <line x1={0} x2={W} y1={Y(avg)} y2={Y(avg)} stroke="currentColor" strokeDasharray="3 4" opacity={0.35} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] font-bold text-faint"><span>0 km</span><span>{(x1 / 1000).toFixed(1)} km</span></div>
    </div>
  );
}

// ── Edit ────────────────────────────────────────────────────────────────────

function EditSheet({ a, open, onClose, onDeleted }: { a: A; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const { t, locale } = useT();
  const router = useRouter();
  const strava = a.source === "strava";
  const [sport, setSport] = useState<Sport>((a.type in SPORT ? a.type : "other") as Sport);
  const [name, setName] = useState(a.name);
  const [desc, setDesc] = useState(a.description ?? "");
  const [effort, setEffort] = useState<number | null>(a.effort);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title={t.record.edit}>
      <div className="space-y-4">
        {!strava && (
          <>
            <button onClick={() => setPicking(true)} className="press edge flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-left">
              <WorkoutIcon type={sport} className="size-5" />
              <span className="flex-1 text-[15px] font-bold">{sportName(sport, locale)}</span>
              <ChevronDown className="size-4 text-muted" />
            </button>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label={t.workouts.name} className="font-bold" />
          </>
        )}
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t.record.howWasIt} maxLength={2000} className="min-h-24" />
        <EffortSlider value={effort} onChange={setEffort} />
        <div className="flex gap-2 pt-1">
          {!strava && <ConfirmDelete title={t.record.deleteActivity} onConfirm={async () => { await deleteWorkout(a.id); onDeleted(); }} />}
          <Button size="lg" className="flex-1" disabled={pending || !name.trim()} onClick={() => start(async () => {
            await updateWorkout({ id: a.id, type: sport, name: name.trim(), description: desc, effort });
            onClose();
            router.refresh();
          })}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : t.common.save}
          </Button>
        </div>
      </div>
      <SportPicker open={picking} onClose={() => setPicking(false)} value={sport} onPick={setSport} gpsOnly={!!a.route} />
    </Sheet>
  );
}
