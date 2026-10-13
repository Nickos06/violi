// Workout types (the Strava-style sport catalogue in lib/sports.ts) and calorie estimates for manual entries.
import { SPORTS, estimateKcal, type Sport } from "./sports";

export const WORKOUT_TYPES = SPORTS;
export type WorkoutType = Sport;

/** Active calories (above resting) for a workout: (MET − 1) × kg × hours. */
export function estimateWorkoutKcal(type: string, minutes: number, weightKg: number) {
  return estimateKcal(type, minutes * 60, weightKg);
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}
