// Violi mark "Παλμός" — a heartbeat that becomes a violin string, with a tilted bow.
// Geometry copied verbatim from brand/violi-mark.svg (the source of truth); only colours are parameterised.
// See brand/BRAND.md.

export const MARK_VIEWBOX = "1 17 97.5 68";
export const MARK_RATIO = 97.5 / 68; // ≈ 1.43 : 1

export type MarkColors = { ink: string; accent: string };

export const LIGHT: MarkColors = { ink: "#0a0a0a", accent: "#9a9a9a" };
export const DARK: MarkColors = { ink: "#fafafa", accent: "#7c7c7c" };

const VIOLIN_BODY =
  "M50 14C62 14 74 17.8 76 29.2C77 36.8 70 40.6 68 44.4C66 48.2 66 57.7 68 61.5C72 65.3 82 69.1 82 80.5C82 91.9 66 95.7 50 95.7C34 95.7 18 91.9 18 80.5C18 69.1 28 65.3 32 61.5C34 57.7 34 48.2 32 44.4C30 40.6 23 36.8 24 29.2C26 17.8 38 14 50 14Z";

/**
 * Inner markup of the mark (to place inside an <svg viewBox={MARK_VIEWBOX}>).
 * `simple` drops the stave and bow hair for tiny sizes (favicon), as BRAND.md recommends.
 * `maskId` must be unique per instance on a page.
 */
export function markInner({ ink, accent }: MarkColors, maskId: string, simple = false) {
  const stave = simple ? "" : `<path d="M3 38H97M3 44H97M3 56H97M3 62H97" stroke="${accent}" stroke-width="1.4"/>`;
  const bowHair = simple ? "" : `<path d="M66.2 20.9L80.8 71.1" stroke="${accent}" stroke-width="1.4"/>`;
  return (
    `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">` +
    `<rect width="100" height="100" fill="#fff"/>` +
    `<path d="M62.3 20L80.3 82" stroke="#000" stroke-width="5.4" stroke-linecap="round"/>` +
    `<path d="M66.2 20.9L80.8 71.1" stroke="#000" stroke-width="4.2" stroke-linecap="round"/>` +
    `</mask></defs>` +
    stave +
    `<g mask="url(#${maskId})">` +
    `<path d="M45.5 47.6H58V52.4H45.5Z" fill="${ink}"/>` +
    `<path d="${VIOLIN_BODY}" transform="translate(49.15 75) rotate(-90) scale(.5)" fill="${ink}"/>` +
    `</g>` +
    `<circle cx="44" cy="50" r="4" fill="${ink}"/>` +
    `<path d="M44 50H93" stroke="${accent}" stroke-width="1.4"/>` +
    `<path d="M77 44.5V55.5" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M4 50H12L16.5 42L23 71L31 25L35.5 50H42" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    bowHair +
    `<path d="M62.3 20L80.3 82" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M62.3 20L66.2 20.9" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M77.4 72.1L80.8 71.1" stroke="${ink}" stroke-width="4.5"/>`
  );
}

/** Standalone mark SVG. */
export function markSvg(colors: MarkColors = LIGHT, opts: { maskId?: string; simple?: boolean; attrs?: string } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"${opts.attrs ? ` ${opts.attrs}` : ""}>${markInner(colors, opts.maskId ?? "vh", opts.simple)}</svg>`;
}

/**
 * App icon: black rounded square with the white mark (brand/violi-app-icon.svg).
 * `rounded = 0` gives a full-bleed square for iOS, which applies its own mask.
 */
export function appIconSvg({ rounded = 16, simple = false, size = 64, scale = 1 }: { rounded?: number; simple?: boolean; size?: number; scale?: number } = {}) {
  // Mark box inside the 64×64 tile, as in brand/violi-app-icon.svg. `scale` < 1 shrinks it around the
  // centre, for maskable PWA icons whose safe zone is the inner 80% circle.
  const w = 54 * scale, h = 38 * scale;
  const box = { x: 32 - w / 2, y: 32 - h / 2, w, h };
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">` +
    `<rect width="64" height="64" rx="${rounded}" fill="#0a0a0a"/>` +
    `<svg x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" viewBox="${MARK_VIEWBOX}">${markInner(DARK, "vh-i", simple)}</svg>` +
    `</svg>`
  );
}
