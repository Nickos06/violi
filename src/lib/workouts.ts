// Workout types and MET-based calorie estimates for manual entries (Compendium of Physical Activities).

export const WORKOUT_TYPES = ["run", "ride", "swim", "walk", "hike", "strength", "hiit", "yoga", "football", "basketball", "tennis", "other"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_ICON: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", walk: "🚶", hike: "🥾", strength: "🏋️", hiit: "⚡", yoga: "🧘",
  football: "⚽", basketball: "🏀", tennis: "🎾", other: "💪",
};

const MET: Record<string, number> = {
  run: 9.8, ride: 7.5, swim: 7.0, walk: 3.5, hike: 6.0, strength: 5.0, hiit: 8.0, yoga: 2.8,
  football: 7.0, basketball: 6.5, tennis: 7.3, other: 5.0,
};

/** Active calories (above resting) for a workout: (MET − 1) × kg × hours. */
export function estimateWorkoutKcal(type: string, minutes: number, weightKg: number) {
  const met = MET[type] ?? 5;
  return Math.round((met - 1) * weightKg * (minutes / 60));
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}
