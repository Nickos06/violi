"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Timer, Trash2, X } from "lucide-react";
import { deleteRoutine, saveRoutine } from "@/app/actions/gym";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { Button, cn, Field, Input, Textarea } from "@/components/ui";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExercisePicker, exerciseName, type ExerciseLite } from "@/components/gym/exercise-picker";
import { fmtClock, MUSCLE_LABEL, REST_OPTIONS, SET_TYPES, type Muscle, type SetType } from "@/lib/gym";
import { uid } from "@/lib/live-workout";

type TSet = { key: string; type: SetType; weight: string; reps: string };
type TEx = { key: string; exerciseId: string; restSec: number; notes: string; sets: TSet[] };
export type RoutineInitial = { id: string; name: string; notes: string; exercises: { exerciseId: string; restSec: number; notes: string; sets: { type: string; weight: number | null; reps: number | null }[] }[] };

const tset = (type: SetType = "normal", weight = "", reps = ""): TSet => ({ key: uid(), type, weight, reps });

export function RoutineEditor({ library, initial }: { library: ExerciseLite[]; initial?: RoutineInitial }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [extra, setExtra] = useState<ExerciseLite[]>([]);
  const lib = new Map([...library, ...extra].map((e) => [e.id, e]));
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<TEx[]>(
    initial?.exercises.map((e) => ({
      key: uid(), exerciseId: e.exerciseId, restSec: e.restSec, notes: e.notes,
      sets: e.sets.map((s) => tset((s.type as SetType) ?? "normal", s.weight != null ? String(s.weight) : "", s.reps != null ? String(s.reps) : "")),
    })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [restFor, setRestFor] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const L = locale === "el" ? "el" : "en";

  const patch = (key: string, fn: (e: TEx) => TEx) => setItems((xs) => xs.map((x) => (x.key === key ? fn(x) : x)));
  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  const save = () =>
    start(async () => {
      const id = await saveRoutine({
        id: initial?.id, name, notes,
        exercises: items.map((e) => ({
          exerciseId: e.exerciseId, restSec: e.restSec, notes: e.notes || undefined,
          sets: e.sets.map((s) => ({ type: s.type, weight: n(s.weight), reps: n(s.reps) != null ? Math.round(n(s.reps)!) : null })),
        })),
      });
      router.push(`/gym?routine=${id}`);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <Field label={t.gym.routineName}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push · Pull · Legs" maxLength={80} /></Field>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.gym.notes} maxLength={500} className="min-h-16" />
      </div>

      {items.map((ex, i) => {
        const meta = lib.get(ex.exerciseId);
        const kind = meta?.kind ?? "weight_reps";
        let no = 0;
        return (
          <section key={ex.key} className="card overflow-hidden">
            <div className="flex items-start gap-2 px-4 pb-2 pt-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-extrabold">{meta ? exerciseName(meta, locale) : "…"}</div>
                <div className="text-[12px] font-semibold text-faint">{meta ? MUSCLE_LABEL[meta.muscle as Muscle]?.[L] : ""}</div>
              </div>
              <button onClick={() => setRestFor(ex.key)} className="press edge flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold">
                <Timer className="size-3.5" /> {ex.restSec ? fmtClock(ex.restSec) : t.gym.restOff}
              </button>
              <div className="flex">
                <IconBtn disabled={i === 0} onClick={() => setItems((xs) => { const c = [...xs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}><ArrowUp className="size-4" /></IconBtn>
                <IconBtn disabled={i === items.length - 1} onClick={() => setItems((xs) => { const c = [...xs]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })}><ArrowDown className="size-4" /></IconBtn>
                <IconBtn onClick={() => setItems((xs) => xs.filter((x) => x.key !== ex.key))}><X className="size-4" /></IconBtn>
              </div>
            </div>
            <div className="px-2 pb-2">
              <div className="grid grid-cols-[46px_1fr_1fr_36px] gap-1.5 px-2 pb-1 text-[10.5px] font-black uppercase tracking-[0.08em] text-faint">
                <span className="text-center">{t.gym.set}</span>
                <span className="text-center">{kind === "duration" ? t.gym.time : kind === "bodyweight" ? "—" : "kg"}</span>
                <span className="text-center">{kind === "duration" ? "" : t.gym.reps}</span>
                <span />
              </div>
              {ex.sets.map((s) => {
                if (s.type === "normal") no++;
                const label = s.type === "normal" ? String(no) : s.type === "warmup" ? "W" : s.type === "failure" ? "F" : "D";
                return (
                  <div key={s.key} className="grid grid-cols-[46px_1fr_1fr_36px] items-center gap-1.5 px-2 py-1">
                    <button
                      onClick={() => patch(ex.key, (x) => ({ ...x, sets: x.sets.map((y) => (y.key === s.key ? { ...y, type: SET_TYPES[(SET_TYPES.indexOf(y.type) + 1) % SET_TYPES.length] } : y)) }))}
                      className={cn("press grid h-8 place-items-center rounded-lg text-[13px] font-black", s.type !== "normal" && "edge-strong text-muted")}
                    >
                      {label}
                    </button>
                    <input
                      value={s.weight} onChange={(e) => patch(ex.key, (x) => ({ ...x, sets: x.sets.map((y) => (y.key === s.key ? { ...y, weight: e.target.value } : y)) }))}
                      inputMode="decimal" placeholder={kind === "bodyweight" ? "—" : "0"} disabled={kind === "bodyweight"}
                      className="tabular h-8 rounded-lg bg-surface-2 text-center text-[16px] font-bold outline-none placeholder:text-faint focus:ring-2 focus:ring-text disabled:opacity-40"
                    />
                    <input
                      value={s.reps} onChange={(e) => patch(ex.key, (x) => ({ ...x, sets: x.sets.map((y) => (y.key === s.key ? { ...y, reps: e.target.value.replace(/\D/g, "") } : y)) }))}
                      inputMode="numeric" placeholder="0" disabled={kind === "duration"}
                      className="tabular h-8 rounded-lg bg-surface-2 text-center text-[16px] font-bold outline-none placeholder:text-faint focus:ring-2 focus:ring-text disabled:opacity-40"
                    />
                    <IconBtn onClick={() => patch(ex.key, (x) => ({ ...x, sets: x.sets.filter((y) => y.key !== s.key) }))} disabled={ex.sets.length === 1}><Trash2 className="size-3.5" /></IconBtn>
                  </div>
                );
              })}
              <button
                onClick={() => patch(ex.key, (x) => { const last = x.sets.at(-1); return { ...x, sets: [...x.sets, tset("normal", last?.weight ?? "", last?.reps ?? "")] }; })}
                className="press mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-[13px] font-bold hover:bg-surface-3"
              >
                <Plus className="size-4" strokeWidth={2.6} /> {t.gym.addSet}
              </button>
            </div>
          </section>
        );
      })}

      <Button variant="secondary" size="lg" className="w-full" onClick={() => setPicking(true)}><Plus className="size-5" strokeWidth={2.6} /> {t.gym.addExercise}</Button>

      <div className="flex gap-2 pt-2">
        {initial && (
          <ConfirmDelete title={t.gym.deleteRoutine} onConfirm={async () => { await deleteRoutine(initial.id); router.push("/gym"); router.refresh(); }} />
        )}
        <Button size="lg" className="flex-1" disabled={pending || !name.trim() || items.length === 0} onClick={save}>
          {pending ? <Loader2 className="size-5 animate-spin" /> : t.common.save}
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        library={[...library, ...extra]}
        onCreated={(e) => setExtra((x) => [...x, e])}
        onPick={(ids) => setItems((xs) => [...xs, ...ids.map((id) => ({ key: uid(), exerciseId: id, restSec: 90, notes: "", sets: [tset(), tset(), tset()] }))])}
      />

      <Sheet open={!!restFor} onClose={() => setRestFor(null)} title={t.gym.restTimer}>
        <div className="grid grid-cols-4 gap-2">
          {REST_OPTIONS.map((r) => (
            <button key={r} onClick={() => { if (restFor) patch(restFor, (x) => ({ ...x, restSec: r })); setRestFor(null); }}
              className={cn("press h-12 rounded-2xl text-[14px] font-bold", items.find((x) => x.key === restFor)?.restSec === r ? "varnish" : "edge")}>
              {r ? fmtClock(r) : t.gym.restOff}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function IconBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="press grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25">
      {children}
    </button>
  );
}
