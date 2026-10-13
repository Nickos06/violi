// Pure level/rank math, safe to import from client components.

/** Total XP needed to reach `level` (level 1 = 0 XP, 2 = 100, 3 = 300, 10 = 4500 …). */
export function xpForLevel(level: number) {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - floor, needed: next - floor, progress: (xp - floor) / (next - floor) };
}

export type RankKey = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "legend";

export const RANKS: { key: RankKey; minLevel: number; color: string }[] = [
  { key: "bronze", minLevel: 1, color: "var(--text)" },
  { key: "silver", minLevel: 5, color: "var(--text)" },
  { key: "gold", minLevel: 10, color: "var(--text)" },
  { key: "platinum", minLevel: 15, color: "var(--text)" },
  { key: "diamond", minLevel: 20, color: "var(--text)" },
  { key: "master", minLevel: 30, color: "var(--text)" },
  { key: "legend", minLevel: 40, color: "var(--text)" },
];

export function rankForLevel(level: number) {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

export const ACHIEVEMENT_KEYS = [
  "first_log", "first_scan", "streak_3", "streak_7", "streak_30", "streak_100", "protein_7", "on_target_7",
  "first_workout", "workouts_10", "workouts_50", "weigh_7", "first_checkin", "level_5", "level_10", "level_20",
  "first_post", "w_10", "connected",
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];
