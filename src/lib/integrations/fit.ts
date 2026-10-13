import "server-only";
import FitParser from "fit-file-parser";
import { toDay } from "../dates";

const SPORT_MAP: Record<string, string> = {
  running: "run", cycling: "ride", e_biking: "ride", swimming: "swim", walking: "walk", hiking: "hike", training: "strength",
  fitness_equipment: "strength", hiit: "hiit", soccer: "football", basketball: "basketball", tennis: "tennis", racket: "tennis",
};

type FitSession = {
  sport?: string; sub_sport?: string; start_time?: string | Date; total_timer_time?: number; total_elapsed_time?: number;
  total_distance?: number; total_calories?: number; avg_heart_rate?: number; total_ascent?: number;
};

/** Parses a Garmin .FIT activity file into an activity summary. Distances are returned in metres. */
export async function parseFit(buf: ArrayBuffer) {
  const parser = new FitParser({ force: true, lengthUnit: "m", speedUnit: "m/s", mode: "list" });
  const data = (await parser.parseAsync(buf)) as unknown as { sessions?: FitSession[]; activity?: { timestamp?: string | Date } };
  const s = data.sessions?.[0];
  if (!s) throw new Error("FIT_NO_SESSION");
  const startAt = s.start_time ? new Date(s.start_time) : new Date();
  const sport = String(s.sub_sport === "strength_training" ? "training" : s.sport ?? "generic");
  return {
    type: SPORT_MAP[sport] ?? (s.sub_sport === "yoga" ? "yoga" : "other"),
    sport,
    startAt,
    date: toDay(startAt),
    durationSec: Math.round(s.total_timer_time ?? s.total_elapsed_time ?? 0),
    distanceM: s.total_distance ? Math.round(s.total_distance) : null,
    kcal: Math.round(s.total_calories ?? 0),
    avgHr: s.avg_heart_rate ? Math.round(s.avg_heart_rate) : null,
    elevationM: s.total_ascent ?? null,
  };
}
