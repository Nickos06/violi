// Dates are stored as local calendar days ("YYYY-MM-DD"). The app uses the server's timezone
// unless overridden with APP_TIMEZONE (default Europe/Athens).

const TZ = process.env.APP_TIMEZONE || "Europe/Athens";

export function today(): string {
  return toDay(new Date());
}

export function toDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export function weekday(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const wd = weekday(day);
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}

export function isValidDay(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function hourNow(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()));
}
