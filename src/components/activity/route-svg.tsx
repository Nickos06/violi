import { routePath, type Route } from "@/lib/route";
import { cn } from "../ui";

/** Map-less route trace in ink — for lists, the feed and the save screen. */
export function RouteSvg({ route, width = 320, height = 180, className, strokeWidth = 3 }: { route: Route; width?: number; height?: number; className?: string; strokeWidth?: number }) {
  const d = routePath(route, width, height, 14);
  if (!d) return null;
  const first = d.match(/^M([\d.]+) ([\d.]+)/);
  const last = d.match(/[ML]([\d.]+) ([\d.]+)$/);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("text-text", className)} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {first && <circle cx={first[1]} cy={first[2]} r={strokeWidth + 1.5} fill="var(--bg)" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      {last && <circle cx={last[1]} cy={last[2]} r={strokeWidth + 1.5} fill="currentColor" />}
    </svg>
  );
}
