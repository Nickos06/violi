import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5-5";

const MicrosSchema = z.object({
  vitA: z.number().describe("Vitamin A, µg RAE"),
  vitC: z.number().describe("Vitamin C, mg"),
  vitD: z.number().describe("Vitamin D, µg"),
  vitE: z.number().describe("Vitamin E, mg"),
  vitK: z.number().describe("Vitamin K, µg"),
  b1: z.number().describe("Thiamin, mg"),
  b2: z.number().describe("Riboflavin, mg"),
  b3: z.number().describe("Niacin, mg"),
  b6: z.number().describe("Vitamin B6, mg"),
  b9: z.number().describe("Folate, µg DFE"),
  b12: z.number().describe("Vitamin B12, µg"),
  calcium: z.number().describe("mg"),
  iron: z.number().describe("mg"),
  magnesium: z.number().describe("mg"),
  potassium: z.number().describe("mg"),
  zinc: z.number().describe("mg"),
  phosphorus: z.number().describe("mg"),
  selenium: z.number().describe("µg"),
  sodium: z.number().describe("mg"),
  satFat: z.number().describe("Saturated fat, g"),
});

const MealSchema = z.object({
  mealName: z.string().describe("Short name of the whole meal, in the user's language"),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().describe("One short sentence on assumptions (e.g. hidden oil), in the user's language. Empty if none."),
  items: z.array(
    z.object({
      name: z.string().describe("Food name in the user's language"),
      grams: z.number().describe("Estimated edible weight in grams"),
      kcal: z.number(),
      protein: z.number().describe("g"),
      carbs: z.number().describe("g"),
      fat: z.number().describe("g"),
      fiber: z.number().describe("g"),
      sugar: z.number().describe("g"),
      micros: MicrosSchema.describe("Micronutrients for this item at the estimated grams"),
    }),
  ),
});

export type MealEstimate = z.infer<typeof MealSchema>;

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM = `You are the nutrition estimator inside Violi, a calorie and macro tracking app used mostly in Greece.
Identify every distinct food and drink in the meal and estimate its edible weight and nutrition.
- Estimate portions from visual cues: a standard dinner plate is ~26 cm, a fork ~19 cm, a slice of bread ~30–40 g.
- Account for cooking oil and sauces that are likely present (Greek cooking often uses generous olive oil), and mention it in notes.
- Use USDA / Greek food-composition values. All nutrition numbers are for the estimated grams of that item, not per 100 g.
- Split composite dishes only when components are clearly separable; otherwise log the dish as one item (e.g. "Μουσακάς").
- If something is not food, return an empty items list.
Write names, mealName and notes in the requested language.`;

export async function estimateMeal(input: { imageBase64?: string; mediaType?: string; text?: string; locale: string }) {
  const client = new Anthropic();
  const language = input.locale === "en" ? "English" : "Greek";
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.imageBase64) {
    const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(input.mediaType ?? "") ? input.mediaType : "image/jpeg") as
      "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: input.imageBase64 } });
  }
  content.push({
    type: "text",
    text: `Language: ${language}.\n${input.text ? `The user describes the meal as: """${input.text.slice(0, 1000)}"""` : "Estimate the meal in the photo."}`,
  });

  // Server-side fallback: if a safety classifier declines, the API retries on Anthropic's recommended fallback model.
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(MealSchema) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("AI_REFUSED");
  if (!response.parsed_output) throw new Error("AI_PARSE_FAILED");
  return response.parsed_output;
}
