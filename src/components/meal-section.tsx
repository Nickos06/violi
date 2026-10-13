"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, ChefHat, Ellipsis, Plus, Share2, Sparkles, Trash2, Camera, Globe, Users, Lock } from "lucide-react";
import { deleteLog, moveLog, updateLogGrams } from "@/app/actions/food";
import { shareMeal } from "@/app/actions/social";
import { saveMealFromLogs } from "@/app/actions/meals";
import { useT } from "./i18n-provider";
import { Sheet } from "./sheet";
import { MEAL_SLOT_ICON, MEAL_SLOT_TONE } from "./icons";
import { Button, Card, cn, fmt, IconTile, Input, Textarea } from "./ui";
import { PhotoPicker, type PickedPhoto } from "./photo-picker";
import { uploadImage } from "@/lib/image-client";

type Log = { id: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; source: string; photoUrl: string | null };
type Slot = "breakfast" | "lunch" | "dinner" | "snack";

export function MealSection({ meal, date, logs, canShare, defaultVisibility, hasSavedMeals }: { meal: Slot; date: string; logs: Log[]; canShare: boolean; defaultVisibility: string; hasSavedMeals: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Log | null>(null);
  const [menu, setMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const total = logs.reduce((s, l) => s + l.kcal, 0);
  const protein = logs.reduce((s, l) => s + l.protein, 0);
  const photo = logs.find((l) => l.photoUrl)?.photoUrl;
  const Icon = MEAL_SLOT_ICON[meal];

  return (
    <section className="mt-7">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <IconTile tone={MEAL_SLOT_TONE[meal]} size={32} className="rounded-[11px]"><Icon className="size-[17px]" strokeWidth={2.2} /></IconTile>
          <h2 className="text-[16px] font-extrabold tracking-tight">{t.meals[meal]}</h2>
          {total > 0 && (
            <span className="tabular text-[13px] font-semibold text-muted">
              {fmt(total)} kcal · <span style={{ color: "var(--protein)" }}>{fmt(protein)}g P</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button onClick={() => setMenu(true)} className="press grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="More">
              <Ellipsis className="size-[18px]" />
            </button>
          )}
          <Link href={`/log?meal=${meal}&d=${date}${hasSavedMeals ? "&tab=meals" : ""}`} className="press grid size-9 place-items-center rounded-full bg-surface-2 text-text hover:bg-surface-3" aria-label={t.today.addFood}>
            <Plus className="size-[18px]" strokeWidth={2.6} />
          </Link>
        </div>
      </div>

      {logs.length === 0 ? (
        <Link href={`/log?meal=${meal}&d=${date}`} className="press flex h-14 items-center gap-2.5 rounded-[var(--radius-card)] border border-dashed border-border-strong px-4 text-[14px] font-semibold text-faint hover:border-accent/50 hover:text-muted">
          <Plus className="size-4" strokeWidth={2.4} /> {t.today.addFood}
        </Link>
      ) : (
        <Card className="overflow-hidden">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-40 w-full object-cover" />
          )}
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id}>
                <button onClick={() => setEditing(l)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[14.5px] font-semibold">
                      {(l.source === "ai_photo" || l.source === "ai_text") && <Sparkles className="size-3.5 shrink-0 text-accent" />}
                      {l.source === "meal" && <ChefHat className="size-3.5 shrink-0 text-accent" />}
                      <span className="truncate">{l.name}</span>
                    </div>
                    <div className="tabular mt-0.5 flex gap-2 text-[12px] font-semibold text-faint">
                      {l.grams > 0 && <span>{fmt(l.grams)} g</span>}
                      <span style={{ color: "var(--protein)" }}>P {fmt(l.protein)}</span>
                      <span style={{ color: "var(--carbs)" }}>C {fmt(l.carbs)}</span>
                      <span style={{ color: "var(--fat)" }}>F {fmt(l.fat)}</span>
                    </div>
                  </div>
                  <div className="tabular text-right text-[15px] font-extrabold">{fmt(l.kcal)}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={t.meals[meal]}>
        <div className="space-y-2">
          <MenuRow icon={<BookmarkPlus className="size-5" />} label={t.saved.saveAsMeal} onClick={() => { setMenu(false); setSaving(true); }} />
          {canShare && <MenuRow icon={<Share2 className="size-5" />} label={t.log.shareMeal} onClick={() => { setMenu(false); setSharing(true); }} />}
        </div>
      </Sheet>
      <EditLogSheet log={editing} onClose={() => { setEditing(null); router.refresh(); }} />
      <ShareMealSheet open={sharing} onClose={() => setSharing(false)} date={date} meal={meal} defaultVisibility={defaultVisibility} photo={photo} total={total} />
      <SaveMealSheet open={saving} onClose={() => setSaving(false)} date={date} meal={meal} count={logs.filter((l) => l.grams > 0).length} />
    </section>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-left text-[15px] font-bold hover:bg-surface-3">
      <span className="text-accent">{icon}</span> {label}
    </button>
  );
}

function MacroTiles({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  const { t } = useT();
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {[
        { l: "kcal", v: kcal, c: "var(--text)" },
        { l: t.macros.protein, v: protein, c: "var(--protein)" },
        { l: t.macros.carbs, v: carbs, c: "var(--carbs)" },
        { l: t.macros.fat, v: fat, c: "var(--fat)" },
      ].map((m) => (
        <div key={m.l} className="rounded-2xl bg-surface-2 py-3">
          <div className="tabular text-[19px] font-extrabold leading-none" style={{ color: m.c }}>{fmt(m.v)}</div>
          <div className="mt-1.5 truncate px-1 text-[11px] font-semibold text-muted">{m.l}</div>
        </div>
      ))}
    </div>
  );
}

export { MacroTiles };

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
          <MacroTiles kcal={log.kcal * f} protein={log.protein * f} carbs={log.carbs * f} fat={log.fat * f} />
          {log.grams > 0 && (
            <div className="relative">
              <Input type="number" inputMode="decimal" defaultValue={log.grams} onChange={(e) => setGrams(e.target.value)} className="h-16 pr-12 text-center text-2xl font-extrabold" />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-bold text-muted">g</span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-surface-2 p-1.5">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => {
              const I = MEAL_SLOT_ICON[m];
              return (
                <button
                  key={m}
                  onClick={() => start(async () => { await moveLog(log.id, m); onClose(); })}
                  className="press flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold text-muted hover:bg-surface hover:text-text"
                >
                  <I className="size-4" /> {t.meals[m]}
                </button>
              );
            })}
          </div>
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
    { v: "public", l: t.social.public, I: Globe },
    { v: "friends", l: t.social.friendsOnly, I: Users },
    { v: "private", l: t.social.private, I: Lock },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
      {opts.map(({ v, l, I }) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cn("press flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors", value === v ? "bg-surface text-text shadow-sm" : "text-muted")}>
          <I className="size-3.5" /> {l}
        </button>
      ))}
    </div>
  );
}

