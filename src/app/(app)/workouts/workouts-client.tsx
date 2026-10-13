"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Circle, Dumbbell, FileUp, Loader2, Lock, PenLine, RefreshCw } from "lucide-react";
import { addWorkout, syncStrava, uploadFit } from "@/app/actions/workouts";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { VisibilityPicker } from "@/components/meal-section";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
import { Button, Card, cn, Empty, Field, fmt, IconTile, Input, Textarea } from "@/components/ui";
import { WorkoutIcon } from "@/components/icons";
import { EffortSlider, SportPicker } from "@/components/activity/sport-picker";
import { SwitchRow } from "@/components/activity/switch-row";
import { uploadImage } from "@/lib/image-client";
import { autoTitle, clock, estimateKcal, isSport, km, SPORT, sportName, speedOf, type Sport } from "@/lib/sports";

export type ActRow = {
  id: string; type: string; name: string; source: string; date: string; durationSec: number; distanceM: number | null; kcal: number; elevationM: number | null; thumb: string | null;
};

export function WorkoutsClient(props: {
  activities: ActRow[]; openAdd: boolean; date: string; weightKg: number; hasStrava: boolean; canShare: boolean; defaultVisibility: string; recent: string[];
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(props.openAdd);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFit = (file?: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      try {
        const r = await uploadFit(fd);
        setMsg(`${sportName(r.type, locale)} · ${r.kcal} kcal`);
        router.refresh();
      } catch {
        setMsg(t.common.error);
      }
    });
  };

  const grouped = props.activities.reduce<Record<string, ActRow[]>>((acc, a) => { (acc[a.date] ??= []).push(a); return acc; }, {});

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/record" className="press varnish col-span-2 flex h-14 items-center justify-center gap-2.5 rounded-2xl text-[16px] font-extrabold">
          <Circle className="size-4" fill="currentColor" strokeWidth={0} /> {t.record.record}
        </Link>
        <Button variant="secondary" onClick={() => setAdding(true)}><PenLine className="size-4" /> {t.record.manual}</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} .FIT
        </Button>
        {props.hasStrava && (
          <Button variant="secondary" className="col-span-2" disabled={pending} onClick={() => start(async () => { try { await syncStrava(); router.refresh(); } catch { setMsg(t.common.error); } })}>
            <RefreshCw className={cn("size-4", pending && "animate-spin")} /> Strava
          </Button>
        )}
        <input ref={fileRef} type="file" accept=".fit,application/octet-stream" hidden onChange={(e) => onFit(e.target.files?.[0])} />
      </div>
      <p className="mt-2 px-1 text-[12px] text-faint">{t.workouts.uploadFitD}</p>
      {msg && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] font-semibold"><Check className="size-4 text-good" strokeWidth={3} />{msg}</p>}

      {props.activities.length === 0 ? (
        <Card className="mt-5"><Empty icon={<Dumbbell className="size-6" />} title={t.workouts.none} /></Card>
      ) : (
        Object.entries(grouped).map(([date, acts]) => (
          <div key={date} className="mt-5">
            <h3 className="mb-2.5 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {new Date(`${date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}
            </h3>
            <Card className="divide-y divide-border overflow-hidden">
              {acts.map((a) => <ActivityRow key={a.id} a={a} />)}
            </Card>
          </div>
        ))
      )}

      <ManualSheet open={adding} onClose={() => setAdding(false)} date={props.date} weightKg={props.weightKg} recent={props.recent} canShare={props.canShare} defaultVisibility={props.defaultVisibility} />
    </>
  );
}

