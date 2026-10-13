"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode, Camera, ChefHat, Check, ImagePlus, Loader2, MessageSquareText, Plus, RotateCcw, ScanLine, Search, Sparkles, Star, Trash2, Zap,
} from "lucide-react";
import { createFood, logEstimated, logFood, quickAdd, toggleFavorite } from "@/app/actions/food";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { FoodSearch, type PickedFood } from "@/components/food-search";
import { MacroTiles } from "@/components/meal-section";
import { SAVED_MEAL_ICON, MEAL_SLOT_ICON } from "@/components/icons";
import { Button, Card, cn, Field, fmt, IconTile, Input, Textarea } from "@/components/ui";
import type { FoodItem } from "@/lib/foods";
import type { MealEstimate } from "@/lib/ai";
import type { MealIconKey } from "@/lib/meal-icons";

type Tab = "search" | "meals" | "scan" | "describe" | "barcode" | "quick";
type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type SavedMealCard = { id: string; name: string; icon: string; items: number; totalGrams: number; portionG: number; food: FoodItem };

export function LogClient({ initialMeal, date, ai, initialTab, savedMeals }: { initialMeal: string; date: string; ai: boolean; initialTab: string; savedMeals: SavedMealCard[] }) {
  const { t } = useT();
  const router = useRouter();
  const [meal, setMeal] = useState<Meal>(initialMeal as Meal);
  const [tab, setTab] = useState<Tab>(initialTab as Tab);
  const [selected, setSelected] = useState<PickedFood | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<SavedMealCard | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const done = () => {
    setToast(t.log.logged);
    setTimeout(() => setToast(null), 1800);
    router.refresh();
  };

  const tabs: { k: Tab; label: string; icon: typeof Search }[] = [
    { k: "search", label: t.log.search, icon: Search },
    { k: "meals", label: t.nav.meals, icon: ChefHat },
    { k: "scan", label: t.log.scan, icon: Camera },
    { k: "describe", label: t.log.describe, icon: MessageSquareText },
    { k: "barcode", label: t.log.barcode, icon: Barcode },
    { k: "quick", label: t.log.quick, icon: Zap },
  ];

  return (
    <div className="animate-rise pt-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.log.title}</p>
          <h1 className="font-display text-[34px] font-semibold leading-tight">{t.meals[meal]}</h1>
        </div>
        <button onClick={() => router.push(`/today?d=${date}`)} className="press mb-1 h-9 rounded-full bg-surface-2 px-4 text-[14px] font-bold text-text hover:bg-surface-3">
          {t.common.done}
        </button>
      </div>

      {/* Meal slot */}
      <div className="mt-4 flex gap-1 rounded-2xl border border-border bg-surface/70 p-1">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => {
          const I = MEAL_SLOT_ICON[m];
          return (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={cn("press flex h-10 flex-auto items-center justify-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-bold transition-colors", meal === m ? "bg-text text-bg" : "text-muted hover:text-text")}
            >
              <I className="size-3.5 shrink-0 max-[420px]:hidden" strokeWidth={2.4} /> {t.meals[m]}
            </button>
          );
        })}
      </div>

      {/* Method */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "press flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors",
              tab === k ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" strokeWidth={2.3} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4" key={tab}>
        <div className="animate-rise">
          {tab === "search" && <FoodSearch onPick={setSelected} />}
          {tab === "meals" && <MealsTab meals={savedMeals} onPick={setSelectedMeal} />}
          {tab === "scan" && <AiTab mode="photo" ai={ai} meal={meal} date={date} onDone={done} />}
          {tab === "describe" && <AiTab mode="text" ai={ai} meal={meal} date={date} onDone={done} />}
          {tab === "barcode" && <BarcodeTab onPick={setSelected} />}
          {tab === "quick" && <QuickTab meal={meal} date={date} onDone={done} onCreated={setSelected} />}
        </div>
      </div>

      <FoodSheet item={selected} meal={meal} date={date} source={tab === "barcode" ? "barcode" : "search"} onClose={() => setSelected(null)} onLogged={() => { setSelected(null); done(); }} />
      <SavedMealSheet meal={selectedMeal} slot={meal} date={date} onClose={() => setSelectedMeal(null)} onLogged={() => { setSelectedMeal(null); done(); }} />

      {toast && (
        <div className="animate-rise fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-text px-5 py-3 text-[14px] font-bold text-bg shadow-2xl md:bottom-10">
          <Check className="size-4" strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}

// ---------------- Saved meals ----------------

function MealsTab({ meals, onPick }: { meals: SavedMealCard[]; onPick: (m: SavedMealCard) => void }) {
  const { t } = useT();
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {meals.map((m) => {
          const Icon = SAVED_MEAL_ICON[m.icon as MealIconKey] ?? ChefHat;
          return (
            <button key={m.id} onClick={() => onPick(m)} className="card press flex flex-col items-start gap-3 p-4 text-left">
              <IconTile size={42}><Icon className="size-5" strokeWidth={2.2} /></IconTile>
              <div className="w-full min-w-0">
                <div className="line-clamp-2 text-[14.5px] font-bold leading-snug">{m.name}</div>
                <div className="tabular mt-1 text-[12px] font-semibold text-faint">
                  {fmt(m.food.kcal)} kcal/100g · {m.items} {t.saved.items}
                </div>
              </div>
            </button>
          );
        })}
        <Link href="/meals/new" className="press flex min-h-[132px] flex-col items-start justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong p-4 text-muted hover:border-accent/50 hover:text-text">
          <div className="grid size-[42px] place-items-center rounded-[14px] bg-surface-2"><Plus className="size-5" strokeWidth={2.4} /></div>
          <span className="text-[14.5px] font-bold">{t.saved.new}</span>
        </Link>
      </div>
      {meals.length === 0 && <p className="mt-4 px-1 text-[13.5px] leading-relaxed text-muted">{t.saved.subtitle}</p>}
      {meals.length > 0 && (
        <Link href="/meals" className="mt-4 inline-block px-1 text-[13px] font-bold text-accent">{t.saved.manage} →</Link>
      )}
    </div>
  );
}

function SavedMealSheet({ meal, slot, date, onClose, onLogged }: { meal: SavedMealCard | null; slot: Meal; date: string; onClose: () => void; onLogged: () => void }) {
  const { t } = useT();
  const [grams, setGrams] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (meal) setGrams(String(Math.round(meal.portionG)));
  }, [meal]);
  const g = Number(grams) || 0;
  const f = g / 100;
  const Icon = meal ? SAVED_MEAL_ICON[meal.icon as MealIconKey] ?? ChefHat : ChefHat;
  const chips = meal
    ? Array.from(new Set([Math.round(meal.portionG), Math.round(meal.totalGrams / 2), Math.round(meal.totalGrams)])).filter((x) => x > 0).sort((a, b) => a - b)
    : [];
  return (
    <Sheet open={!!meal} onClose={onClose} title={meal && <span className="flex items-center gap-3"><IconTile size={38}><Icon className="size-5" /></IconTile>{meal.name}</span>}>
      {meal && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 px-1 text-[13px] font-bold text-muted">{t.saved.howMuch}</p>
            <div className="relative">
              <Input
                ref={inputRef} data-autofocus="" type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)}
                className="font-display h-20 pr-14 text-center text-[40px] font-semibold"
              />
              <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">g</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c} onClick={() => setGrams(String(c))} className={cn("press h-9 rounded-full px-3.5 text-[13px] font-bold", Number(grams) === c ? "bg-text text-bg" : "bg-surface-2 text-muted")}>
                  {c === Math.round(meal.totalGrams) ? `${t.saved.whole} · ${c} g` : c === Math.round(meal.portionG) ? `${t.saved.portionOf} · ${c} g` : `${c} g`}
                </button>
              ))}
            </div>
          </div>
          <MacroTiles kcal={meal.food.kcal * f} protein={meal.food.protein * f} carbs={meal.food.carbs * f} fat={meal.food.fat * f} />
          <Button
            size="lg" className="w-full" disabled={pending || g <= 0}
            onClick={() => start(async () => { await logFood({ item: meal.food, grams: g, meal: slot, date, source: "meal" }); onLogged(); })}
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : `${t.log.logIt} · ${fmt(meal.food.kcal * f)} kcal`}
          </Button>
          <Link href={`/meals/${meal.id}`} className="block text-center text-[13px] font-bold text-muted hover:text-text">{t.saved.edit}</Link>
        </div>
      )}
    </Sheet>
  );
}

