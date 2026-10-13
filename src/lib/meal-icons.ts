// Icon keys users can pick for saved meals (mapped to lucide icons in components/meal-icon.tsx).
export const MEAL_ICONS = [
  "utensils", "salad", "soup", "sandwich", "pizza", "beef", "drumstick", "fish", "egg", "coffee", "croissant", "apple", "cookie", "chef",
] as const;

export type MealIconKey = (typeof MEAL_ICONS)[number];
