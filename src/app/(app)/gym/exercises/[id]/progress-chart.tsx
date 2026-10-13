"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { cn, fmt } from "@/components/ui";

type Pt = { date: string; e1rm: number; weight: number; volume: number };

export function ProgressChart({ points }: { points: Pt[] }) {
  const { t, locale } = useT();
  const [metric, setMetric] = useState<"e1rm" | "weight" | "volume">("e1rm");
  const data = points.filter((p) => p[metric] > 0);
  const W = 340, H = 160, pad = { l: 34, r: 8, t: 12, b: 20 };
  const vals = data.map((p) => p[metric]);
  const min = Math.min(...vals) * 0.95, max = Math.max(...vals) * 1.05 || 1;
  const x = (i: number) => pad.l + (data.length < 2 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const path = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[metric]).toFixed(1)}`).join("");
  const last = data.at(-1);
  const first = data[0];
  const delta = last && first ? last[metric] - first[metric] : 0;
  const label = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-chrome tabular text-[32px] font-extrabold leading-none tracking-[-0.03em]">{last ? fmt(last[metric], 1) : "—"}<span className="ml-1 text-[14px] text-muted">kg</span></div>
          {data.length > 1 && <div className="tabular mt-1 text-[12.5px] font-bold text-muted">{delta >= 0 ? "+" : ""}{fmt(delta, 1)} kg</div>}
        </div>
        <div className="edge flex gap-1 rounded-xl p-1">
          {(["e1rm", "weight", "volume"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={cn("press rounded-lg px-2.5 py-1 text-[12px] font-bold", metric === m ? "varnish" : "text-muted")}>
              {m === "e1rm" ? t.gym.e1rmChart : m === "weight" ? t.gym.weightChart : t.gym.volumeChart}
            </button>
          ))}
        </div>
      </div>
      {data.length > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Progress">
          <defs>
            <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--text)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--text)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => {
            const v = min + (max - min) * (1 - f);
            return (
              <g key={f}>
                <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="3 4" />
                <text x={pad.l - 5} y={y(v) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--faint)">{Math.round(v)}</text>
              </g>
            );
          })}
          {data.length > 1 && <path d={`${path}L${x(data.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`} fill="url(#pc-fill)" />}
          <path d={path} fill="none" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p, i) => <circle key={i} cx={x(i)} cy={y(p[metric])} r="2.6" fill="var(--bg)" stroke="var(--text)" strokeWidth="1.6" />)}
          <text x={pad.l} y={H - 5} fontSize="9.5" fill="var(--faint)">{first && label(first.date)}</text>
          <text x={W - pad.r} y={H - 5} fontSize="9.5" fill="var(--faint)" textAnchor="end">{last && label(last.date)}</text>
        </svg>
      )}
    </div>
  );
}
