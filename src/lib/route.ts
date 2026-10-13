// Route geometry shared by the recorder, the server and the feed. No browser or server APIs.

/** [lat, lng, elevation | null, seconds since start, cumulative metres] */
export type RoutePoint = [number, number, number | null, number, number];
/** `breaks` are indices where a new segment starts (after a pause), so gaps are not drawn as lines. */
export type Route = { pts: RoutePoint[]; breaks: number[] };
export type Split = { sec: number; elev: number };

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Splits the route into drawable segments of [lat, lng]. */
export function segments(route: Route): [number, number][][] {
  const cuts = [0, ...route.breaks.filter((b) => b > 0 && b < route.pts.length), route.pts.length];
  const out: [number, number][][] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const seg = route.pts.slice(cuts[i], cuts[i + 1]).map((p) => [p[0], p[1]] as [number, number]);
    if (seg.length > 1) out.push(seg);
  }
  return out;
}

// Ramer–Douglas–Peucker on a local flat projection, iterative so long rides don't blow the stack.
function rdpKeep(pts: RoutePoint[], tolM: number) {
  const keep = new Uint8Array(pts.length);
  if (pts.length < 3) return keep.fill(1);
  const lat0 = rad(pts[0][0]);
  const xy = pts.map((p) => [rad(p[1]) * Math.cos(lat0) * R, rad(p[0]) * R]);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let max = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolM && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return keep;
}

/** Simplifies a route to at most `max` points, keeping segment boundaries. */
export function simplify(route: Route, max = 1500): Route {
  if (route.pts.length <= max) return route;
  let tol = 2, keep = rdpKeep(route.pts, tol);
  const count = () => keep.reduce((n, k) => n + k, 0);
  while (count() > max && tol < 500) { tol *= 1.6; keep = rdpKeep(route.pts, tol); }
  for (const b of route.breaks) { if (b < keep.length) keep[b] = 1; if (b - 1 >= 0) keep[b - 1] = 1; }
  const pts: RoutePoint[] = [], map = new Map<number, number>();
  route.pts.forEach((p, i) => { if (keep[i]) { map.set(i, pts.length); pts.push(p); } });
  return { pts, breaks: route.breaks.map((b) => map.get(b)).filter((b): b is number => b != null) };
}

/** Hides the first and last `m` metres (Strava-style privacy for start/end points such as home). */
export function trimEnds(route: Route, m = 200): Route {
  const total = route.pts.at(-1)?.[4] ?? 0;
  if (total < m * 3) return { pts: [], breaks: [] };
  const idx = route.pts.map((p, i) => [p, i] as const).filter(([p]) => p[4] >= m && p[4] <= total - m);
  const first = idx[0]?.[1] ?? 0;
  return { pts: idx.map(([p]) => p), breaks: route.breaks.map((b) => b - first).filter((b) => b > 0 && b < idx.length) };
}

/** SVG path data for a route, fitted into a w×h box with padding. Equirectangular, fine at city scale. */
export function routePath(route: Route, w: number, h: number, pad = 8) {
  const pts = route.pts;
  if (pts.length < 2) return "";
  const k = Math.cos(rad(pts.reduce((s, p) => s + p[0], 0) / pts.length));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { const x = p[1] * k, y = -p[0]; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const s = Math.min((w - pad * 2) / (maxX - minX || 1e-9), (h - pad * 2) / (maxY - minY || 1e-9));
  const ox = (w - (maxX - minX) * s) / 2, oy = (h - (maxY - minY) * s) / 2;
  const breaks = new Set(route.breaks);
  return pts
    .map((p, i) => `${i === 0 || breaks.has(i) ? "M" : "L"}${((p[1] * k - minX) * s + ox).toFixed(1)} ${((-p[0] - minY) * s + oy).toFixed(1)}`)
    .join("");
}

/** Elevation gain with hysteresis, so GPS altitude noise doesn't add up to phantom climbing. */
export function elevationGain(eles: (number | null)[], threshold = 3) {
  let gain = 0, ref: number | null = null, smooth: number | null = null;
  for (const e of eles) {
    if (e == null) continue;
    smooth = smooth == null ? e : smooth + 0.3 * (e - smooth);
    if (ref == null) ref = smooth;
    else if (smooth - ref >= threshold) { gain += smooth - ref; ref = smooth; }
    else if (ref - smooth >= threshold) ref = smooth;
  }
  return Math.round(gain);
}

export function asRoute(v: unknown): Route | null {
  const r = v as Route | null;
  return r && Array.isArray(r.pts) && r.pts.length > 1 ? { pts: r.pts, breaks: Array.isArray(r.breaks) ? r.breaks : [] } : null;
}
