// Sport catalogue, modelled on Strava's sport types. Shared by the recorder, manual entry, imports and the feed.
//  gps     — the recorder tracks location (map, distance, pace/speed). Indoor sports record time only.
//  metric  — how speed is shown: pace per km (foot), per 100 m (swim), per 500 m (rowing), km/h, or nothing.
//  met     — Compendium of Physical Activities value, for calorie estimates.
//  pause   — auto-pause threshold in m/s (0 = auto-pause not offered, e.g. skiing on lifts).
//  g       — grammatical gender of the Greek title noun, for "Πρωινό τρέξιμο" / "Πρωινή πεζοπορία".

export type SportMetric = "pace" | "pace100" | "pace500" | "speed" | "none";
export type SportGroup = "foot" | "cycle" | "water" | "winter" | "wheels" | "fitness" | "sports";

type Def = { el: string; en: string; group: SportGroup; gps: boolean; metric: SportMetric; met: number; pause: number; g: "m" | "f" | "n"; titleEl?: string };

const S = {
  run: { el: "Τρέξιμο", en: "Run", group: "foot", gps: true, metric: "pace", met: 9.8, pause: 0.8, g: "n" },
  trail_run: { el: "Ορεινό τρέξιμο", en: "Trail Run", group: "foot", gps: true, metric: "pace", met: 10.5, pause: 0.5, g: "n" },
  walk: { el: "Περπάτημα", en: "Walk", group: "foot", gps: true, metric: "pace", met: 3.5, pause: 0.35, g: "n" },
  hike: { el: "Πεζοπορία", en: "Hike", group: "foot", gps: true, metric: "pace", met: 6.0, pause: 0.3, g: "f" },
  treadmill: { el: "Διάδρομος", en: "Treadmill Run", group: "foot", gps: false, metric: "pace", met: 9.0, pause: 0, g: "m" },

  ride: { el: "Ποδήλατο", en: "Ride", group: "cycle", gps: true, metric: "speed", met: 7.5, pause: 1.4, g: "n" },
  mountain_bike: { el: "Ποδήλατο βουνού", en: "Mountain Bike Ride", group: "cycle", gps: true, metric: "speed", met: 8.5, pause: 1.0, g: "n" },
  gravel_ride: { el: "Gravel ποδήλατο", en: "Gravel Ride", group: "cycle", gps: true, metric: "speed", met: 8.0, pause: 1.2, g: "n" },
  ebike_ride: { el: "Ηλεκτρικό ποδήλατο", en: "E-Bike Ride", group: "cycle", gps: true, metric: "speed", met: 4.0, pause: 1.4, g: "n" },
  indoor_ride: { el: "Ποδήλατο γυμναστηρίου", en: "Indoor Ride", group: "cycle", gps: false, metric: "speed", met: 6.8, pause: 0, g: "n" },

  swim: { el: "Κολύμβηση", en: "Swim", group: "water", gps: false, metric: "pace100", met: 7.0, pause: 0, g: "f" },
  open_water: { el: "Κολύμβηση στη θάλασσα", en: "Open Water Swim", group: "water", gps: true, metric: "pace100", met: 8.0, pause: 0, g: "f" },
  rowing: { el: "Κωπηλασία", en: "Rowing", group: "water", gps: true, metric: "pace500", met: 6.0, pause: 0.5, g: "f" },
  kayaking: { el: "Καγιάκ", en: "Kayaking", group: "water", gps: true, metric: "speed", met: 5.0, pause: 0.4, g: "n" },
  sup: { el: "SUP", en: "Stand Up Paddling", group: "water", gps: true, metric: "speed", met: 6.0, pause: 0.3, g: "n" },
  surf: { el: "Σέρφινγκ", en: "Surf", group: "water", gps: true, metric: "none", met: 3.0, pause: 0, g: "n" },
  sail: { el: "Ιστιοπλοΐα", en: "Sail", group: "water", gps: true, metric: "speed", met: 3.0, pause: 0, g: "f" },

  alpine_ski: { el: "Σκι", en: "Alpine Ski", group: "winter", gps: true, metric: "speed", met: 5.3, pause: 0, g: "n" },
  snowboard: { el: "Snowboard", en: "Snowboard", group: "winter", gps: true, metric: "speed", met: 5.3, pause: 0, g: "n" },
  nordic_ski: { el: "Σκι αντοχής", en: "Nordic Ski", group: "winter", gps: true, metric: "speed", met: 9.0, pause: 0.6, g: "n" },

  inline_skate: { el: "Πατινάζ", en: "Inline Skate", group: "wheels", gps: true, metric: "speed", met: 7.5, pause: 1.0, g: "n" },
  skateboard: { el: "Skateboard", en: "Skateboard", group: "wheels", gps: true, metric: "speed", met: 5.0, pause: 1.0, g: "n" },

  strength: { el: "Βάρη", en: "Weight Training", group: "fitness", gps: false, metric: "none", met: 5.0, pause: 0, g: "f", titleEl: "προπόνηση με βάρη" },
  hiit: { el: "HIIT", en: "HIIT", group: "fitness", gps: false, metric: "none", met: 8.0, pause: 0, g: "n" },
  crossfit: { el: "CrossFit", en: "Crossfit", group: "fitness", gps: false, metric: "none", met: 8.0, pause: 0, g: "n" },
  yoga: { el: "Yoga", en: "Yoga", group: "fitness", gps: false, metric: "none", met: 2.8, pause: 0, g: "f" },
  pilates: { el: "Pilates", en: "Pilates", group: "fitness", gps: false, metric: "none", met: 3.0, pause: 0, g: "n" },
  elliptical: { el: "Ελλειπτικό", en: "Elliptical", group: "fitness", gps: false, metric: "none", met: 5.0, pause: 0, g: "n" },
  stair_stepper: { el: "Stair stepper", en: "Stair-Stepper", group: "fitness", gps: false, metric: "none", met: 9.0, pause: 0, g: "n" },
  other: { el: "Άλλο", en: "Workout", group: "fitness", gps: false, metric: "none", met: 5.0, pause: 0, g: "f", titleEl: "προπόνηση" },

  football: { el: "Ποδόσφαιρο", en: "Soccer", group: "sports", gps: true, metric: "none", met: 7.0, pause: 0, g: "n" },
  basketball: { el: "Μπάσκετ", en: "Basketball", group: "sports", gps: false, metric: "none", met: 6.5, pause: 0, g: "n" },
  tennis: { el: "Τένις", en: "Tennis", group: "sports", gps: false, metric: "none", met: 7.3, pause: 0, g: "n" },
  padel: { el: "Padel", en: "Padel", group: "sports", gps: false, metric: "none", met: 6.0, pause: 0, g: "n" },
  volleyball: { el: "Βόλεϊ", en: "Volleyball", group: "sports", gps: false, metric: "none", met: 4.0, pause: 0, g: "n" },
  badminton: { el: "Μπάντμιντον", en: "Badminton", group: "sports", gps: false, metric: "none", met: 5.5, pause: 0, g: "n" },
  table_tennis: { el: "Πινγκ πονγκ", en: "Table Tennis", group: "sports", gps: false, metric: "none", met: 4.0, pause: 0, g: "n" },
  climbing: { el: "Αναρρίχηση", en: "Rock Climb", group: "sports", gps: false, metric: "none", met: 8.0, pause: 0, g: "f" },
  golf: { el: "Γκολφ", en: "Golf", group: "sports", gps: true, metric: "none", met: 4.8, pause: 0, g: "n" },
  boxing: { el: "Πυγμαχία", en: "Boxing", group: "sports", gps: false, metric: "none", met: 7.8, pause: 0, g: "f" },
  martial_arts: { el: "Πολεμικές τέχνες", en: "Martial Arts", group: "sports", gps: false, metric: "none", met: 7.5, pause: 0, g: "f", titleEl: "προπόνηση πολεμικών τεχνών" },
  dance: { el: "Χορός", en: "Dance", group: "sports", gps: false, metric: "none", met: 5.0, pause: 0, g: "m" },
} satisfies Record<string, Def>;

