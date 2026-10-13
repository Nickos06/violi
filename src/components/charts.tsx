// Minimal SVG charts (no chart library): a weight/trend line chart and an intake bar chart.

type Pt = { date: string; weight: number | null; trend: number };

export function WeightChart({ points, locale }: { points: Pt[]; locale: string }) {
  if (points.length < 2) return null;
  const W = 340, H = 170, pad = { l: 30, r: 6, t: 10, b: 20 };
  const vals = points.flatMap((p) => (p.weight != null ? [p.weight, p.trend] : [p.trend]));
  let min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(1, max - min);
  min -= span * 0.15; max += span * 0.15;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const trendPath = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join("");
  const area = `${trendPath}L${x(points.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  const ticks = [0, 0.5, 1].map((f) => min + (max - min) * (1 - f) * 0.85 + (max - min) * 0.075);
  const dateLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="3 4" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="9.5" fill="var(--faint)">{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={area} fill="url(#wfill)" />
      {points.map((p, i) => p.weight != null && <circle key={p.date} cx={x(i)} cy={y(p.weight)} r="2.2" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.2" />)}
      <path d={trendPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <text x={pad.l} y={H - 6} fontSize="9.5" fill="var(--faint)">{dateLabel(points[0].date)}</text>
      <text x={W - pad.r} y={H - 6} fontSize="9.5" fill="var(--faint)" textAnchor="end">{dateLabel(points.at(-1)!.date)}</text>
    </svg>
  );
}

export function IntakeBars({ days, target, locale }: { days: { date: string; kcal: number; budget: number }[]; target: number; locale: string }) {
  if (!days.length) return null;
  const W = 340, H = 120, pad = { l: 2, r: 2, t: 6, b: 18 };
  const max = Math.max(target * 1.3, ...days.map((d) => d.kcal), ...days.map((d) => d.budget));
  const bw = (W - pad.l - pad.r) / days.length;
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily intake">
      {days.map((d, i) => {
        const over = d.kcal > d.budget * 1.1;
        const h = H - pad.b - y(d.kcal);
        return (
          <g key={d.date}>
            <rect x={pad.l + i * bw + bw * 0.18} y={y(d.budget)} width={bw * 0.64} height={H - pad.b - y(d.budget)} rx="3" fill="var(--surface-3)" />
            {d.kcal > 0 && <rect x={pad.l + i * bw + bw * 0.18} y={y(d.kcal)} width={bw * 0.64} height={h} rx="3" fill={over ? "var(--bad)" : "var(--accent)"} opacity="0.9" />}
            <text x={pad.l + i * bw + bw / 2} y={H - 6} fontSize="9.5" textAnchor="middle" fill="var(--faint)">
              {new Date(`${d.date}T12:00:00`).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { weekday: "narrow" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
