// Theme preference: "system" follows the OS (and updates live), "light"/"dark" are fixed.
// The resolved theme is applied by an inline <head> script before first paint, so there is no flash,
// and React never renders data-theme itself (it would fight the script on refresh).

export const THEMES = ["system", "light", "dark"] as const;
export type ThemePref = (typeof THEMES)[number];
export const THEME_COOKIE = "violi_theme";

export const asThemePref = (v: string | null | undefined): ThemePref => (THEMES.includes(v as ThemePref) ? (v as ThemePref) : "system");

/** Inline script for <head>. Defines window.__violiTheme(pref) and keeps "system" in sync with the OS. */
export function themeScript(pref: ThemePref) {
  return `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),p=${JSON.stringify(pref)};
function a(){var t=p==="system"?(m.matches?"dark":"light"):p;d.setAttribute("data-theme",t);
var e=document.querySelector('meta[name="theme-color"]');if(!e){e=document.createElement("meta");e.name="theme-color";document.head.appendChild(e)}
e.content=t==="dark"?"#000000":"#ffffff"}
window.__violiTheme=function(n){p=n;d.classList.add("theme-switching");a();requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.remove("theme-switching")})})};
a();m.addEventListener("change",function(){if(p==="system")a()})})()`;
}

/** Client: apply a preference immediately and remember it for the next server render. */
export function applyTheme(pref: ThemePref) {
  (window as unknown as { __violiTheme?: (p: ThemePref) => void }).__violiTheme?.(pref);
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
}