export type Sport = keyof typeof S;
export const SPORTS = Object.keys(S) as [Sport, ...Sport[]];
export const SPORT: Record<Sport, Def> = S;
export const SPORT_GROUPS: SportGroup[] = ["foot", "cycle", "water", "winter", "wheels", "fitness", "sports"];
export const GROUP_LABEL: Record<SportGroup, { el: string; en: string }> = {
  foot: { el: "Τρέξιμο & περπάτημα", en: "Foot sports" },
  cycle: { el: "Ποδήλατο", en: "Cycle sports" },
  water: { el: "Νερό", en: "Water sports" },
  winter: { el: "Χιόνι", en: "Winter sports" },
  wheels: { el: "Ρόδες", en: "Wheels" },
  fitness: { el: "Γυμναστική", en: "Fitness" },
  sports: { el: "Αθλήματα", en: "Sports" },
};

export const isSport = (v: unknown): v is Sport => typeof v === "string" && v in S;
export const sportOf = (v: string): Def => (isSport(v) ? S[v] : S.other);
export const sportName = (v: string, locale: string) => sportOf(v)[locale === "el" ? "el" : "en"];

/** Strava-style automatic title: "Πρωινό τρέξιμο" / "Afternoon Ride". */
export function autoTitle(sport: string, at: Date, locale: string) {
  const h = at.getHours();
  const part = h < 5 ? "night" : h < 11 ? "morning" : h < 14 ? "lunch" : h < 18 ? "afternoon" : h < 22 ? "evening" : "night";
  const d = sportOf(sport);
  if (locale !== "el") return `${{ morning: "Morning", lunch: "Lunch", afternoon: "Afternoon", evening: "Evening", night: "Night" }[part]} ${d.en}`;
  const adj = { morning: "Πρωιν", lunch: "Μεσημεριαν", afternoon: "Απογευματιν", evening: "Βραδιν", night: "Νυχτεριν" }[part];
  const end = { n: "ό", f: "ή", m: "ός" }[d.g];
  const noun = d.titleEl ?? (/^\p{Lu}\p{Ll}/u.test(d.el) ? d.el[0].toLowerCase() + d.el.slice(1) : d.el);
  return `${adj}${end} ${noun}`;
}

