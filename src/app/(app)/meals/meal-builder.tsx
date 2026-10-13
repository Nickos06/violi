"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2, Plus, Trash2 } from "lucide-react";
import { deleteSavedMeal, saveMeal } from "@/app/actions/meals";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { FoodSearch, type PickedFood } from "@/components/food-search";
import { MacroTiles } from "@/components/meal-section";
import { SAVED_MEAL_ICON } from "@/components/icons";
import { Button, Card, cn, Field, fmt, Input, SectionTitle } from "@/components/ui";
import { MEAL_ICONS, type MealIconKey } from "@/lib/meal-icons";

export type BuilderIngredient = { key: string; item: PickedFood; grams: number };

export function MealBuilder({ initial }: {
  initial?: { id: string; name: string; icon: MealIconKey; totalGrams: number; portionG: number; ingredients: BuilderIngredient[]; rawTotal: number };
}) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState<MealIconKey>(initial?.icon ?? "utensils");
  const [items, setItems] = useState<BuilderIngredient[]>(initial?.ingredients ?? []);
  const [cooked, setCooked] = useState(initial && Math.abs(initial.totalGrams - initial.rawTotal) > 0.5 ? String(Math.round(initial.totalGrams)) : "");
  const [portion, setPortion] = useState(initial ? String(Math.round(initial.portionG)) : "");
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const totals = useMemo(() => items.reduce(
    (s, i) => {
      const f = i.grams / 100;
      return { g: s.g + i.grams, kcal: s.kcal + i.item.kcal * f, p: s.p + i.item.protein * f, c: s.c + i.item.carbs * f, f: s.f + i.item.fat * f };
    },
    { g: 0, kcal: 0, p: 0, c: 0, f: 0 },
  ), [items]);
  const dishWeight = Number(cooked) > 0 ? Number(cooked) : totals.g;
  const per100 = dishWeight > 0 ? 100 / dishWeight : 0;

  const save = () =>
    start(async () => {
      const id = await saveMeal({
        id: initial?.id, name, icon,
        totalGrams: Number(cooked) > 0 ? Number(cooked) : undefined,
        portionG: Number(portion) > 0 ? Number(portion) : undefined,
        ingredients: items.map((i) => ({ item: i.item, grams: i.grams })),
      });
      router.push(`/meals?saved=${id}`);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <Field label={t.saved.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.saved.namePlaceholder} maxLength={80} />
        </Field>
        <div>
          <span className="mb-2 block px-1 text-[12px] font-semibold text-muted">{t.saved.icon}</span>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {MEAL_ICONS.map((k) => {
              const I = SAVED_MEAL_ICON[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcon(k)}
                  aria-label={k}
                  className={cn("press grid size-11 shrink-0 place-items-center rounded-[14px] border transition-colors", icon === k ? "border-accent/60 bg-accent-soft text-accent" : "border-border bg-surface-2 text-muted")}
                >
                  <I className="size-5" strokeWidth={2.2} />
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle className="mt-0" action={<span className="tabular text-[12px] font-bold text-muted">{t.saved.rawWeight}: {fmt(totals.g)} g</span>}>{t.saved.ingredients}</SectionTitle>
        <Card className="overflow-hidden">
          {items.length === 0 && <p className="px-5 py-5 text-[14px] leading-relaxed text-muted">{t.saved.noIngredients}</p>}
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{i.item.name}</div>
                  <div className="tabular text-[12px] font-semibold text-faint">{fmt((i.item.kcal * i.grams) / 100)} kcal · P {fmt((i.item.protein * i.grams) / 100)}g</div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" inputMode="decimal" value={i.grams}
                    onChange={(e) => setItems((xs) => xs.map((x) => (x.key === i.key ? { ...x, grams: Number(e.target.value) || 0 } : x)))}
                    className="h-10 w-[72px] rounded-xl bg-surface-2 text-center text-[16px] font-bold outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-[12px] font-bold text-muted">g</span>
                  <button onClick={() => setItems((xs) => xs.filter((x) => x.key !== i.key))} className="press grid size-9 place-items-center rounded-xl text-faint hover:text-bad" aria-label={t.common.delete}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => setAdding(true)} className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3.5 text-[14px] font-bold text-accent transition-colors hover:bg-surface-2/60">
            <Plus className="size-4" strokeWidth={2.6} /> {t.saved.addIngredient}
          </button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 items-end gap-3">
          <Field label={t.saved.cookedWeight}>
            <Input type="number" inputMode="decimal" placeholder={String(Math.round(totals.g) || "")} value={cooked} onChange={(e) => setCooked(e.target.value)} />
          </Field>
          <Field label={t.saved.portion}>
            <Input type="number" inputMode="decimal" placeholder={String(Math.round(Math.min(dishWeight, 400)) || "")} value={portion} onChange={(e) => setPortion(e.target.value)} />
          </Field>
        </div>
        <p className="mt-3 px-1 text-[12px] leading-relaxed text-faint">{t.saved.cookedHint}</p>
      </Card>

      {items.length > 0 && (
        <div>
          <SectionTitle className="mt-0">{t.saved.per100}</SectionTitle>
          <MacroTiles kcal={totals.kcal * per100} protein={totals.p * per100} carbs={totals.c * per100} fat={totals.f * per100} />
          <p className="tabular mt-2.5 px-1 text-[12.5px] font-semibold text-muted">
            {t.saved.total}: {fmt(totals.kcal)} kcal · {fmt(dishWeight)} g
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {initial && (
          <Button
            variant="danger" size="lg" className="w-14 px-0" aria-label={t.saved.deleteMeal} disabled={pending}
            onClick={() => start(async () => { await deleteSavedMeal(initial.id); router.push("/meals"); router.refresh(); })}
          >
            <Trash2 className="size-5" />
          </Button>
        )}
        <Button size="lg" className="flex-1" disabled={pending || !name.trim() || items.length === 0 || items.some((i) => i.grams <= 0)} onClick={save}>
          {pending ? <Loader2 className="size-5 animate-spin" /> : <><ChefHat className="size-5" /> {t.common.save}</>}
        </Button>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={t.saved.addIngredient}>
        <div className="min-h-[60dvh]">
          <FoodSearch
            onPick={(f) => {
              setItems((xs) => [...xs, { key: `${f.key}-${Date.now()}`, item: f, grams: Math.round(f.lastGrams ?? f.servingG) }]);
              setAdding(false);
            }}
          />
        </div>
      </Sheet>
    </div>
  );
}