// ---------------- Food detail sheet ----------------

function FoodSheet({ item, meal, date, source, onClose, onLogged }: { item: PickedFood | null; meal: Meal; date: string; source: string; onClose: () => void; onLogged: () => void }) {
  const { t } = useT();
  const [grams, setGrams] = useState("");
  const [fav, setFav] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (item) setGrams(String(Math.round(item.lastGrams ?? item.servingG)));
  }, [item]);
  if (!item) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const g = Number(grams) || 0;
  const f = g / 100;
  const microCount = Object.keys(item.micros ?? {}).length;
  const presets = Array.from(new Set([item.servingG, 100, item.servingG * 2].map((x) => Math.round(x)))).filter((x) => x > 0).sort((a, b) => a - b);

  return (
    <Sheet open={!!item} onClose={onClose} title={item.name}>
      <div className="space-y-4">
        {item.brand && <p className="-mt-3 text-[13px] font-semibold text-muted">{item.brand}</p>}
        <MacroTiles kcal={item.kcal * f} protein={item.protein * f} carbs={item.carbs * f} fat={item.fat * f} />
        <div className="relative">
          <Input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="font-display h-16 pr-14 text-center text-[32px] font-semibold" />
          <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 font-bold text-muted">g</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p} onClick={() => setGrams(String(p))} className={cn("press h-9 rounded-full px-3.5 text-[13px] font-bold", Number(grams) === p ? "bg-text text-bg" : "bg-surface-2 text-muted")}>
              {p === Math.round(item.servingG) && item.servingLabel ? `${item.servingLabel} · ${p} g` : `${p} g`}
            </button>
          ))}
        </div>
        <p className="text-[12px] font-semibold text-faint">
          {t.macros.fiber} {fmt(item.fiber * f, 1)}g · {t.macros.sugar} {fmt(item.sugar * f, 1)}g{microCount > 0 && ` · ${microCount} ${t.today.micros.toLowerCase()}`}
        </p>
        <div className="flex gap-2">
          {item.id && (
            <Button variant="secondary" size="lg" aria-label="Favorite" className="w-14 px-0" onClick={() => start(async () => setFav(await toggleFavorite(item.id!)))}>
              <Star className={cn("size-5", fav && "fill-current text-warn")} />
            </Button>
          )}
          <Button className="flex-1" size="lg" disabled={pending || g <= 0} onClick={() => start(async () => { await logFood({ item, grams: g, meal, date, source }); onLogged(); })}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : `${t.log.logIt} · ${fmt(item.kcal * f)} kcal`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------- AI photo / describe ----------------

