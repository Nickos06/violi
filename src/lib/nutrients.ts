// Micronutrient catalogue and daily reference intakes.
// Reference values: NIH Office of Dietary Supplements / National Academies DRIs (RDA or AI) for adults.

export type MicroKey =
  | "vitA" | "vitC" | "vitD" | "vitE" | "vitK"
  | "b1" | "b2" | "b3" | "b6" | "b9" | "b12"
  | "calcium" | "iron" | "magnesium" | "potassium" | "zinc" | "phosphorus" | "selenium"
  | "sodium" | "satFat";

export type Micros = Partial<Record<MicroKey, number>>;

export type NutrientDef = {
  key: MicroKey;
  unit: "mg" | "µg" | "g";
  group: "vitamin" | "mineral" | "limit";
  en: string;
  el: string;
};

export const NUTRIENTS: NutrientDef[] = [
  { key: "vitA", unit: "µg", group: "vitamin", en: "Vitamin A", el: "Βιταμίνη A" },
  { key: "vitC", unit: "mg", group: "vitamin", en: "Vitamin C", el: "Βιταμίνη C" },
  { key: "vitD", unit: "µg", group: "vitamin", en: "Vitamin D", el: "Βιταμίνη D" },
  { key: "vitE", unit: "mg", group: "vitamin", en: "Vitamin E", el: "Βιταμίνη E" },
  { key: "vitK", unit: "µg", group: "vitamin", en: "Vitamin K", el: "Βιταμίνη K" },
  { key: "b1", unit: "mg", group: "vitamin", en: "Thiamin (B1)", el: "Θειαμίνη (B1)" },
  { key: "b2", unit: "mg", group: "vitamin", en: "Riboflavin (B2)", el: "Ριβοφλαβίνη (B2)" },
  { key: "b3", unit: "mg", group: "vitamin", en: "Niacin (B3)", el: "Νιασίνη (B3)" },
  { key: "b6", unit: "mg", group: "vitamin", en: "Vitamin B6", el: "Βιταμίνη B6" },
  { key: "b9", unit: "µg", group: "vitamin", en: "Folate (B9)", el: "Φυλλικό οξύ (B9)" },
  { key: "b12", unit: "µg", group: "vitamin", en: "Vitamin B12", el: "Βιταμίνη B12" },
  { key: "calcium", unit: "mg", group: "mineral", en: "Calcium", el: "Ασβέστιο" },
  { key: "iron", unit: "mg", group: "mineral", en: "Iron", el: "Σίδηρος" },
  { key: "magnesium", unit: "mg", group: "mineral", en: "Magnesium", el: "Μαγνήσιο" },
  { key: "potassium", unit: "mg", group: "mineral", en: "Potassium", el: "Κάλιο" },
  { key: "zinc", unit: "mg", group: "mineral", en: "Zinc", el: "Ψευδάργυρος" },
  { key: "phosphorus", unit: "mg", group: "mineral", en: "Phosphorus", el: "Φώσφορος" },
  { key: "selenium", unit: "µg", group: "mineral", en: "Selenium", el: "Σελήνιο" },
  { key: "sodium", unit: "mg", group: "limit", en: "Sodium", el: "Νάτριο" },
  { key: "satFat", unit: "g", group: "limit", en: "Saturated fat", el: "Κορεσμένα λιπαρά" },
];

export const MICRO_KEYS = NUTRIENTS.map((n) => n.key);

export type Sex = "male" | "female";

/** Daily target for each micronutrient. For "limit" nutrients the value is an upper bound. */
export function microTargets(sex: Sex, age: number, kcal: number): Record<MicroKey, number> {
  const m = sex === "male";
  const over50 = age > 50;
  const over70 = age > 70;
  return {
    vitA: m ? 900 : 700,
    vitC: m ? 90 : 75,
    vitD: over70 ? 20 : 15,
    vitE: 15,
    vitK: m ? 120 : 90,
    b1: m ? 1.2 : 1.1,
    b2: m ? 1.3 : 1.1,
    b3: m ? 16 : 14,
    b6: over50 ? (m ? 1.7 : 1.5) : 1.3,
    b9: 400,
    b12: 2.4,
    calcium: (m && over70) || (!m && over50) ? 1200 : 1000,
    iron: !m && !over50 ? 18 : 8,
    magnesium: m ? (age < 31 ? 400 : 420) : age < 31 ? 310 : 320,
    potassium: m ? 3400 : 2600,
    zinc: m ? 11 : 8,
    phosphorus: 700,
    selenium: 55,
    sodium: 2300,
    satFat: Math.round((kcal * 0.1) / 9),
  };
}

/** Fiber target: 14 g per 1000 kcal (Dietary Guidelines). */
export function fiberTarget(kcal: number) {
  return Math.round((kcal / 1000) * 14);
}

export function addMicros(a: Micros, b: Micros, factor = 1): Micros {
  const out: Micros = { ...a };
  for (const k of MICRO_KEYS) {
    const v = b[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = (out[k] ?? 0) + v * factor;
  }
  return out;
}

export function scaleMicros(m: Micros, factor: number): Micros {
  return addMicros({}, m, factor);
}

export function asMicros(value: unknown): Micros {
  if (!value || typeof value !== "object") return {};
  const out: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = (value as Record<string, unknown>)[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}
