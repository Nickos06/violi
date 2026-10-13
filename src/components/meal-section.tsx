"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Share2, Sparkles, Trash2 } from "lucide-react";
import { deleteLog, moveLog, updateLogGrams } from "@/app/actions/food";
import { shareMeal } from "@/app/actions/social";
import { useT } from "./i18n-provider";
import { Sheet } from "./sheet";
import { Button, Card, cn, fmt, Input, Select, Textarea } from "./ui";

type Log = { id: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; source: string; photoUrl: string | null };
const MEAL_ICON = { breakfast: "☕", lunch: "🍝", dinner: "🍽️", snack: "🍎" } as const;

export function MealSection({ meal, date, logs, canShare, defaultVisibility }: { meal: keyof typeof MEAL_ICON; date: string; logs: Log[]; canShare: boolean; defaultVisibility: string }) {
  const { t } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Log | null>(null);
  const [sharing, setSharing] = useState(false);
  const total = logs.reduce((s, l) => s + l.kcal, 0);
  const photo = logs.find((l) => l.photoUrl)?.photoUrl;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <span>{MEAL_ICON[meal]}</span> {t.meals[meal]}
          {total > 0 && <span className="tabular text-[13px] font-medium text-muted">· {fmt(total)} kcal</span>}
        </h2>
        <div className="flex items-center gap-1">
          {canShare && logs.length > 0 && (
            <button onClick={() => setSharing(true)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label={t.log.shareMeal}>
              <Share2 className="size-4" />
            </button>
          )}
          <Link href={`/log?meal=${meal}&d=${date}`} className="grid size-8 place-items-center rounded-full bg-surface-2 text-text hover:bg-surface-3" aria-label={t.today.addFood}>
            <Plus className="size-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <Link href={`/log?meal=${meal}&d=${date}`} className="flex items-center gap-3 px-4 py-3.5 text-[14px] text-faint transition hover:bg-surface-2">
            <Plus className="size-4" /> {t.today.addFood}
          </Link>
        ) : (
          <ul className="divide-y divide-border">
            {photo && (
              <li>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-36 w-full object-cover" />
              </li>
            )}
            {logs.map((l) => (
              <li key={l.id}>
                <button onClick={() => setEditing(l)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-[14px] font-medium">
                      {(l.source === "ai_photo" || l.source === "ai_text") && <Sparkles className="size-3.5 shrink-0 text-accent" />}
                      <span className="truncate">{l.name}</span>
                    </div>
                    <div className="tabular mt-0.5 text-[12px] text-muted">
                      {l.grams > 0 && `${fmt(l.grams)} g · `}
                      <span style={{ color: "var(--protein)" }}>P {fmt(l.protein)}</span> · <span style={{ color: "var(--carbs)" }}>C {fmt(l.carbs)}</span> · <span style={{ color: "var(--fat)" }}>F {fmt(l.fat)}</span>
                    </div>
                  </div>
                  <div className="tabular text-[14px] font-semibold">{fmt(l.kcal)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditLogSheet log={editing} onClose={() => { setEditing(null); router.refresh(); }} />
      <ShareMealSheet open={sharing} onClose={() => setSharing(false)} date={date} meal={meal} defaultVisibility={defaultVisibility} photo={photo} total={total} />
    </section>
  );
}

function EditLogSheet({ log, onClose }: { log: Log | null; onClose: () => void }) {
  const { t } = useT();
  const [grams, setGrams] = useState("");
  const [pending, start] = useTransition();
  const g = Number(grams || log?.grams || 0);
  const f = log && log.grams > 0 ? g / log.grams : 1;
  return (
    <Sheet open={!!log} onClose={onClose} title={log?.name}>
      {log && (
        <div className="space-y-4" key={log.id}>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { l: "kcal", v: log.kcal * f, c: "var(--text)" },
              { l: t.macros.protein, v: log.protein * f, c: "var(--protein)" },
              { l: t.macros.carbs, v: log.carbs * f, c: "var(--carbs)" },
              { l: t.macros.fat, v: log.fat * f, c: "var(--fat)" },
            ].map((m) => (
              <div key={m.l} className="rounded-2xl bg-surface-2 py-2.5">
                <div className="tabular text-[17px] font-bold" style={{ color: m.c }}>{fmt(m.v)}</div>
                <div className="truncate px-1 text-[11px] text-muted">{m.l}</div>
              </div>
            ))}
          </div>
          {log.grams > 0 && (
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="decimal" defaultValue={log.grams} onChange={(e) => setGrams(e.target.value)} className="text-center text-lg font-semibold" />
              <span className="text-muted">g</span>
            </div>
          )}
          <Select defaultValue="" onChange={(e) => e.target.value && start(async () => { await moveLog(log.id, e.target.value); onClose(); })}>
            <option value="" disabled>↔ {t.common.edit}…</option>
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => <option key={m} value={m}>{t.meals[m]}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" disabled={pending} onClick={() => start(async () => { await deleteLog(log.id); onClose(); })}>
              <Trash2 className="size-4" /> {t.common.delete}
            </Button>
            {log.grams > 0 && (
              <Button className="flex-1" disabled={pending || !grams} onClick={() => start(async () => { await updateLogGrams(log.id, Number(grams)); setGrams(""); onClose(); })}>
                {t.common.save}
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function VisibilityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  const opts = [
    { v: "public", l: `🌍 ${t.social.public}` },
    { v: "friends", l: `👥 ${t.social.friendsOnly}` },
    { v: "private", l: `🔒 ${t.social.private}` },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
      {opts.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("h-9 rounded-lg text-[13px] font-semibold transition", value === o.v ? "bg-surface text-text shadow" : "text-muted")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ShareMealSheet({ open, onClose, date, meal, defaultVisibility, photo, total }: { open: boolean; onClose: () => void; date: string; meal: string; defaultVisibility: string; photo?: string | null; total: number }) {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title={t.log.shareMeal}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <div className="grid size-12 place-items-center rounded-xl bg-surface-3"><Camera className="size-5 text-muted" /></div>
          )}
          <div>
            <div className="font-semibold">{t.meals[meal as keyof typeof t.meals]}</div>
            <div className="tabular text-[13px] text-muted">{fmt(total)} kcal</div>
          </div>
        </div>
        <Textarea placeholder={t.social.composer} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <VisibilityPicker value={vis} onChange={setVis} />
        <Button className="w-full" disabled={pending} onClick={() => start(async () => { await shareMeal({ date, meal, text, visibility: vis }); onClose(); router.push("/social"); })}>
          {t.social.post}
        </Button>
      </div>
    </Sheet>
  );
}
