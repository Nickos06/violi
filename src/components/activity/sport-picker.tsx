"use client";

import { Check } from "lucide-react";
import { GROUP_LABEL, SPORT_GROUPS, SPORTS, sportName, SPORT, type Sport } from "@/lib/sports";
import { WorkoutIcon } from "../icons";
import { useT } from "../i18n-provider";
import { Sheet } from "../sheet";
import { cn } from "../ui";

/** Strava-style sport list: recent first, then grouped (foot, cycle, water, …). */
export function SportPicker({ open, onClose, value, onPick, recent = [], gpsOnly = false }: {
  open: boolean; onClose: () => void; value: Sport; onPick: (s: Sport) => void; recent?: string[]; gpsOnly?: boolean;
}) {
  const { t, locale } = useT();
  const L = locale === "el" ? "el" : "en";
  const rec = recent.filter((s): s is Sport => (SPORTS as readonly string[]).includes(s)).slice(0, 4);
  const Row = ({ s }: { s: Sport }) => (
    <button
      onClick={() => { onPick(s); onClose(); }}
      className={cn("press flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left", s === value && "bg-surface-2")}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s === value ? "varnish" : "edge")}><WorkoutIcon type={s} className="size-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold">{sportName(s, locale)}</span>
        {!SPORT[s].gps && <span className="block text-[12px] font-semibold text-faint">{t.record.indoor}</span>}
      </span>
      {s === value && <Check className="size-5" strokeWidth={2.6} />}
    </button>
  );
  return (
    <Sheet open={open} onClose={onClose} title={t.record.chooseSport}>
      <div className="max-h-[70dvh] space-y-5 overflow-y-auto overscroll-contain pb-2">
        {rec.length > 0 && (
          <section>
            <h3 className="mb-1 px-2 text-[11px] font-black uppercase tracking-[0.12em] text-faint">{t.record.recent}</h3>
            {rec.map((s) => <Row key={`r-${s}`} s={s} />)}
          </section>
        )}
        {SPORT_GROUPS.map((g) => {
          const list = SPORTS.filter((s) => SPORT[s].group === g && (!gpsOnly || SPORT[s].gps));
          if (!list.length) return null;
          return (
            <section key={g}>
              <h3 className="mb-1 px-2 text-[11px] font-black uppercase tracking-[0.12em] text-faint">{GROUP_LABEL[g][L]}</h3>
              {list.map((s) => <Row key={s} s={s} />)}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Strava's perceived-exertion slider (1–10). */
export function EffortSlider({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const { t, locale } = useT();
  const labels = locale === "el" ? ["Εύκολο", "Μέτριο", "Δύσκολο", "Στο φουλ"] : ["Easy", "Moderate", "Hard", "Max effort"];
  const band = value == null ? -1 : value <= 3 ? 0 : value <= 6 ? 1 : value <= 8 ? 2 : 3;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-bold">{t.record.effort}</span>
        <span className="tabular text-[13px] font-extrabold">{value == null ? "–" : `${value}/10 · ${labels[band]}`}</span>
      </div>
      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={t.record.effort}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(value === n ? null : n)}
            className={cn("press tabular h-10 rounded-lg text-[13px] font-extrabold transition-colors", value != null && n <= value ? "varnish" : "bg-surface-2 text-muted")}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-4 text-[11px] font-semibold text-faint">
        {labels.map((l, i) => <span key={l} className={cn(i === 3 && "text-right", (i === 1 || i === 2) && "text-center")}>{l}</span>)}
      </div>
    </div>
  );
}
