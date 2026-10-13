"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { createExercise } from "@/app/actions/gym";
import { EQUIPMENT, EQUIPMENT_LABEL, KINDS, MUSCLE_LABEL, MUSCLES, type Muscle } from "@/lib/gym";
import { useT } from "../i18n-provider";
import { Sheet } from "../sheet";
import { Button, cn, Field, Input, Select } from "../ui";

export type ExerciseLite = { id: string; name: string; nameEl: string | null; muscle: string; secondary: string; equipment: string; kind: string; custom?: boolean };

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function exerciseName(e: ExerciseLite, locale: string) {
  return locale === "el" && e.nameEl ? e.nameEl : e.name;
}

/** Bottom sheet to pick one or many exercises from the library (or create a custom one). */
export function ExercisePicker({ open, onClose, library, onPick, multi = true, onCreated }: {
  open: boolean; onClose: () => void; library: ExerciseLite[]; onPick: (ids: string[]) => void; multi?: boolean; onCreated?: (e: ExerciseLite) => void;
}) {
  const { t, locale } = useT();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const n = strip(q.trim());
    return library
      .filter((e) => (muscle === "all" || e.muscle === muscle) && (!n || strip(`${e.nameEl ?? ""} ${e.name}`).includes(n)))
      .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || exerciseName(a, locale).localeCompare(exerciseName(b, locale), locale));
  }, [library, q, muscle, locale]);

  const close = () => { setPicked([]); setQ(""); onClose(); };
  const toggle = (id: string) => {
    if (!multi) { onPick([id]); close(); return; }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Sheet open={open} onClose={close} title={t.gym.addExercise}>
      <div className="min-h-[70dvh]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" strokeWidth={2.4} />
          <Input data-autofocus="" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.gym.searchExercises} className="pl-11" autoComplete="off" autoCorrect="off" enterKeyHint="search" />
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {(["all", ...MUSCLES] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m)}
              className={cn("press h-8 shrink-0 rounded-full px-3 text-[12.5px] font-bold", muscle === m ? "varnish" : "edge text-muted")}
            >
              {m === "all" ? t.gym.allMuscles : MUSCLE_LABEL[m][locale === "el" ? "el" : "en"]}
            </button>
          ))}
        </div>

        <button onClick={() => setCreating(true)} className="press mt-3 flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left text-[14px] font-bold">
          <span className="edge-strong grid size-10 place-items-center rounded-xl"><Plus className="size-4" strokeWidth={2.6} /></span>
          {t.gym.createExercise}
        </button>

        <ul className="mt-1 divide-y divide-border">
          {list.map((e) => {
            const on = picked.includes(e.id);
            return (
              <li key={e.id}>
                <button onClick={() => toggle(e.id)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-black", on ? "varnish" : "edge-strong text-muted")}>
                    {on ? <Check className="size-4" strokeWidth={3} /> : exerciseName(e, locale).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{exerciseName(e, locale)}</span>
                    <span className="block truncate text-[12px] font-semibold text-faint">
                      {MUSCLE_LABEL[e.muscle as Muscle]?.[locale === "el" ? "el" : "en"] ?? e.muscle} · {EQUIPMENT_LABEL[e.equipment as keyof typeof EQUIPMENT_LABEL]?.[locale === "el" ? "el" : "en"] ?? e.equipment}
                      {e.custom ? ` · ${t.gym.custom}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {multi && picked.length > 0 && (
        <div className="sticky bottom-0 -mx-5 mt-2 border-t border-border bg-surface/95 px-5 pt-3 backdrop-blur">
          <Button size="lg" className="w-full" onClick={() => { onPick(picked); close(); }}>
            {t.gym.add} · {picked.length} {t.gym.selected}
          </Button>
        </div>
      )}

      <CreateExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(e) => { onCreated?.(e); setCreating(false); if (multi) setPicked((p) => [...p, e.id]); else { onPick([e.id]); close(); } }}
        initialName={q}
      />
    </Sheet>
  );
}

function CreateExerciseSheet({ open, onClose, onCreated, initialName }: { open: boolean; onClose: () => void; onCreated: (e: ExerciseLite) => void; initialName: string }) {
  const { t, locale } = useT();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>("chest");
  const [equipment, setEquipment] = useState<string>("barbell");
  const [kind, setKind] = useState<string>("weight_reps");
  const [pending, start] = useTransition();
  const L = locale === "el" ? "el" : "en";
  return (
    <Sheet open={open} onClose={onClose} title={t.gym.createExercise}>
      <div className="space-y-4">
        <Field label={t.workouts.name}><Input data-autofocus="" defaultValue={initialName} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.gym.primaryMuscle}>
            <Select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              {MUSCLES.map((m) => <option key={m} value={m}>{MUSCLE_LABEL[m][L]}</option>)}
            </Select>
          </Field>
          <Field label={t.gym.equipment}>
            <Select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              {EQUIPMENT.map((m) => <option key={m} value={m}>{EQUIPMENT_LABEL[m][L]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t.gym.kind}>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k} value={k}>{t.gym.kinds[k]}</option>)}
          </Select>
        </Field>
        <Button
          size="lg" className="w-full" disabled={pending || (name || initialName).trim().length < 2}
          onClick={() => start(async () => onCreated(await createExercise({ name: (name || initialName).trim(), muscle, equipment, kind })))}
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : t.common.save}
        </Button>
      </div>
    </Sheet>
  );
}
