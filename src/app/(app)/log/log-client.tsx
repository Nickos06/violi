"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Camera, ImagePlus, Loader2, MessageSquareText, Search, Sparkles, Star, Trash2, Zap } from "lucide-react";
import { createFood, logEstimated, logFood, quickAdd, toggleFavorite } from "@/app/actions/food";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { Button, Card, cn, Field, fmt, Input, Textarea } from "@/components/ui";
import type { FoodItem } from "@/lib/foods";
import type { MealEstimate } from "@/lib/ai";

type Tab = "search" | "scan" | "describe" | "barcode" | "quick";
type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export function LogClient({ initialMeal, date, ai, initialTab }: { initialMeal: string; date: string; ai: boolean; initialTab: string }) {
  const { t } = useT();
  const router = useRouter();
  const [meal, setMeal] = useState<Meal>(initialMeal as Meal);
  const [tab, setTab] = useState<Tab>(initialTab as Tab);
  const [selected, setSelected] = useState<(FoodItem & { lastGrams?: number }) | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const done = () => {
    setToast(t.log.logged);
    setTimeout(() => setToast(null), 1600);
    router.refresh();
  };

  const tabs: { k: Tab; label: string; icon: typeof Search }[] = [
    { k: "search", label: t.log.search, icon: Search },
    { k: "scan", label: t.log.scan, icon: Camera },
    { k: "describe", label: t.log.describe, icon: MessageSquareText },
    { k: "barcode", label: t.log.barcode, icon: Barcode },
    { k: "quick", label: t.log.quick, icon: Zap },
  ];

  return (
    <div className="animate-rise pt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">{t.log.title} {t.meals[meal].toLowerCase()}</h1>
        <button onClick={() => router.push(`/today?d=${date}`)} className="text-[14px] font-semibold text-accent">{t.common.done}</button>
      </div>

      {/* Meal picker */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
          <button key={m} onClick={() => setMeal(m)} className={cn("h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition", meal === m ? "bg-text text-bg" : "bg-surface-2 text-muted hover:text-text")}>
            {t.meals[m]}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl bg-surface-2 p-1">
        {tabs.map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition", tab === k ? "bg-surface text-text shadow" : "text-muted")}>
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "search" && <SearchTab onPick={setSelected} />}
        {tab === "scan" && <AiTab mode="photo" ai={ai} meal={meal} date={date} onDone={done} />}
        {tab === "describe" && <AiTab mode="text" ai={ai} meal={meal} date={date} onDone={done} />}
        {tab === "barcode" && <BarcodeTab onPick={setSelected} />}
        {tab === "quick" && <QuickTab meal={meal} date={date} onDone={done} onCreated={setSelected} />}
      </div>

      <FoodSheet item={selected} meal={meal} date={date} source={tab === "barcode" ? "barcode" : "search"} onClose={() => setSelected(null)} onLogged={() => { setSelected(null); done(); }} />

      {toast && (
        <div className="animate-rise fixed inset-x-0 bottom-28 z-50 mx-auto w-fit rounded-full bg-text px-5 py-2.5 text-[14px] font-semibold text-bg shadow-xl md:bottom-10">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

// ---------------- Search ----------------

function FoodRow({ f, onClick }: { f: FoodItem & { lastGrams?: number }; onClick: () => void }) {
  const { t } = useT();
  const sourceLabel: Record<string, string> = { off: "Open Food Facts", usda: "USDA", ai: "AI", custom: "★", seed: "" };
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{f.name}</div>
        <div className="truncate text-[12px] text-muted">
          {f.brand ? `${f.brand} · ` : ""}
          {f.lastGrams ? `${fmt(f.lastGrams)} g` : f.servingLabel ?? `${fmt(f.servingG)} g`}
          {sourceLabel[f.source] ? ` · ${sourceLabel[f.source]}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="tabular text-[14px] font-semibold">{fmt((f.kcal * (f.lastGrams ?? f.servingG)) / 100)}</div>
        <div className="text-[11px] text-faint">{t.common.kcal}</div>
      </div>
    </button>
  );
}

function SearchTab({ onPick }: { onPick: (f: FoodItem) => void }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<FoodItem[]>([]);
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [recent, setRecent] = useState<{ recent: (FoodItem & { lastGrams?: number })[]; favorites: FoodItem[] } | null>(null);

  useEffect(() => {
    fetch("/api/foods/recent").then((r) => r.json()).then(setRecent).catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setLocal([]); setOnline([]); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setLocal((await r.json()).items ?? []);
        setLoadingOnline(true);
        const o = await fetch(`/api/foods/search?online=1&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setOnline((await o.json()).items ?? []);
      } catch {}
      setLoadingOnline(false);
    }, 280);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-faint" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.log.searchPlaceholder} className="h-12 pl-10" />
      </div>

      {q.trim().length < 2 ? (
        <>
          {!!recent?.favorites.length && (
            <List title={t.log.favorites}>{recent.favorites.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</List>
          )}
          {!!recent?.recent.length && (
            <List title={t.log.recent}>{recent.recent.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</List>
          )}
        </>
      ) : (
        <>
          {local.length > 0 && <List title={t.log.results}>{local.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</List>}
          <List title={t.log.online} trailing={loadingOnline ? <Loader2 className="size-4 animate-spin text-muted" /> : null}>
            {online.length === 0 && !loadingOnline ? <p className="px-4 py-4 text-[13px] text-faint">—</p> : online.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}
          </List>
        </>
      )}
    </>
  );
}

function List({ title, children, trailing }: { title: string; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {trailing}
      </div>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </div>
  );
}

// ---------------- Food detail sheet ----------------

function FoodSheet({ item, meal, date, source, onClose, onLogged }: { item: (FoodItem & { lastGrams?: number }) | null; meal: Meal; date: string; source: string; onClose: () => void; onLogged: () => void }) {
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
  const presets = Array.from(new Set([item.servingG, 100, item.servingG * 2].map((x) => Math.round(x)))).filter((x) => x > 0);

  return (
    <Sheet open={!!item} onClose={onClose} title={item.name}>
      <div className="space-y-4">
        {item.brand && <p className="-mt-3 text-[13px] text-muted">{item.brand}</p>}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: "kcal", v: item.kcal * f, c: "var(--text)" },
            { l: t.macros.protein, v: item.protein * f, c: "var(--protein)" },
            { l: t.macros.carbs, v: item.carbs * f, c: "var(--carbs)" },
            { l: t.macros.fat, v: item.fat * f, c: "var(--fat)" },
          ].map((m) => (
            <div key={m.l} className="rounded-2xl bg-surface-2 py-2.5">
              <div className="tabular text-[18px] font-bold" style={{ color: m.c }}>{fmt(m.v)}</div>
              <div className="truncate px-1 text-[11px] text-muted">{m.l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="h-14 text-center text-2xl font-bold" />
          <span className="text-muted">g</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p} onClick={() => setGrams(String(p))} className={cn("h-8 rounded-full px-3 text-[13px] font-semibold", Number(grams) === p ? "bg-text text-bg" : "bg-surface-2 text-muted")}>
              {p === Math.round(item.servingG) && item.servingLabel ? item.servingLabel : `${p} g`}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-faint">
          {t.macros.fiber} {fmt(item.fiber * f, 1)}g · {t.macros.sugar} {fmt(item.sugar * f, 1)}g{microCount > 0 && ` · ${microCount} ${t.today.micros.toLowerCase()}`}
        </p>
        <div className="flex gap-2">
          {item.id && (
            <Button variant="secondary" aria-label="Favorite" onClick={() => start(async () => setFav(await toggleFavorite(item.id!)))}>
              <Star className={cn("size-4", fav && "fill-current text-warn")} />
            </Button>
          )}
          <Button className="flex-1" size="lg" disabled={pending || g <= 0} onClick={() => start(async () => { await logFood({ item, grams: g, meal, date, source }); onLogged(); })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : t.log.logIt}
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

  if (!ai) return <Card className="p-5 text-[14px] text-muted">{t.log.noAi}</Card>;

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
          <Card className="flex flex-col items-center p-8 text-center">
            <div className="grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent"><Camera className="size-7" /></div>
            <h2 className="mt-4 text-lg font-bold">{t.log.scanTitle}</h2>
            <p className="mt-1 max-w-xs text-[14px] text-muted">{t.log.scanSub}</p>
            <div className="mt-6 flex w-full gap-2">
              <Button className="flex-1" onClick={() => cam.current?.click()}><Camera className="size-4" /> {t.log.takePhoto}</Button>
              <Button variant="secondary" className="flex-1" onClick={() => lib.current?.click()}><ImagePlus className="size-4" /> {t.log.choosePhoto}</Button>
            </div>
            <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={lib} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </Card>
        ) : (
          <div className="relative overflow-hidden rounded-[var(--radius-card)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-80 w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[14px] font-semibold text-white"><Sparkles className="size-4 animate-pulse" /> {t.log.analyzing}</div>
              </div>
            )}
            {!busy && (
              <button onClick={() => { setPreview(null); setResult(null); }} className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white">↺ {t.log.takePhoto}</button>
            )}
          </div>
        )
      ) : (
        <Card className="p-4">
          <h2 className="font-semibold">{t.log.describeTitle}</h2>
          <Textarea className="mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.log.describePlaceholder} maxLength={1000} />
          <Button className="mt-3 w-full" disabled={busy || text.trim().length < 3} onClick={() => run({ text })}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> {t.log.analyzing}</> : <><Sparkles className="size-4" /> {t.log.analyze}</>}
          </Button>
        </Card>
      )}

      {err && <p className="rounded-xl bg-bad/10 px-3 py-2.5 text-sm text-bad">{err}</p>}

      {result && total && (
        <div className="animate-rise">
          <div className="mb-2 flex items-end justify-between px-1">
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted">{t.log.aiResult}</h3>
              <p className="text-[17px] font-bold">{result.est.mealName}</p>
            </div>
            <div className="tabular text-right text-[20px] font-bold">{fmt(total.kcal)} <span className="text-[12px] font-normal text-muted">kcal</span></div>
          </div>
          <Card className="divide-y divide-border overflow-hidden">
            {result.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{it.name}</div>
                  <div className="tabular text-[12px] text-muted">
                    {fmt(it.kcal)} kcal · <span style={{ color: "var(--protein)" }}>P {fmt(it.protein)}</span> · <span style={{ color: "var(--carbs)" }}>C {fmt(it.carbs)}</span> · <span style={{ color: "var(--fat)" }}>F {fmt(it.fat)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" inputMode="decimal" value={Math.round(it.grams)} onChange={(e) => scaleItem(i, Number(e.target.value) || 0)} className="h-9 w-16 rounded-lg bg-surface-2 text-center text-[14px] font-semibold outline-none focus:ring-2 focus:ring-accent" />
                  <span className="text-[12px] text-muted">g</span>
                  <button onClick={() => setResult((r) => r && { ...r, items: r.items.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-lg text-faint hover:text-bad" aria-label={t.common.delete}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-2 px-1 text-[12px] text-faint">{result.est.notes ? `${result.est.notes} ` : ""}{t.log.aiHint}</p>
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
            {pending ? <Loader2 className="size-4 animate-spin" /> : `${t.log.logAll} · ${fmt(total.kcal)} kcal`}
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
          <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
        </div>
      ) : (
        <Card className="p-4 text-[13px] text-muted">{t.log.cameraUnsupported}</Card>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code) lookup(code); }}>
        <Input inputMode="numeric" placeholder={t.log.barcodeManual} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <Button type="submit" disabled={busy || code.length < 6}>{busy ? <Loader2 className="size-4 animate-spin" /> : t.log.lookup}</Button>
      </form>
      {err && <p className="text-center text-sm text-bad">{err}</p>}
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
    <div className="space-y-5">
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.log.quickTitle}</h2>
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

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="font-semibold">{t.log.createFood}</h2>
          <p className="text-[12px] text-muted">{t.log.per100}</p>
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