function ActivityRow({ a }: { a: ActRow }) {
  const { t, locale } = useT();
  const sp = speedOf(a.type, a.distanceM ?? 0, a.durationSec);
  return (
    <Link href={`/workouts/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
      {a.thumb ? (
        <span className="edge grid size-14 shrink-0 place-items-center rounded-2xl">
          <svg viewBox="0 0 56 56" className="size-14 text-text" aria-hidden><path d={a.thumb} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      ) : (
        <IconTile size={56}><WorkoutIcon type={a.type} className="size-5" /></IconTile>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold">{a.name}</div>
        <div className="flex items-center gap-1 text-[12px] font-semibold text-faint">
          <WorkoutIcon type={a.type} className="size-3" /> {sportName(a.type, locale)}
          {a.source !== "manual" && a.source !== "violi" && <span>· {{ garmin: "Garmin", strava: "Strava", fit: ".FIT" }[a.source] ?? a.source}</span>}
          {a.source === "strava" && <Lock className="size-3" aria-label={t.workouts.privateStrava} />}
        </div>
        <div className="tabular mt-0.5 flex flex-wrap gap-x-2 text-[12.5px] font-bold">
          {a.distanceM ? <span>{km(a.distanceM)} km</span> : null}
          <span>{clock(a.durationSec)}</span>
          {a.distanceM && sp.v !== "–" ? <span className="text-muted">{sp.v}{sp.unit}</span> : null}
        </div>
      </div>
      <div className="tabular text-right text-[15px] font-extrabold text-good">+{fmt(a.kcal)}<div className="text-[10px] font-semibold text-faint">kcal</div></div>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

/** Strava-style "Add manual activity". */
function ManualSheet({ open, onClose, date, weightKg, recent, canShare, defaultVisibility }: {
  open: boolean; onClose: () => void; date: string; weightKg: number; recent: string[]; canShare: boolean; defaultVisibility: string;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [sport, setSport] = useState<Sport>((recent.find(isSport) as Sport | undefined) ?? "run");
  const [picking, setPicking] = useState(false);
  const [f, setF] = useState({ name: "", desc: "", date, time: defaultTime(), h: "0", m: "45", s: "0", distance: "", elevation: "", kcal: "", avgHr: "" });
  const [effort, setEffort] = useState<number | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto>(null);
  const [share, setShare] = useState(false);
  const [vis, setVis] = useState(defaultVisibility);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const def = SPORT[sport];
  const showDistance = def.gps || def.metric !== "none";
  const seconds = (Number(f.h) || 0) * 3600 + (Number(f.m) || 0) * 60 + (Number(f.s) || 0);
  const est = estimateKcal(sport, seconds, weightKg);
  const title = autoTitle(sport, new Date(`${f.date}T${f.time || "12:00"}:00`), locale);
  const distM = (Number(f.distance.replace(",", ".")) || 0) * 1000;
  const pace = speedOf(sport, distM, seconds);
  const num = (k: keyof typeof f, mode: "numeric" | "decimal" = "numeric") => ({
    value: f[k], inputMode: mode, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value.replace(mode === "numeric" ? /\D/g : /[^\d.,]/g, "") }),
  });

  return (
    <Sheet open={open} onClose={onClose} title={t.workouts.add}>
      <div className="space-y-4">
        <button onClick={() => setPicking(true)} className="press edge flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-left">
          <WorkoutIcon type={sport} className="size-5" />
          <span className="flex-1 text-[15px] font-bold">{sportName(sport, locale)}</span>
          <ChevronDown className="size-4 text-muted" />
        </button>
        <Input value={f.name} placeholder={title} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} aria-label={t.workouts.name} className="font-bold" />
        <Textarea value={f.desc} placeholder={t.record.howWasIt} onChange={(e) => setF({ ...f, desc: e.target.value })} maxLength={2000} className="min-h-20" />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.workouts.date}><Input type="date" value={f.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t.record.startTime}><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        </div>

        <Field label={t.record.durationHms}>
          <div className="grid grid-cols-3 gap-2">
            {(["h", "m", "s"] as const).map((k) => (
              <label key={k} className="relative">
                <Input {...num(k)} className="pr-8 text-center" aria-label={k} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-faint">{k === "h" ? (locale === "el" ? "ώ" : "h") : k === "m" ? (locale === "el" ? "λ" : "m") : (locale === "el" ? "δ" : "s")}</span>
              </label>
            ))}
          </div>
        </Field>

        {showDistance && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.workouts.distance} hint={distM > 0 && seconds > 0 && pace.v !== "–" ? `${pace.v}${pace.unit}` : undefined}><Input {...num("distance", "decimal")} placeholder="0" /></Field>
            {def.gps && <Field label={t.record.elevationM}><Input {...num("elevation")} placeholder="0" /></Field>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.workouts.calories} hint={`${t.workouts.estimate}: ~${est}`}><Input {...num("kcal")} placeholder={String(est)} /></Field>
          <Field label={t.workouts.avgHr}><Input {...num("avgHr")} placeholder="–" /></Field>
        </div>

        <EffortSlider value={effort} onChange={setEffort} />
        <Field label={t.record.photo}><PhotoPicker value={photo} onChange={setPhoto} compact /></Field>

        {canShare && (
          <div className="rounded-2xl bg-surface-2 px-4 py-1">
            <SwitchRow label={t.record.shareToFeed} checked={share} onChange={setShare} />
            {share && <div className="pb-3"><VisibilityPicker value={vis} onChange={setVis} /></div>}
          </div>
        )}

        {error && <p className="text-[13px] font-semibold text-bad">{error}</p>}
        <Button
          size="lg" className="w-full" disabled={pending || seconds <= 0}
          onClick={() => start(async () => {
            setError(null);
            try {
              const photoUrl = photo ? await uploadImage(photo.blob) : null;
              const id = await addWorkout({
                type: sport, name: f.name.trim() || title, description: f.desc.trim() || undefined, date: f.date, time: f.time || undefined, seconds,
                distanceKm: showDistance && distM > 0 ? distM / 1000 : undefined, elevationM: def.gps && f.elevation ? Number(f.elevation) : undefined,
                kcal: f.kcal ? Number(f.kcal) : undefined, avgHr: f.avgHr ? Number(f.avgHr) : undefined, effort: effort ?? undefined, photoUrl,
                share: canShare && share ? { visibility: vis, showMap: false } : null,
              });
              onClose();
              router.push(`/workouts/${id}`);
            } catch {
              setError(t.common.error);
            }
          })}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : t.common.save}
        </Button>
      </div>
      <SportPicker open={picking} onClose={() => setPicking(false)} value={sport} onPick={setSport} recent={recent} />
    </Sheet>
  );
}

function defaultTime() {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
