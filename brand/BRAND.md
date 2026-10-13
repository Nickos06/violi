# Violi brand — logo "H" (Παλμός)

## Concept

The name comes from the Greek phrase **«παίζουμε το βιολί μας»**: we do our own thing, steadily, whatever anyone says. For Violi that means: we eat right, we go to the gym, we run, and nothing else bothers us.

The chosen logo is **H — "Παλμός" (heartbeat)**: a heartbeat line runs across a music stave and turns into the string of a violin, with a slightly tilted bow on it. Your heart is what plays the violin. The tall spike of the pulse also forms a **V**.

Parts of the mark:
- **Heartbeat line** (ink): left side, the big spike makes the V.
- **Stave** (accent): four thin lines running the full width, behind the violin.
- **Violin** (ink): lying horizontally, scroll and neck pointing left, body on the right. The heartbeat flows into the scroll.
- **String + bridge** (accent): a thin line from the scroll across the body, and the small bridge.
- **Bow** (ink stick + accent hair): slightly tilted, crossing the string between neck and bridge. A thin knockout gap around the bow keeps it readable over the violin body.

## Files in this folder

| File | Use |
|---|---|
| `violi-mark.svg` | Mark for light backgrounds (ink `#0a0a0a`, accent `#9a9a9a`), transparent, tightly cropped (`viewBox="1 17 97.5 68"`, about 1.43 : 1) |
| `violi-mark-dark.svg` | Mark for dark backgrounds (ink `#fafafa`, accent `#7c7c7c`) |
| `violi-app-icon.svg` | 64×64 app icon: black rounded square, white mark |

All three use the same geometry. Treat these SVGs as the source of truth for the shape.

## Colors

The app is monochrome today (black / white / chrome), and the logo is designed for that:

| Token | Light | Dark |
|---|---|---|
| Ink (pulse, violin, bow stick) | `#0a0a0a` | `#fafafa` |
| Accent (stave, string, bridge, bow hair) | `#9a9a9a` | `#7c7c7c` |
| Icon background | `#0a0a0a` | `#0a0a0a` |

`globals.css` already has `--logo-a` / `--logo-b`; map ink and accent onto logo tokens there rather than adding hard-coded colors.

Two optional palettes were explored (not chosen yet, monochrome is the default):
- Βερνίκι (violin varnish): ink `#2b1609` / accent `#c4621d` on `#f4e8d8`; dark: ink `#f6e4cc` / accent `#e48a3c` on `#1f120a`
- Ενέργεια: ink `#0c1a4a` / accent `#ff4f2e` on `#e9eefc`; dark: ink `#f1f4ff` / accent `#ff6b4a` on `#0b1230`

## Wordmark

Lockup: mark on the left, then **violi** in lowercase. In the concept it was set in **DM Mono 500** (letter-spacing about -0.03em), mark height about 1.25× the font size, gap about 0.32em. If a second font family is unwanted in the app, Manrope 800 lowercase is the fallback.

## Where it goes in the app

The current logo is a literal violin. It lives in:
- `src/lib/violin-svg.ts` (`violinIconSvg`), used by `src/app/apple-icon.tsx`
- `src/app/icon.svg` (favicon / PWA icon, referenced by `src/app/manifest.ts`)
- `src/components/logo.tsx`, used in `nav.tsx`, `auth-form.tsx`, `onboarding/onboarding.tsx`, `page.tsx`, `not-found.tsx`
- `src/app/globals.css` (`--logo-a`, `--logo-b`, chrome tokens)

To roll out:
1. Make `logo.tsx` render the new mark inline, with ink as `currentColor` (or `var(--logo-a)`) and accent as a CSS variable, so it follows light/dark. SVG `mask` ids must be unique per instance (use `useId`).
2. Replace `src/app/icon.svg` with `violi-app-icon.svg`.
3. Update `violinIconSvg` so the Apple icon (180×180, full-bleed, no rounding) uses the new mark.
4. Add the wordmark lockup wherever the app shows the logo with the name.
5. At 16–32 px the stave and bow hair get thin. If the favicon looks muddy, drop the stave lines and bow hair in a simplified small variant, and keep pulse + violin + bow stick.
