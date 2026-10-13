"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, Check, ChevronDown, Ellipsis, Link2, Link2Off, Loader2, Minus, NotebookPen, Plus, Repeat, Timer, Trash2, Trophy, X,
} from "lucide-react";
import { finishWorkout } from "@/app/actions/gym";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { Button, cn, Field, fmt, Input, Textarea } from "@/components/ui";
import { VisibilityPicker } from "@/components/meal-section";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
import { ExercisePicker, exerciseName, type ExerciseLite } from "@/components/gym/exercise-picker";
import { ExerciseInfoSheet, ExerciseThumb } from "@/components/gym/exercise-media";
import { e1rm, fmtClock, fmtKg, fmtSet, MUSCLE_LABEL, REST_OPTIONS, setVolume, type LiveSet, type Muscle, type SetType } from "@/lib/gym";
import { defaultWorkoutName, newSet, readLive, uid, useLiveWorkout, useNow, type LiveExercise, type LiveWorkout } from "@/lib/live-workout";
import { uploadImage } from "@/lib/image-client";

export type RoutineSeed = {
  id: string;
  name: string;
  exercises: { exerciseId: string; restSec: number; notes: string; superset: number | null; sets: { type: string; weight: number | null; reps: number | null }[] }[];
};

type Prev = Record<string, { type: string; weightKg: number | null; reps: number | null; durationSec: number | null }[]>;
type Bests = Record<string, { weight: number; e1rm: number; volume: number; reps: number }>;

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const parseTime = (s: string) => {
  if (!s.trim()) return null;
  if (s.includes(":")) {
    const [m, sec] = s.split(":");
    return (Number(m) || 0) * 60 + (Number(sec) || 0);
  }
  return Number(s) || 0;
};

function fromRoutine(r: RoutineSeed | null, t: Parameters<typeof defaultWorkoutName>[0]): LiveWorkout {
  return {
    id: uid(),
    name: r?.name ?? defaultWorkoutName(t),
    routineId: r?.id ?? null,
    startedAt: Date.now(),
    exercises: (r?.exercises ?? []).map((e) => ({
      key: uid(), exerciseId: e.exerciseId, notes: e.notes, showNotes: !!e.notes, restSec: e.restSec, superset: e.superset,
      sets: (e.sets.length ? e.sets : [{ type: "normal", weight: null, reps: null }]).map((s) =>
        newSet((s.type as SetType) ?? "normal", s.weight != null ? String(s.weight) : "", s.reps != null ? String(s.reps) : ""),
      ),
    })),
  };
}