function ShareMealSheet({ open, onClose, date, meal, defaultVisibility, photo, total }: { open: boolean; onClose: () => void; date: string; meal: Slot; defaultVisibility: string; photo?: string | null; total: number }) {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [picked, setPicked] = useState<PickedPhoto>(null);
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title={t.log.shareMeal}>
      <div className="space-y-3">
        <PhotoPicker value={picked} onChange={setPicked} existing={photo} />
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <div className="grid size-11 place-items-center rounded-xl bg-surface-3"><Camera className="size-5 text-muted" /></div>
          <div>
            <div className="font-bold">{t.meals[meal]}</div>
            <div className="tabular text-[13px] font-semibold text-muted">{fmt(total)} kcal</div>
          </div>
        </div>
        <Textarea placeholder={t.social.composer} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <VisibilityPicker value={vis} onChange={setVis} />
        <Button className="w-full" disabled={pending} onClick={() => start(async () => {
            const photoUrl = picked ? await uploadImage(picked.blob) : undefined;
            await shareMeal({ date, meal, text, visibility: vis, photoUrl });
            onClose();
            router.push("/social");
          })}>
          {t.social.post}
        </Button>
      </div>
    </Sheet>
  );
}

function SaveMealSheet({ open, onClose, date, meal, count }: { open: boolean; onClose: () => void; date: string; meal: Slot; count: number }) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title={t.saved.saveAsMeal}>
      <div className="space-y-4">
        <p className="text-[14px] text-muted">{count} {t.saved.items} · {t.saved.subtitle}</p>
        <Input data-autofocus="" placeholder={t.saved.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Button
          size="lg"
          className="w-full"
          disabled={pending || !name.trim() || count === 0}
          onClick={() => start(async () => {
            const id = await saveMealFromLogs({ date, meal, name, icon: meal === "breakfast" ? "coffee" : meal === "snack" ? "apple" : "utensils" });
            onClose();
            router.push(`/meals/${id}`);
          })}
        >
          <BookmarkPlus className="size-5" /> {t.common.save}
        </Button>
      </div>
    </Sheet>
  );
}
