"use client";

import { useEffect, useState } from "react";
import { ChefHat, Loader2, Search, Sparkles, Star } from "lucide-react";
import type { FoodItem } from "@/lib/foods";
import { useT } from "./i18n-provider";
import { Card, fmt, Input } from "./ui";

export type PickedFood = FoodItem & { lastGrams?: number };

const SOURCE_LABEL: Record<string, string> = { off: "Open Food Facts", usda: "USDA" };

export function FoodRow({ f, onClick }: { f: PickedFood; onClick: () => void }) {
  const grams = f.lastGrams ?? f.servingG;
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14.5px] font-semibold">
          {f.source === "meal" && <ChefHat className="size-3.5 shrink-0 text-accent" />}
          {f.source === "ai" && <Sparkles className="size-3.5 shrink-0 text-accent" />}
          {f.source === "custom" && <Star className="size-3.5 shrink-0 text-warn" />}
          <span className="truncate">{f.name}</span>
        </div>
        <div className="truncate text-[12px] font-semibold text-faint">
          {f.brand ? `${f.brand} · ` : ""}
          {f.lastGrams ? `${fmt(f.lastGrams)} g` : f.servingLabel ?? `${fmt(f.servingG)} g`}
          {SOURCE_LABEL[f.source] ? ` · ${SOURCE_LABEL[f.source]}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="tabular text-[15px] font-extrabold">{fmt((f.kcal * grams) / 100)}</div>
        <div className="text-[10px] font-semibold text-faint">kcal</div>
      </div>
    </button>
  );
}

export function FoodList({ title, children, trailing }: { title: string; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{title}</h3>
        {trailing}
      </div>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </div>
  );
}

/** Search across the local database, then Open Food Facts + USDA. Shows recents & favourites when empty. */
export function FoodSearch({ onPick, autoFocus = true }: { onPick: (f: PickedFood) => void; autoFocus?: boolean }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<FoodItem[]>([]);
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [recent, setRecent] = useState<{ recent: PickedFood[]; favorites: FoodItem[] } | null>(null);

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
    }, 260);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" strokeWidth={2.4} />
        <Input
          autoFocus={autoFocus} data-autofocus={autoFocus ? "" : undefined} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.log.searchPlaceholder}
          className="h-13 pl-11" enterKeyHint="search" autoComplete="off" autoCorrect="off"
        />
      </div>

      {q.trim().length < 2 ? (
        <>
          {!!recent?.favorites.length && (
            <FoodList title={t.log.favorites}>{recent.favorites.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</FoodList>
          )}
          {!!recent?.recent.length && (
            <FoodList title={t.log.recent}>{recent.recent.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</FoodList>
          )}
          {!recent && (
            <div className="mt-6 space-y-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}
            </div>
          )}
        </>
      ) : (
        <>
          {local.length > 0 && <FoodList title={t.log.results}>{local.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)}</FoodList>}
          <FoodList title={t.log.online} trailing={loadingOnline ? <Loader2 className="size-4 animate-spin text-muted" /> : null}>
            {online.length === 0 && !loadingOnline ? (
              <p className="px-4 py-4 text-[13px] text-faint">—</p>
            ) : online.length === 0 ? (
              <div className="space-y-px">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
            ) : (
              online.map((f) => <FoodRow key={f.key} f={f} onClick={() => onPick(f)} />)
            )}
          </FoodList>
        </>
      )}
    </>
  );
}