export function WorkoutClient({ library, routine, defaultVisibility }: { library: ExerciseLite[]; routine: RoutineSeed | null; bodyweightKg: number | null; userName: string; defaultVisibility: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const { workout, ready, update, set } = useLiveWorkout();
  const [extra, setExtra] = useState<ExerciseLite[]>([]);
  const lib = useMemo(() => new Map([...library, ...extra].map((e) => [e.id, e])), [library, extra]);
  const [conflict, setConflict] = useState(false);
  const [prev, setPrev] = useState<Prev>({});
  const [bests, setBests] = useState<Bests>({});
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "replace"; key: string } | null>(null);
  const [setMenu, setSetMenu] = useState<{ ex: string; set: string } | null>(null);
  const [exMenu, setExMenu] = useState<string | null>(null);
  const [restMenu, setRestMenu] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [info, setInfo] = useState<ExerciseLite | null>(null);
  const now = useNow(rest ? 250 : 1000);

  // Start (or resume) on mount.
  useEffect(() => {
    if (!ready) return;
    const cur = readLive();
    if (!cur) set(fromRoutine(routine, t));
    else if (routine && cur.routineId !== routine.id) setConflict(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Keep the screen awake while training (where supported).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  // Previous-session sets and bests for every exercise in the workout.
  const idsKey = workout ? [...new Set(workout.exercises.map((e) => e.exerciseId))].sort().join(",") : "";
  useEffect(() => {
    if (!idsKey) return;
    fetch(`/api/gym/previous?ids=${idsKey}`).then((r) => r.json()).then((j) => { setPrev(j.previous ?? {}); setBests(j.bests ?? {}); }).catch(() => {});
  }, [idsKey]);

  // Rest timer end: buzz + a short tone.
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const firedRef = useRef(false);
  useEffect(() => {
    if (!rest) { firedRef.current = false; return; }
    if (restLeft === 0 && !firedRef.current) {
      firedRef.current = true;
      navigator.vibrate?.([180, 80, 180]);
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.5);
      } catch {}
      setTimeout(() => setRest(null), 1200);
    }
  }, [rest, restLeft]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  if (!ready || !workout) return <div className="py-24 text-center text-muted"><Loader2 className="mx-auto size-6 animate-spin" /></div>;

  const elapsed = Math.max(0, Math.floor((now - workout.startedAt) / 1000));
  let volume = 0, doneSets = 0;
  for (const e of workout.exercises) {
    const kind = lib.get(e.exerciseId)?.kind ?? "weight_reps";
    for (const s of e.sets) if (s.done) { doneSets++; volume += setVolume(kind, num(s.weight), num(s.reps)); }
  }

  const patchEx = (key: string, fn: (e: LiveExercise) => LiveExercise) => update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.key === key ? fn(e) : e)) }));
  const patchSet = (exKey: string, setKey: string, fn: (s: LiveSet) => LiveSet) =>
    patchEx(exKey, (e) => ({ ...e, sets: e.sets.map((s) => (s.key === setKey ? fn(s) : s)) }));

  const isPr = (exId: string, kind: string, s: LiveSet) => {
    if (!s.done || s.type === "warmup") return false;
    const b = bests[exId];
    if (!b) return false;
    const w = num(s.weight) ?? 0, r = num(s.reps) ?? 0;
    if (kind === "weight_reps" || kind === "weighted_bodyweight") return e1rm(w, r) > b.e1rm || w > b.weight;
    if (kind === "bodyweight") return r > b.reps;
    return false;
  };

  const toggleDone = (ex: LiveExercise, s: LiveSet, index: number) => {
    const kind = lib.get(ex.exerciseId)?.kind ?? "weight_reps";
    if (s.done) { patchSet(ex.key, s.key, (x) => ({ ...x, done: false })); return; }
    const p = prev[ex.exerciseId]?.[index] ?? prev[ex.exerciseId]?.at(-1);
    const weight = s.weight || (p?.weightKg != null ? fmtKg(p.weightKg) : "");
    const reps = s.reps || (p?.reps != null ? String(p.reps) : "");
    const time = s.time || (p?.durationSec != null ? fmtClock(p.durationSec) : "");
    if (kind === "duration" ? !parseTime(time) : !num(reps)) { navigator.vibrate?.(40); return; }
    const next = { ...s, weight, reps, time, done: true };
    patchSet(ex.key, s.key, () => next);
    navigator.vibrate?.(12);
    if (isPr(ex.exerciseId, kind, next)) flash(t.gym.newPr);
    // Rest after the set — not between exercises of a superset, and not before a drop set.
    const idx = workout.exercises.findIndex((e) => e.key === ex.key);
    const nextEx = workout.exercises[idx + 1];
    const inSuperset = ex.superset != null && nextEx?.superset === ex.superset;
    const nextSet = ex.sets[index + 1];
    if (ex.restSec > 0 && !inSuperset && nextSet?.type !== "drop") setRest({ endsAt: Date.now() + ex.restSec * 1000, total: ex.restSec });
  };

  const addExercises = (ids: string[]) =>
    update((w) => ({
      ...w,
      exercises: [...w.exercises, ...ids.map((id) => ({ key: uid(), exerciseId: id, notes: "", showNotes: false, restSec: 90, superset: null, sets: [newSet()] }))],
    }));

  const save = async (opts: { name: string; notes: string; photo: PickedPhoto; share: boolean; visibility: string }) => {
    const photoUrl = opts.photo ? await uploadImage(opts.photo.blob) : null;
    const exercises = workout.exercises
      .map((e) => ({
        exerciseId: e.exerciseId, notes: e.notes || undefined, superset: e.superset,
        sets: e.sets.filter((s) => s.done).map((s) => ({
          type: s.type, weight: num(s.weight), reps: num(s.reps) != null ? Math.round(num(s.reps)!) : null,
          durationSec: parseTime(s.time), rpe: num(s.rpe),
        })),
      }))
      .filter((e) => e.sets.length);
    const res = await finishWorkout({
      name: opts.name || workout.name, notes: opts.notes, routineId: workout.routineId, startedAt: workout.startedAt, endedAt: Date.now(),
      photoUrl, share: opts.share, visibility: opts.visibility as "friends", exercises,
    });
    set(null);
    router.push(`/gym/history/${res.id}?done=1`);
    router.refresh();
  };

  const L = locale === "el" ? "el" : "en";

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-bg/85 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] backdrop-blur-xl md:-mx-10 md:px-10">
        <div className="flex items-center gap-2">
          <Link href="/gym" className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Minimize">
            <ChevronDown className="size-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-extrabold">{workout.name}</div>
            <div className="tabular text-[12px] font-semibold text-muted">{fmtClock(elapsed)}</div>
          </div>
          <Button size="sm" className="h-10 px-5" onClick={() => (doneSets ? setFinishing(true) : flash(t.gym.nothingDone))}>{t.gym.finish}</Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { l: t.gym.duration, v: fmtClock(elapsed) },
            { l: t.gym.volume, v: `${fmt(volume)} kg` },
            { l: t.gym.sets, v: String(doneSets) },
          ].map((x) => (
            <div key={x.l} className="edge rounded-2xl py-2">
              <div className="tabular text-[15px] font-extrabold">{x.v}</div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercises */}
      <div className="mt-4 space-y-4">
        {workout.exercises.map((ex, exIndex) => {
          const meta = lib.get(ex.exerciseId);
          const kind = meta?.kind ?? "weight_reps";
          const prevSets = prev[ex.exerciseId] ?? [];
          const supersetTop = ex.superset != null && workout.exercises[exIndex - 1]?.superset === ex.superset;
          const supersetBottom = ex.superset != null && workout.exercises[exIndex + 1]?.superset === ex.superset;
          let normalNo = 0;
          return (
            <section key={ex.key} className={cn("card relative overflow-hidden", (supersetTop || supersetBottom || ex.superset != null) && "pl-1.5", supersetTop && "-mt-2")}>
              {ex.superset != null && <span className="varnish absolute inset-y-0 left-0 w-1.5" aria-hidden />}
              <div className="flex items-center gap-2 px-4 pb-2 pt-4">
                <button onClick={() => meta && setInfo(meta)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ExerciseThumb media={meta?.media} name={meta ? exerciseName(meta, locale) : "?"} size={44} />
                  <span className="min-w-0">
                    {ex.superset != null && !supersetTop && <span className="block text-[10.5px] font-black uppercase tracking-[0.12em] text-muted">Superset</span>}
                    <span className="block truncate text-[16px] font-extrabold">{meta ? exerciseName(meta, locale) : "…"}</span>
                    <span className="block text-[12px] font-semibold text-faint">{meta ? MUSCLE_LABEL[meta.muscle as Muscle]?.[L] : ""}</span>
                  </span>
                </button>
                <button onClick={() => setRestMenu(ex.key)} className="press edge flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold">
                  <Timer className="size-3.5" /> {ex.restSec ? fmtClock(ex.restSec) : t.gym.restOff}
                </button>
                <button onClick={() => setExMenu(ex.key)} className="press grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="More">
                  <Ellipsis className="size-[18px]" />
                </button>
              </div>
              {ex.showNotes && (
                <div className="px-4 pb-2">
                  <input
                    value={ex.notes} onChange={(e) => patchEx(ex.key, (x) => ({ ...x, notes: e.target.value }))} placeholder={t.gym.notes} maxLength={300}
                    className="h-9 w-full rounded-xl bg-surface-2 px-3 text-[16px] font-medium outline-none placeholder:text-faint focus:ring-2 focus:ring-text"
                  />
                </div>
              )}

              {/* Set table */}
              <div className="px-2 pb-2">
                <div className={cn("grid items-center gap-1.5 px-2 pb-1 text-[10.5px] font-black uppercase tracking-[0.08em] text-faint", gridFor(kind))}>
                  <span className="text-center">{t.gym.set}</span>
                  <span>{t.gym.previous}</span>
                  {kind === "duration" ? <span className="text-center">{t.gym.time}</span> : (
                    <>
                      {kind !== "bodyweight" && <span className="text-center">{kind === "assisted" ? "−kg" : kind === "weighted_bodyweight" ? "+kg" : "kg"}</span>}
                      <span className="text-center">{t.gym.reps}</span>
                    </>
                  )}
                  <span className="grid place-items-center"><Check className="size-3.5" strokeWidth={3} /></span>
                </div>
                {ex.sets.map((s, i) => {
                  if (s.type === "normal") normalNo++;
                  const p = prevSets[i];
                  const pr = isPr(ex.exerciseId, kind, s);
                  const label = s.type === "normal" ? String(normalNo) : s.type === "warmup" ? "W" : s.type === "failure" ? "F" : "D";
                  return (
                    <div key={s.key} className={cn("grid items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors", gridFor(kind), s.done && "bg-surface-2")}>
                      <button
                        onClick={() => setSetMenu({ ex: ex.key, set: s.key })}
                        className={cn("press grid h-8 place-items-center rounded-lg text-[13px] font-black", s.type === "normal" ? "text-text" : "text-muted", s.type !== "normal" && "edge-strong")}
                      >
                        {label}
                      </button>
                      <button
                        onClick={() => p && patchSet(ex.key, s.key, (x) => ({ ...x, weight: p.weightKg != null ? fmtKg(p.weightKg) : x.weight, reps: p.reps != null ? String(p.reps) : x.reps, time: p.durationSec != null ? fmtClock(p.durationSec) : x.time }))}
                        className="truncate text-left text-[12.5px] font-semibold text-faint"
                      >
                        {p ? fmtSet(kind, p) : "—"}
                      </button>
                      {kind === "duration" ? (
                        <SetInput value={s.time} placeholder={p?.durationSec != null ? fmtClock(p.durationSec) : "0:00"} inputMode="numeric" onChange={(v) => patchSet(ex.key, s.key, (x) => ({ ...x, time: v }))} />
                      ) : (
                        <>
                          {kind !== "bodyweight" && (
                            <SetInput value={s.weight} placeholder={p?.weightKg != null ? fmtKg(p.weightKg) : "0"} inputMode="decimal" onChange={(v) => patchSet(ex.key, s.key, (x) => ({ ...x, weight: v }))} />
                          )}
                          <SetInput value={s.reps} placeholder={p?.reps != null ? String(p.reps) : "0"} inputMode="numeric" onChange={(v) => patchSet(ex.key, s.key, (x) => ({ ...x, reps: v.replace(/\D/g, "") }))} />
                        </>
                      )}
                      <button
                        onClick={() => toggleDone(ex, s, i)}
                        aria-label="Done"
                        className={cn("press relative grid h-8 place-items-center rounded-lg transition-colors", s.done ? "varnish" : "edge-strong text-faint")}
                      >
                        {pr ? <Trophy className="size-4" strokeWidth={2.6} /> : <Check className="size-4" strokeWidth={3} />}
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => patchEx(ex.key, (x) => {
                    const last = x.sets.at(-1);
                    return { ...x, sets: [...x.sets, newSet("normal", last?.weight ?? "", last?.reps ?? "")] };
                  })}
                  className="press mt-1.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-[13px] font-bold text-text hover:bg-surface-3"
                >
                  <Plus className="size-4" strokeWidth={2.6} /> {t.gym.addSet}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-5 space-y-2">
        <Button size="lg" className="w-full" onClick={() => setPicker({ mode: "add" })}><Plus className="size-5" strokeWidth={2.6} /> {t.gym.addExercise}</Button>
        <button onClick={() => setDiscarding(true)} className="press h-12 w-full rounded-2xl text-[14px] font-bold text-bad hover:bg-bad/10">{t.gym.discard}</button>
      </div>

      {/* Rest timer */}
      {rest && (
        <div className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+76px)] z-40 px-3 md:bottom-6 md:left-64">
          <div className="edge mx-auto flex max-w-md items-center gap-2 overflow-hidden rounded-[22px] p-2 shadow-2xl" style={{ ["--edge-fill" as string]: "var(--surface)" }}>
            <div className="relative grid flex-1 place-items-center">
              <div className="absolute inset-y-0 left-0 rounded-2xl bg-surface-3 transition-[width] duration-300 ease-linear" style={{ width: `${(restLeft / rest.total) * 100}%` }} />
              <div className="relative flex items-center gap-2 py-2 text-[15px] font-extrabold">
                <Timer className="size-4" /> <span className="tabular">{fmtClock(restLeft)}</span>
              </div>
            </div>
            <button onClick={() => setRest((r) => r && { ...r, endsAt: Math.max(Date.now(), r.endsAt - 15000) })} className="press edge-strong h-10 rounded-xl px-3 text-[13px] font-bold"><Minus className="inline size-3.5" />15</button>
            <button onClick={() => setRest((r) => r && { endsAt: r.endsAt + 15000, total: r.total + 15 })} className="press edge-strong h-10 rounded-xl px-3 text-[13px] font-bold"><Plus className="inline size-3.5" />15</button>
            <button onClick={() => setRest(null)} className="press varnish h-10 rounded-xl px-3.5 text-[13px] font-bold">{t.gym.skip}</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="animate-rise fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+16px)] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-text px-5 py-3 text-[14px] font-bold text-bg shadow-2xl">
          {toast === t.gym.newPr && <Trophy className="size-4" />} {toast}
        </div>
      )}

      {/* Sheets */}
      <ExerciseInfoSheet exercise={info} onClose={() => setInfo(null)} />
      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        library={[...library, ...extra]}
        multi={picker?.mode !== "replace"}
        onCreated={(e) => setExtra((x) => [...x, e])}
        onPick={(ids) => {
          if (picker?.mode === "replace") {
            const key = picker.key;
            patchEx(key, (x) => ({ ...x, exerciseId: ids[0], sets: x.sets.map((s) => ({ ...s, done: false })) }));
          } else addExercises(ids);
        }}
      />

      <Sheet open={!!setMenu} onClose={() => setSetMenu(null)} title={t.gym.set}>
        {setMenu && (
          <div className="space-y-2">
            {(["warmup", "normal", "failure", "drop"] as const).map((ty) => (
              <MenuRow key={ty} label={t.gym[ty]} badge={ty === "normal" ? "1" : ty === "warmup" ? "W" : ty === "failure" ? "F" : "D"} onClick={() => { patchSet(setMenu.ex, setMenu.set, (s) => ({ ...s, type: ty })); setSetMenu(null); }} />
            ))}
            <MenuRow danger icon={<Trash2 className="size-4" />} label={t.gym.deleteSet} onClick={() => { patchEx(setMenu.ex, (e) => ({ ...e, sets: e.sets.filter((s) => s.key !== setMenu.set) })); setSetMenu(null); }} />
          </div>
        )}
      </Sheet>

      <Sheet open={!!exMenu} onClose={() => setExMenu(null)} title={exMenu ? exerciseName(lib.get(workout.exercises.find((e) => e.key === exMenu)?.exerciseId ?? "") ?? { name: "", nameEl: null } as ExerciseLite, locale) : ""}>
        {exMenu && (() => {
          const i = workout.exercises.findIndex((e) => e.key === exMenu);
          const ex = workout.exercises[i];
          if (!ex) return null;
          const move = (d: number) => update((w) => {
            const xs = [...w.exercises];
            const j = i + d;
            if (j < 0 || j >= xs.length) return w;
            [xs[i], xs[j]] = [xs[j], xs[i]];
            return { ...w, exercises: xs };
          });
          const nextEx = workout.exercises[i + 1];
          const linked = ex.superset != null && nextEx?.superset === ex.superset;
          return (
            <div className="space-y-2">
              <MenuRow icon={<NotebookPen className="size-4" />} label={t.gym.addNote} onClick={() => { patchEx(ex.key, (x) => ({ ...x, showNotes: true })); setExMenu(null); }} />
              <MenuRow icon={<Repeat className="size-4" />} label={t.gym.replace} onClick={() => { setExMenu(null); setPicker({ mode: "replace", key: ex.key }); }} />
              {nextEx && (
                <MenuRow
                  icon={linked ? <Link2Off className="size-4" /> : <Link2 className="size-4" />}
                  label={linked ? t.gym.unsuperset : t.gym.superset}
                  onClick={() => {
                    update((w) => {
                      const xs = w.exercises.map((x) => ({ ...x }));
                      if (linked) { xs[i + 1].superset = null; if (xs[i - 1]?.superset !== xs[i].superset) xs[i].superset = null; }
                      else { const g = xs[i].superset ?? Date.now() % 100000; xs[i].superset = g; xs[i + 1].superset = g; }
                      return { ...w, exercises: xs };
                    });
                    setExMenu(null);
                  }}
                />
              )}
              {i > 0 && <MenuRow icon={<ArrowUp className="size-4" />} label={t.gym.moveUp} onClick={() => { move(-1); setExMenu(null); }} />}
              {i < workout.exercises.length - 1 && <MenuRow icon={<ArrowDown className="size-4" />} label={t.gym.moveDown} onClick={() => { move(1); setExMenu(null); }} />}
              <MenuRow danger icon={<X className="size-4" />} label={t.gym.remove} onClick={() => { update((w) => ({ ...w, exercises: w.exercises.filter((x) => x.key !== ex.key) })); setExMenu(null); }} />
            </div>
          );
        })()}
      </Sheet>

      <Sheet open={!!restMenu} onClose={() => setRestMenu(null)} title={t.gym.restTimer}>
        {restMenu && (
          <div className="grid grid-cols-4 gap-2">
            {REST_OPTIONS.map((r) => {
              const active = workout.exercises.find((e) => e.key === restMenu)?.restSec === r;
              return (
                <button key={r} onClick={() => { patchEx(restMenu, (x) => ({ ...x, restSec: r })); setRestMenu(null); }} className={cn("press h-12 rounded-2xl text-[14px] font-bold", active ? "varnish" : "edge")}>
                  {r ? fmtClock(r) : t.gym.restOff}
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      <FinishSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        workout={workout}
        stats={{ elapsed, volume, sets: doneSets, prs: workout.exercises.reduce((n, e) => n + e.sets.filter((s) => isPr(e.exerciseId, lib.get(e.exerciseId)?.kind ?? "weight_reps", s)).length, 0) }}
        defaultVisibility={defaultVisibility}
        onSave={save}
      />

      <Sheet open={discarding} onClose={() => setDiscarding(false)} title={t.gym.discard}>
        <p className="text-[15px] text-muted">{t.gym.discardConfirm}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setDiscarding(false)}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={() => { set(null); router.push("/gym"); }}>{t.common.delete}</Button>
        </div>
      </Sheet>

      <Sheet open={conflict} onClose={() => setConflict(false)} title={t.gym.inProgress}>
        <p className="text-[15px] text-muted">{workout.name} · {fmtClock(elapsed)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConflict(false)}>{t.gym.resume}</Button>
          <Button onClick={() => { set(fromRoutine(routine, t)); setConflict(false); }}>{t.gym.start} {routine?.name}</Button>
        </div>
      </Sheet>
    </div>
  );
}

function gridFor(kind: string) {
  if (kind === "bodyweight" || kind === "duration") return "grid-cols-[34px_1fr_72px_40px]";
  return "grid-cols-[34px_1fr_64px_56px_40px]";
}

function SetInput({ value, placeholder, onChange, inputMode }: { value: string; placeholder: string; onChange: (v: string) => void; inputMode: "decimal" | "numeric" }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      enterKeyHint="next"
      className="tabular h-8 w-full min-w-0 rounded-lg bg-surface-2 text-center text-[16px] font-bold outline-none placeholder:font-semibold placeholder:text-faint focus:bg-surface focus:ring-2 focus:ring-text"
    />
  );
}

function MenuRow({ label, onClick, icon, badge, danger }: { label: string; onClick: () => void; icon?: React.ReactNode; badge?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("press flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-bold", danger ? "bg-bad/10 text-bad" : "edge")}>
      {badge ? <span className="edge-strong grid size-7 place-items-center rounded-lg text-[12px] font-black">{badge}</span> : icon}
      {label}
    </button>
  );
}

function FinishSheet({ open, onClose, workout, stats, defaultVisibility, onSave }: {
  open: boolean; onClose: () => void; workout: LiveWorkout; stats: { elapsed: number; volume: number; sets: number; prs: number }; defaultVisibility: string;
  onSave: (o: { name: string; notes: string; photo: PickedPhoto; share: boolean; visibility: string }) => Promise<void>;
}) {
  const { t } = useT();
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<PickedPhoto>(null);
  const [share, setShare] = useState(true);
  const [vis, setVis] = useState(defaultVisibility);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title={t.gym.saveWorkout}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: t.gym.duration, v: fmtClock(stats.elapsed) },
            { l: t.gym.volume, v: fmt(stats.volume) },
            { l: t.gym.sets, v: String(stats.sets) },
            { l: t.gym.prs, v: String(stats.prs) },
          ].map((x) => (
            <div key={x.l} className="edge rounded-2xl py-2.5">
              <div className="tabular text-[16px] font-extrabold">{x.v}</div>
              <div className="truncate px-1 text-[10px] font-bold uppercase tracking-[0.06em] text-faint">{x.l}</div>
            </div>
          ))}
        </div>
        <Field label={t.gym.workoutName}><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <Textarea placeholder={t.social.composer} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="min-h-20" />
        <PhotoPicker value={photo} onChange={setPhoto} compact />
        <button type="button" onClick={() => setShare(!share)} className="flex w-full items-center justify-between gap-4 py-1 text-left">
          <span className="text-[15px] font-bold">{t.gym.shareToFeed}</span>
          <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", share ? "varnish" : "bg-surface-3")}>
            <span className={cn("absolute top-1 size-5 rounded-full shadow transition-all", share ? "left-6 bg-bg" : "left-1 bg-white")} />
          </span>
        </button>
        {share && <VisibilityPicker value={vis} onChange={setVis} />}
        {error && <p className="text-[13px] font-semibold text-bad">{t.common.error}</p>}
        <Button
          size="lg" className="w-full" disabled={pending}
          onClick={() => start(async () => { setError(false); try { await onSave({ name, notes, photo, share, visibility: vis }); } catch { setError(true); } })}
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : t.gym.saveWorkout}
        </Button>
      </div>
    </Sheet>
  );
}
