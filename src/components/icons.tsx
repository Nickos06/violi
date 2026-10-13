// Icon vocabulary for meals, saved meals, workouts and achievements (lucide, no emoji).
import {
  Activity, Apple, Award, Beef, Bike, Camera, ChefHat, CircleDot, Coffee, Cookie, Croissant, Crown, Drumstick, Dumbbell, Egg, Fish,
  Flame, Flower2, Footprints, Gem, Goal, Heart, Medal, MessageCircle, Moon, Mountain, PersonStanding, Pizza, Salad, Sandwich, Scale,
  Soup, Sunrise, Target, Trophy, Utensils, Volleyball, WavesLadder, Watch, Zap, type LucideIcon,
  BicepsFlexed, Feather, Flag, Flower, Gauge, HandFist, Kayak, MountainSnow, Music, Route, Sailboat, Snowflake, Swords, Trees, TreePine, Waves,
} from "lucide-react";
import type { Sport } from "@/lib/sports";
import type { MealIconKey } from "@/lib/meal-icons";
import type { AchievementKey } from "@/lib/levels";

export const MEAL_SLOT_ICON: Record<string, LucideIcon> = { breakfast: Sunrise, lunch: Soup, dinner: Moon, snack: Apple };
export const MEAL_SLOT_TONE: Record<string, string> = {
  breakfast: "var(--text)", lunch: "var(--text)", dinner: "var(--text)", snack: "var(--text)",
};

export const SAVED_MEAL_ICON: Record<MealIconKey, LucideIcon> = {
  utensils: Utensils, salad: Salad, soup: Soup, sandwich: Sandwich, pizza: Pizza, beef: Beef, drumstick: Drumstick, fish: Fish,
  egg: Egg, coffee: Coffee, croissant: Croissant, apple: Apple, cookie: Cookie, chef: ChefHat,
};

export const WORKOUT_ICON: Record<Sport, LucideIcon> = {
  run: Footprints, trail_run: Trees, walk: PersonStanding, hike: Mountain, treadmill: Gauge,
  ride: Bike, mountain_bike: Bike, gravel_ride: Bike, ebike_ride: Bike, indoor_ride: Bike,
  swim: WavesLadder, open_water: Waves, rowing: Kayak, kayaking: Kayak, sup: Waves, surf: Waves, sail: Sailboat,
  alpine_ski: MountainSnow, snowboard: Snowflake, nordic_ski: TreePine, inline_skate: Route, skateboard: Route,
  strength: Dumbbell, hiit: Zap, crossfit: BicepsFlexed, yoga: Flower2, pilates: Flower, elliptical: Activity, stair_stepper: Activity, other: Activity,
  football: Goal, basketball: CircleDot, tennis: Volleyball, padel: CircleDot, volleyball: Volleyball, badminton: Feather, table_tennis: CircleDot,
  climbing: MountainSnow, golf: Flag, boxing: HandFist, martial_arts: Swords, dance: Music,
};

export function WorkoutIcon({ type, className }: { type: string; className?: string }) {
  const I = WORKOUT_ICON[type as Sport] ?? Activity;
  return <I className={className} />;
}

export const ACHIEVEMENT_ICON: Record<AchievementKey, LucideIcon> = {
  first_log: Utensils, first_scan: Camera, streak_3: Flame, streak_7: Flame, streak_30: Flame, streak_100: Crown,
  protein_7: Beef, on_target_7: Target, first_workout: Footprints, workouts_10: Dumbbell, workouts_50: Zap, weigh_7: Scale,
  first_checkin: Activity, level_5: Medal, level_10: Award, level_20: Gem, first_post: MessageCircle, w_10: Heart, connected: Watch,
};

export const ACHIEVEMENT_TONE: Record<AchievementKey, string> = Object.fromEntries(
  (Object.keys(ACHIEVEMENT_ICON) as AchievementKey[]).map((k) => [k, "var(--text)"]),
) as Record<AchievementKey, string>;

export { Trophy };