/** Active calories (above resting) for a session: (MET − 1) × kg × hours. */
export function estimateKcal(sport: string, movingSec: number, weightKg: number) {
  return Math.round((sportOf(sport).met - 1) * weightKg * (movingSec / 3600));
}

// ── Formatting ────────────────────────────────────────────────────────────────

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 1:02:05 / 12:05 */
export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`;
}

/** Pace / speed for a sport, from metres and seconds. Returns value + unit, "–" when undefined. */
export function speedOf(sport: string, distM: number, sec: number): { v: string; unit: string } {
  const metric = sportOf(sport).metric;
  if (metric === "speed" || metric === "none") return { v: distM > 0 && sec > 0 ? ((distM / sec) * 3.6).toFixed(1) : "–", unit: "km/h" };
  const per = metric === "pace100" ? 100 : metric === "pace500" ? 500 : 1000;
  const unit = metric === "pace100" ? "/100m" : metric === "pace500" ? "/500m" : "/km";
  if (distM < 10 || sec <= 0) return { v: "–", unit };
  const p = (sec / distM) * per;
  return { v: p > 99 * 60 ? "–" : clock(p), unit };
}

export const km = (m: number | null | undefined, digits = 2) => ((m ?? 0) / 1000).toFixed(digits);

/** Strava's perceived exertion scale. */
export function effortLabel(n: number, locale: string) {
  const el = locale === "el";
  if (n <= 3) return el ? "Εύκολο" : "Easy";
  if (n <= 6) return el ? "Μέτριο" : "Moderate";
  if (n <= 8) return el ? "Δύσκολο" : "Hard";
  return el ? "Στο φουλ" : "Max effort";
}