async function compressImage(file: File): Promise<{ data: string; type: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return { data: url.split(",")[1], type: "image/jpeg", preview: url };
}

type EstItem = MealEstimate["items"][number] & { baseGrams: number; base: MealEstimate["items"][number] };

function AiTab({ mode, ai, meal, date, onDone }: { mode: "photo" | "text"; ai: boolean; meal: Meal; date: string; onDone: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ est: MealEstimate; items: EstItem[]; photoUrl: string | null } | null>(null);
  const [pending, start] = useTransition();

  if (!ai) {
    return (
      <Card className="flex items-start gap-3.5 p-5">
        <IconTile><Sparkles className="size-5" /></IconTile>
        <p className="text-[14px] leading-relaxed text-muted">{t.log.noAi}</p>
      </Card>
    );
  }

  const run = async (body: Record<string, string>) => {
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch("/api/ai/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const est = json.estimate as MealEstimate;
      setResult({ est, photoUrl: json.photoUrl, items: est.items.map((i) => ({ ...i, baseGrams: i.grams, base: i })) });
    } catch {
      setErr(t.common.error);
    }
    setBusy(false);
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    const img = await compressImage(file);
    setPreview(img.preview);
    run({ image: img.data, mediaType: img.type });
  };

  const scaleItem = (idx: number, grams: number) =>
    setResult((r) => {
      if (!r) return r;
      const items = r.items.map((it, i) => {
        if (i !== idx) return it;
        const f = it.baseGrams > 0 ? grams / it.baseGrams : 1;
        const b = it.base;
        const micros = Object.fromEntries(Object.entries(b.micros).map(([k, v]) => [k, v * f])) as typeof b.micros;
        return { ...it, grams, kcal: b.kcal * f, protein: b.protein * f, carbs: b.carbs * f, fat: b.fat * f, fiber: b.fiber * f, sugar: b.sugar * f, micros };
      });
      return { ...r, items };
    });

  const total = result?.items.reduce((s, i) => ({ kcal: s.kcal + i.kcal, p: s.p + i.protein, c: s.c + i.carbs, f: s.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });

  return (
    <div className="space-y-4">
      {mode === "photo" ? (
        !preview ? (
          <Card className="relative flex flex-col items-center overflow-hidden px-6 pb-6 pt-10 text-center">
            <div className="varnish relative grid size-[72px] place-items-center rounded-[24px]">
              <ScanLine className="size-8" strokeWidth={2.2} />
            </div>
            <h2 className="font-display relative mt-5 text-[24px] font-semibold">{t.log.scanTitle}</h2>
            <p className="relative mt-1.5 max-w-xs text-[14px] leading-relaxed text-muted">{t.log.scanSub}</p>
            <div className="relative mt-7 grid w-full grid-cols-2 gap-2">
              <Button onClick={() => cam.current?.click()}><Camera className="size-[18px]" /> {t.log.takePhoto}</Button>
              <Button variant="secondary" onClick={() => lib.current?.click()}><ImagePlus className="size-[18px]" /> {t.log.choosePhoto}</Button>
            </div>
            <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={lib} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </Card>
        ) : (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className={cn("max-h-80 w-full object-cover transition-[filter] duration-500", busy && "blur-[2px] brightness-75")} />
            {busy && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex items-center gap-2 rounded-full bg-black/65 px-4 py-2.5 text-[14px] font-bold text-white backdrop-blur">
                  <Sparkles className="size-4 animate-pulse" /> {t.log.analyzing}
                </div>
              </div>
            )}
            {!busy && (
              <button onClick={() => { setPreview(null); setResult(null); }} className="press absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-[12px] font-bold text-white backdrop-blur">
                <RotateCcw className="size-3.5" /> {t.log.takePhoto}
              </button>
            )}
          </div>
        )
      ) : (
        <Card className="p-5">
          <h2 className="font-display text-[22px] font-semibold">{t.log.describeTitle}</h2>
          <Textarea className="mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.log.describePlaceholder} maxLength={1000} />
          <Button className="mt-3 w-full" disabled={busy || text.trim().length < 3} onClick={() => run({ text })}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> {t.log.analyzing}</> : <><Sparkles className="size-4" /> {t.log.analyze}</>}
          </Button>
        </Card>
      )}

      {err && <p className="rounded-2xl bg-bad/10 px-4 py-3 text-sm font-semibold text-bad">{err}</p>}

      {result && total && (
        <div className="animate-rise">
          <div className="mb-2.5 flex items-end justify-between px-1">
            <div className="min-w-0">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.log.aiResult}</h3>
              <p className="font-display truncate text-[22px] font-semibold">{result.est.mealName}</p>
            </div>
            <div className="tabular shrink-0 text-right text-[22px] font-extrabold">{fmt(total.kcal)} <span className="text-[12px] font-semibold text-muted">kcal</span></div>
          </div>
          <Card className="divide-y divide-border overflow-hidden">
            {result.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{it.name}</div>
                  <div className="tabular flex gap-2 text-[12px] font-semibold text-faint">
                    <span>{fmt(it.kcal)} kcal</span>
                    <span style={{ color: "var(--protein)" }}>P {fmt(it.protein)}</span>
                    <span style={{ color: "var(--carbs)" }}>C {fmt(it.carbs)}</span>
                    <span style={{ color: "var(--fat)" }}>F {fmt(it.fat)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" inputMode="decimal" value={Math.round(it.grams)} onChange={(e) => scaleItem(i, Number(e.target.value) || 0)} className="h-10 w-[68px] rounded-xl bg-surface-2 text-center text-[16px] font-bold outline-none focus:ring-2 focus:ring-accent" />
                  <span className="text-[12px] font-bold text-muted">g</span>
                  <button onClick={() => setResult((r) => r && { ...r, items: r.items.filter((_, j) => j !== i) })} className="press grid size-9 place-items-center rounded-xl text-faint hover:text-bad" aria-label={t.common.delete}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-2.5 px-1 text-[12px] leading-relaxed text-faint">{result.est.notes ? `${result.est.notes} ` : ""}{t.log.aiHint}</p>
          <Button
            size="lg" className="mt-4 w-full" disabled={pending || result.items.length === 0}
            onClick={() => start(async () => {
              await logEstimated({
                items: result.items.map(({ baseGrams: _b, base: _base, ...i }) => i).filter((i) => i.grams > 0),
                meal, date, source: mode === "photo" ? "ai_photo" : "ai_text", photoUrl: result.photoUrl,
              });
              onDone();
              router.push(`/today?d=${date}`);
            })}
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : `${t.log.logAll} · ${fmt(total.kcal)} kcal`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------- Barcode ----------------

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function BarcodeTab({ onPick }: { onPick: (f: FoodItem) => void }) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lookup = async (c: string) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/foods/barcode/${encodeURIComponent(c)}`);
      const j = await r.json();
      if (j.item) onPick(j.item);
      else setErr(t.log.notFound);
    } catch {
      setErr(t.log.notFound);
    }
    setBusy(false);
  };

  useEffect(() => {
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    if (!W.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) { setSupported(false); return; }
    setSupported(true);
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new W.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) { setCode(codes[0].rawValue); await lookup(codes[0].rawValue); break; }
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch {
        setSupported(false);
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((tr) => tr.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {supported !== false ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-black">
          <video ref={video} playsInline muted className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-3xl border-2 border-white/85 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" />
        </div>
      ) : (
        <Card className="flex items-start gap-3.5 p-5">
          <IconTile><Barcode className="size-5" /></IconTile>
          <p className="text-[14px] leading-relaxed text-muted">{t.log.cameraUnsupported}</p>
        </Card>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code) lookup(code); }}>
        <Input inputMode="numeric" placeholder={t.log.barcodeManual} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} enterKeyHint="search" />
        <Button type="submit" disabled={busy || code.length < 6}>{busy ? <Loader2 className="size-4 animate-spin" /> : t.log.lookup}</Button>
      </form>
      {err && <p className="text-center text-sm font-semibold text-bad">{err}</p>}
    </div>
  );
}

// ---------------- Quick add / create food ----------------

function QuickTab({ meal, date, onDone, onCreated }: { meal: Meal; date: string; onDone: () => void; onCreated: (f: FoodItem) => void }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [q, setQ] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [c, setC] = useState({ name: "", brand: "", servingG: "100", kcal: "", protein: "", carbs: "", fat: "" });
  const n = (v: string) => Number(v) || 0;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <h2 className="font-display text-[22px] font-semibold">{t.log.quickTitle}</h2>
        <Input placeholder={t.log.foodName} value={q.name} onChange={(e) => setQ({ ...q, name: e.target.value })} />
        <div className="grid grid-cols-4 gap-2">
          {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
            <Field key={k} label={k === "kcal" ? "kcal" : t.macros[k]}>
              <Input type="number" inputMode="decimal" value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} className="px-2 text-center" />
            </Field>
          ))}
        </div>
        <Button className="w-full" disabled={pending || !q.name || !q.kcal} onClick={() => start(async () => {
          await quickAdd({ name: q.name, kcal: n(q.kcal), protein: n(q.protein), carbs: n(q.carbs), fat: n(q.fat), meal, date });
          setQ({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
          onDone();
        })}>{t.log.logIt}</Button>
      </Card>

      <Card className="space-y-3 p-5">
        <div>
          <h2 className="font-display text-[22px] font-semibold">{t.log.createFood}</h2>
          <p className="text-[12px] font-semibold text-faint">{t.log.per100}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder={t.log.foodName} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <Input placeholder={`Brand · ${t.common.optional}`} value={c.brand} onChange={(e) => setC({ ...c, brand: e.target.value })} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {(["servingG", "kcal", "protein", "carbs", "fat"] as const).map((k) => (
            <Field key={k} label={k === "servingG" ? t.log.serving : k === "kcal" ? "kcal" : t.macros[k]}>
              <Input type="number" inputMode="decimal" value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} className="px-1.5 text-center" />
            </Field>
          ))}
        </div>
        <Button variant="secondary" className="w-full" disabled={pending || !c.name || !c.kcal} onClick={() => start(async () => {
          const { id } = await createFood({ name: c.name, brand: c.brand || undefined, servingG: n(c.servingG) || 100, kcal: n(c.kcal), protein: n(c.protein), carbs: n(c.carbs), fat: n(c.fat) });
          onCreated({ id, key: `db:${id}`, name: c.name, brand: c.brand || null, source: "custom", servingG: n(c.servingG) || 100, kcal: n(c.kcal), protein: n(c.protein), carbs: n(c.carbs), fat: n(c.fat), fiber: 0, sugar: 0, micros: {} });
          setC({ name: "", brand: "", servingG: "100", kcal: "", protein: "", carbs: "", fat: "" });
        })}>{t.common.save}</Button>
      </Card>
    </div>
  );
}
