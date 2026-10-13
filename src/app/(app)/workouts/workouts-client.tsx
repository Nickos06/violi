"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, FileUp, Heart, Loader2, Lock, Plus, RefreshCw, Share2, Trash2 } from "lucide-react";
import { addWorkout, deleteWorkout, syncStrava, uploadFit } from "@/app/actions/workouts";
import { shareWorkout } from "@/app/actions/social";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { VisibilityPicker } from "@/components/meal-section";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
import { uploadImage } from "@/lib/image-client";
import { Button, Card, cn, Empty, Field, fmt, IconTile, Input, Textarea } from "@/components/ui";
import { WorkoutIcon } from "@/components/icons";
import { WORKOUT_TYPES, estimateWorkoutKcal, formatDuration, type WorkoutType } from "@/lib/workouts";

type Act = { id: string; type: string; name: string; source: string; date: string; durationSec: number; distanceM: number | null; kcal: number; avgHr: number | null };

export function WorkoutsClient(props: { activities: Act[]; openAdd: boolean; date: string; weightKg: number; hasStrava: boolean; canShare: boolean; defaultVisibility: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(props.openAdd);
  const [sharing, setSharing] = useState<Act | null>(null);
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
        setMsg(`${t.workouts[r.type as WorkoutType] ?? r.type} · ${r.kcal} kcal`);
        router.refresh();
      } catch {
        setMsg(t.common.error);
      }
    });
  };

  const grouped = props.activities.reduce<Record<string, Act[]>>((acc, a) => { (acc[a.date] ??= []).push(a); return acc; }, {});

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button onClick={() => setAdding(true)}><Plus className="size-4" /> {t.workouts.add}</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} .FIT
        </Button>
        {props.hasStrava && (
          <Button variant="secondary" className="col-span-2 sm:col-span-1" disabled={pending} onClick={() => start(async () => { try { await syncStrava(); router.refresh(); } catch { setMsg(t.common.error); } })}>
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
              {acts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <IconTile size={44}><WorkoutIcon type={a.type} className="size-5" /></IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-bold">{a.name}</div>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] font-semibold text-faint">
                      <span>{formatDuration(a.durationSec)}</span>
                      {a.distanceM ? <span>· {(a.distanceM / 1000).toFixed(2)} km</span> : null}
                      {a.avgHr ? <span className="inline-flex items-center gap-0.5">· <Heart className="size-3" fill="currentColor" /> {a.avgHr}</span> : null}
                      {a.source !== "manual" && <span>· {{ garmin: "Garmin", strava: "Strava", fit: ".FIT" }[a.source] ?? a.source}</span>}
                      {a.source === "strava" && <span className="inline-flex items-center gap-0.5"><Lock className="size-3" /> {t.workouts.privateStrava}</span>}
                    </div>
                  </div>
                  <div className="tabular text-right text-[15px] font-extrabold text-good">+{fmt(a.kcal)}<div className="text-[10px] font-semibold text-faint">kcal</div></div>
                  <div className="flex flex-col">
                    {props.canShare && a.source !== "strava" && (
                      <button onClick={() => setSharing(a)} className="grid size-8 place-items-center rounded-lg text-faint hover:text-text" aria-label={t.workouts.shareWorkout}><Share2 className="size-4" /></button>
                    )}
                    {a.source !== "strava" && (
                      <button onClick={() => start(async () => { await deleteWorkout(a.id); router.refresh(); })} className="grid size-8 place-items-center rounded-lg text-faint hover:text-bad" aria-label={t.common.delete}><Trash2 className="size-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}

      <AddSheet open={adding} onClose={() => setAdding(false)} date={props.date} weightKg={props.weightKg} />
      <ShareSheet act={sharing} onClose={() => setSharing(null)} defaultVisibility={props.defaultVisibility} />
    </>
  );
}

function AddSheet({ open, onClose, date, weightKg }: { open: boolean; onClose: () => void; date: string; weightKg: number }) {
  const { t } = useT();
  const router = useRouter();
  const [type, setType] = useState<WorkoutType>("run");
  const [f, setF] = useState({ name: "", minutes: "45", distance: "", kcal: "", avgHr: "", date });
  const [pending, start] = useTransition();
  const est = estimateWorkoutKcal(type, Number(f.minutes) || 0, weightKg);
  return (
    <Sheet open={open} onClose={onClose} title={t.workouts.add}>
      <div className="space-y-4">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {WORKOUT_TYPES.map((w) => (
            <button key={w} onClick={() => setType(w)} className={cn("press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold", type === w ? "varnish" : "bg-surface-2 text-muted")}>
              <WorkoutIcon type={w} className="size-4" /> {t.workouts[w]}
            </button>
          ))}
        </div>
        <Field label={t.workouts.name}><Input value={f.name} placeholder={t.workouts[type]} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.workouts.duration}><Input type="number" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
          <Field label={t.workouts.distance}><Input type="number" inputMode="decimal" value={f.distance} onChange={(e) => setF({ ...f, distance: e.target.value })} /></Field>
          <Field label={t.workouts.calories} hint={`${t.workouts.estimate}: ~${est}`}><Input type="number" inputMode="numeric" placeholder={String(est)} value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></Field>
          <Field label={t.workouts.avgHr}><Input type="number" inputMode="numeric" value={f.avgHr} onChange={(e) => setF({ ...f, avgHr: e.target.value })} /></Field>
        </div>
        <Field label={t.workouts.date}><Input type="date" value={f.date} max={new Date().toISOString().slice(0, 10)}onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Button
          size="lg" className="w-full" disabled={pending || !(Number(f.minutes) > 0)}
          onClick={() => start(async () => {
            await addWorkout({
              type, name: f.name || t.workouts[type], minutes: Number(f.minutes), distanceKm: f.distance ? Number(f.distance) : undefined,
              kcal: f.kcal ? Number(f.kcal) : est, avgHr: f.avgHr ? Number(f.avgHr) : undefined, date: f.date,
            });
            onClose();
            router.refresh();
          })}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : t.common.save}
        </Button>
      </div>
    </Sheet>
  );
}

function ShareSheet({ act, onClose, defaultVisibility }: { act: Act | null; onClose: () => void; defaultVisibility: string }) {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [picked, setPicked] = useState<PickedPhoto>(null);
  const [pending, start] = useTransition();
  return (
    <Sheet open={!!act} onClose={onClose} title={t.workouts.shareWorkout}>
      {act && (
        <div className="space-y-3">
          <PhotoPicker value={picked} onChange={setPicked} />
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <IconTile><WorkoutIcon type={act.type} className="size-5" /></IconTile>
            <div>
              <div className="font-semibold">{act.name}</div>
              <div className="text-[13px] text-muted">{formatDuration(act.durationSec)} · {fmt(act.kcal)} kcal</div>
            </div>
          </div>
          <Textarea placeholder={t.social.composer} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <VisibilityPicker value={vis} onChange={setVis} />
          <Button className="w-full" disabled={pending} onClick={() => start(async () => {
            const photoUrl = picked ? await uploadImage(picked.blob) : undefined;
            await shareWorkout({ activityId: act.id, text, visibility: vis, photoUrl });
            onClose();
            router.push("/social");
          })}>
            {t.social.post}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
