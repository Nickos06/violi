// Single source of truth for the Violi violin mark (64×64 box).
// Used by <ViolinMark/> (themed via CSS variables) and by the static app icons (black tile, white violin).

const right = (x: number) => (64 - x).toFixed(2);

// Right half of the body, top centre → bottom centre, with pointed corners around the C-bouts.
const R = {
  top: [32, 23.6],
  upper: [[36.6, 23.6], [41.9, 24.7], [43.1, 28.5]],
  shoulder: [[43.8, 30.8], [43.5, 33.3], [42.3, 35]],
  cbout: [[39.9, 35.7], [38.5, 37.7], [38.5, 39.4]],
  cbout2: [[38.5, 41.1], [39.9, 43.1], [42.3, 43.8]],
  lower: [[45.1, 45.1], [46, 47.7], [45.8, 50.6]],
  bottom: [[45.5, 55.2], [39.5, 57.6], [32, 57.6]],
} as const;

function bodyPath() {
  const seg = (pts: readonly (readonly number[])[]) => `C${pts.map((p) => `${p[0]} ${p[1]}`).join(" ")}`;
  const mirror = (pts: readonly (readonly number[])[]) => pts.map((p) => [Number(right(p[0])), p[1]]);
  const halves = [R.upper, R.shoulder, R.cbout, R.cbout2, R.lower, R.bottom];
  const rightSide = halves.map(seg).join("");
  const pointsUp: number[][][] = [];
  const all = [R.top, ...halves.map((h) => h[2])];
  for (let i = halves.length - 1; i >= 0; i--) {
    const [c1, c2] = halves[i];
    pointsUp.push(mirror([c2, c1, all[i]]) as number[][]);
  }
  return `M${R.top[0]} ${R.top[1]}${rightSide}${pointsUp.map(seg).join("")}Z`;
}

export const VIOLIN = {
  body: bodyPath(),
  neck: { x: 30.9, y: 12, w: 2.2, h: 14 },
  fingerboard: { x: 30.7, y: 11.2, w: 2.6, h: 26.4, r: 1.3 },
  pegbox: "M30.4 8.4h3.2l-.3 4.6h-2.6Z",
  pegs: "M28.4 9.2h2.2v1.1h-2.2ZM33.4 10.4h2.2v1.1h-2.2ZM28.4 11.4h2.2v1.1h-2.2Z",
  scrollCircle: { cx: 32, cy: 5.9, r: 2.75 },
  spiral: "M32.15 6.75a.85.85 0 1 1 .85-.85a1.75 1.75 0 1 1-1.75-1.75",
  fHoles: "M27.25 38.4c-1.35 1.6 1.35 3.25 0 4.85s1.35 3.25 0 4.85M36.75 38.4c1.35 1.6-1.35 3.25 0 4.85s-1.35 3.25 0 4.85",
  fDots: [[28.05, 38.05], [26.45, 48.45], [35.95, 38.05], [37.55, 48.45]],
  tailpiece: "M30.6 49.4h2.8l1 6.6h-4.8Z",
  bridge: "M29 45.4h6",
  strings: "M31.2 9.5V49.5M31.73 9.5V49.5M32.27 9.5V49.5M32.8 9.5V49.5",
};

export type VioliColors = { tile: string; wood: string; ink: string; tileGradient?: [string, string]; id?: string };

/** Graphite-to-black metallic tile, white violin — the static app icon. */
export const ICON_COLORS: VioliColors = { tile: "#0a0a0a", wood: "#fafafa", ink: "#0a0a0a", tileGradient: ["#4a4a4a", "#000000"] };

/** Standalone SVG markup. Colours may be CSS variables when inlined in the page. */
export function violinIconSvg({ rounded = 16, colors = ICON_COLORS, strings = true }: { rounded?: number; colors?: VioliColors; strings?: boolean } = {}) {
  const v = VIOLIN;
  const { wood, ink, tileGradient, id = "vt" } = colors;
  const defs = tileGradient
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${tileGradient[0]}"/><stop offset="1" stop-color="${tileGradient[1]}"/></linearGradient></defs>`
    : "";
  const tile = tileGradient ? `url(#${id})` : colors.tile;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}<rect width="64" height="64" rx="${rounded}" fill="${tile}"/><g transform="rotate(20 32 32)"><rect x="${v.neck.x}" y="${v.neck.y}" width="${v.neck.w}" height="${v.neck.h}" fill="${wood}"/><path d="${v.pegs}" fill="${wood}"/><path d="${v.pegbox}" fill="${wood}"/><circle cx="${v.scrollCircle.cx}" cy="${v.scrollCircle.cy}" r="${v.scrollCircle.r}" fill="${wood}"/><path d="${v.spiral}" fill="none" stroke="${ink}" stroke-width=".7" stroke-linecap="round"/><path d="${v.body}" fill="${wood}"/><rect x="${v.fingerboard.x}" y="${v.fingerboard.y}" width="${v.fingerboard.w}" height="${v.fingerboard.h}" rx="${v.fingerboard.r}" fill="${ink}"/><path d="${v.fHoles}" fill="none" stroke="${ink}" stroke-width="1.05" stroke-linecap="round"/>${v.fDots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".75" fill="${ink}"/>`).join("")}<path d="${v.tailpiece}" fill="${ink}"/><path d="${v.bridge}" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>${strings ? `<path d="${v.strings}" stroke="${wood}" stroke-width=".32" stroke-opacity=".9"/>` : ""}</g></svg>`;
}
