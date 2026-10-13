"use client";

import { cn } from "../ui";

/** Labelled on/off row (role="switch"). */
export function SwitchRow({ label, desc, checked, onChange, className }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("flex w-full items-center gap-4 py-3 text-left", className)}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{label}</span>
        {desc && <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-faint">{desc}</span>}
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-text" : "bg-surface-3")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-bg shadow transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]", checked ? "translate-x-6" : "translate-x-1")} />
      </span>
    </button>
  );
}
