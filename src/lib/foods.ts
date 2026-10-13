import "server-only";
import { db } from "./db";
import type { Micros } from "./nutrients";

/** Normalised food shape returned to the client (values per 100 g). */
export type FoodItem = {
  id?: string;
  key: string;
  name: string;
  brand?: string | null;
  source: string;
  servingG: number;
  servingLabel?: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  micros: Micros;
  barcode?: string | null;
  externalId?: string | null;
};

const UA = "Violi/0.1 (https://github.com/Nickos06/violi)";
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// Greek → Latin-insensitive matching: strip accents so "γιαουρτι" matches "Γιαούρτι".
export function normalise(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function fromDb(f: {
  id: string; name: string; nameEl: string | null; brand: string | null; source: string; servingG: number; servingLabel: string | null;
  kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; micros: unknown; barcode: string | null; externalId: string | null;
}, locale = "el"): FoodItem {
  return {
    id: f.id, key: `db:${f.id}`, name: locale === "el" && f.nameEl ? f.nameEl : f.name, brand: f.brand, source: f.source,
    servingG: f.servingG, servingLabel: f.servingLabel, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
    fiber: f.fiber, sugar: f.sugar, micros: (f.micros ?? {}) as Micros, barcode: f.barcode, externalId: f.externalId,
  };
}

export async function searchLocal(q: string, userId: string, locale: string) {
  const n = normalise(q);
  if (!n) return [];
  // SQLite LIKE is case-insensitive only for ASCII, so match in JS over a reasonably sized candidate set.
  const all = await db.food.findMany({
    where: { OR: [{ source: { in: ["seed", "off", "usda", "ai"] } }, { createdById: userId }] },
    take: 2000,
    orderBy: { createdAt: "asc" },
  });
  const words = n.split(/\s+/);
  return all
    .map((f) => {
      const hay = normalise(`${f.nameEl ?? ""} ${f.name} ${f.brand ?? ""}`);
      if (!words.every((w) => hay.includes(w))) return null;
      const score = (hay.startsWith(n) ? 0 : 1) + (f.source === "seed" ? 0 : 0.5);
      return { f, score };
    })
    .filter((x): x is { f: (typeof all)[number]; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
    .slice(0, 25)
    .map(({ f }) => fromDb(f, locale));
}

// ---------- Open Food Facts ----------

type OffProduct = {
  code?: string; product_name?: string; product_name_el?: string; brands?: string | string[]; serving_quantity?: number | string; serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function offNum(n: Record<string, number | string | undefined>, key: string) {
  const v = n[`${key}_100g`];
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

export function fromOff(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  const kcal = offNum(n, "energy-kcal") ?? (offNum(n, "energy") !== undefined ? offNum(n, "energy")! / 4.184 : undefined);
  const name = p.product_name_el || p.product_name;
  if (kcal === undefined || !name) return null;
  // OFF stores minerals/vitamins in grams per 100 g.
  const mg = (k: string) => (offNum(n, k) !== undefined ? round(offNum(n, k)! * 1000, 2) : undefined);
  const ug = (k: string) => (offNum(n, k) !== undefined ? round(offNum(n, k)! * 1_000_000, 1) : undefined);
  const micros: Micros = {};
  const set = (k: keyof Micros, v: number | undefined) => { if (v !== undefined) micros[k] = v; };
  set("sodium", mg("sodium") ?? (offNum(n, "salt") !== undefined ? round((offNum(n, "salt")! / 2.5) * 1000) : undefined));
  set("satFat", offNum(n, "saturated-fat"));
  set("vitA", ug("vitamin-a")); set("vitC", mg("vitamin-c")); set("vitD", ug("vitamin-d")); set("vitE", mg("vitamin-e"));
  set("vitK", ug("vitamin-k")); set("b1", mg("vitamin-b1")); set("b2", mg("vitamin-b2")); set("b3", mg("vitamin-pp"));
  set("b6", mg("vitamin-b6")); set("b9", ug("vitamin-b9")); set("b12", ug("vitamin-b12"));
  set("calcium", mg("calcium")); set("iron", mg("iron")); set("magnesium", mg("magnesium")); set("potassium", mg("potassium"));
  set("zinc", mg("zinc")); set("phosphorus", mg("phosphorus")); set("selenium", ug("selenium"));
  const serving = typeof p.serving_quantity === "string" ? parseFloat(p.serving_quantity) : p.serving_quantity;
  return {
    key: `off:${p.code}`, name, brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0])?.trim() || null, source: "off",
    servingG: serving && serving > 0 ? serving : 100, servingLabel: p.serving_size ?? null,
    kcal: round(kcal), protein: round(offNum(n, "proteins") ?? 0), carbs: round(offNum(n, "carbohydrates") ?? 0),
    fat: round(offNum(n, "fat") ?? 0), fiber: round(offNum(n, "fiber") ?? 0), sugar: round(offNum(n, "sugars") ?? 0),
    micros, barcode: p.code ?? null, externalId: p.code ?? null,
  };
}

const OFF_FIELDS = "code,product_name,product_name_el,brands,serving_quantity,serving_size,nutriments";

export async function searchOff(q: string): Promise<FoodItem[]> {
  // search-a-licious is the fast Elasticsearch-backed OFF search; the legacy CGI search is the fallback.
  const fast = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=20&fields=${OFF_FIELDS}`;
  const legacy = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FIELDS}`;
  try {
    const res = await fetch(fast, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
    if (res.ok) {
      const data = (await res.json()) as { hits?: OffProduct[] };
      return (data.hits ?? []).map(fromOff).filter((x): x is FoodItem => !!x);
    }
  } catch {}
  try {
    const res = await fetch(legacy, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000), next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffProduct[] };
    return (data.products ?? []).map(fromOff).filter((x): x is FoodItem => !!x);
  } catch {
    return [];
  }
}

export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const local = await db.food.findUnique({ where: { barcode: code } });
  if (local) return fromDb(local);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, {
      headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: OffProduct };
    if (!data.product) return null;
    return fromOff({ ...data.product, code });
  } catch {
    return null;
  }
}

// ---------- USDA FoodData Central ----------

const USDA_IDS: Record<number, keyof Micros | "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sugar"> = {
  1008: "kcal", 2047: "kcal", 2048: "kcal", 1003: "protein", 1005: "carbs", 1004: "fat", 1079: "fiber", 2000: "sugar",
  1258: "satFat", 1093: "sodium", 1092: "potassium", 1087: "calcium", 1089: "iron", 1090: "magnesium", 1095: "zinc",
  1091: "phosphorus", 1103: "selenium", 1106: "vitA", 1162: "vitC", 1114: "vitD", 1109: "vitE", 1185: "vitK",
  1165: "b1", 1166: "b2", 1167: "b3", 1175: "b6", 1177: "b9", 1178: "b12",
};

type UsdaFood = { fdcId: number; description: string; brandOwner?: string; foodNutrients?: { nutrientId: number; value?: number }[] };

export async function searchUsda(q: string): Promise<FoodItem[]> {
  const key = process.env.USDA_API_KEY || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(q)}&pageSize=12&dataType=Foundation,SR%20Legacy`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { foods?: UsdaFood[] };
    return (data.foods ?? []).map((f) => {
      const vals: Record<string, number> = {};
      for (const n of f.foodNutrients ?? []) {
        const k = USDA_IDS[n.nutrientId];
        if (k && typeof n.value === "number" && vals[k] === undefined) vals[k] = n.value;
      }
      const { kcal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sugar = 0, ...micros } = vals;
      return {
        key: `usda:${f.fdcId}`, name: f.description, brand: f.brandOwner ?? null, source: "usda", servingG: 100,
        kcal: round(kcal), protein: round(protein), carbs: round(carbs), fat: round(fat), fiber: round(fiber), sugar: round(sugar),
        micros: micros as Micros, externalId: String(f.fdcId),
      } satisfies FoodItem;
    }).filter((f) => f.kcal > 0 || f.protein > 0);
  } catch {
    return [];
  }
}

/** Ensures an external food exists in the DB (so logs can reference it) and returns its id. */
export async function persistFood(item: FoodItem, userId: string): Promise<string> {
  if (item.id) return item.id;
  const data = {
    name: item.name, brand: item.brand ?? null, source: item.source, servingG: item.servingG, servingLabel: item.servingLabel ?? null,
    kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber, sugar: item.sugar,
    micros: item.micros, externalId: item.externalId ?? null,
  };
  if (item.externalId && (item.source === "off" || item.source === "usda")) {
    const f = await db.food.upsert({
      where: { source_externalId: { source: item.source, externalId: item.externalId } },
      create: { ...data, barcode: item.source === "off" ? item.barcode ?? null : null },
      update: {},
    });
    return f.id;
  }
  const f = await db.food.create({ data: { ...data, source: item.source === "ai" ? "ai" : "custom", createdById: userId } });
  return f.id;
}
