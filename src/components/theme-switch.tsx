"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { updateSettings } from "@/app/actions/profile";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { useT } from "./i18n-provider";
import { cn } from "./ui";

const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/** Three-way theme control (system · light · dark). Applies instantly; persists to the account when signed in. */
export function ThemeSwitch({ value, signedIn, labels = false, className }: { value: ThemePref; signedIn: boolean; labels?: boolean; className?: string }) {
  const { t } = useT();
  const [pref, setPref] = useState(value);
  const name = { system: t.settings.system, light: t.settings.light, dark: t.settings.dark };
  const pick = (p: ThemePref) => {
    setPref(p);
    applyTheme(p);
    if (signedIn) void updateSettings({ theme: p });
  };
  return (
    <div role="radiogroup" aria-label={t.settings.theme} className={cn("flex gap-1 rounded-xl bg-surface-2 p-1", className)}>
      {(["system", "light", "dark"] as const).map((p) => {
        const Icon = ICON[p];
        const on = pref === p;
        return (
          <button
            key={p} type="button" role="radio" aria-checked={on} aria-label={name[p]} title={name[p]} onClick={() => pick(p)}
            className={cn(
              "press flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-colors",
              labels ? "px-3 py-1.5" : "size-8",
              on ? "bg-surface text-text shadow" : "text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" strokeWidth={2.2} />
            {labels && name[p]}
          </button>
        );
      })}
    </div>
  );
}
