"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Bottom sheet on phones, centred dialog on larger screens. Built on <dialog> for focus trapping
 * and Escape; enter motion uses @starting-style with the iOS drawer curve (see globals.css).
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first control (the close button); hand focus to the field meant to receive it.
      requestAnimationFrame(() => d.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="sheet m-0 mt-auto max-h-none w-full max-w-none bg-transparent p-0 text-text sm:m-auto sm:max-w-md"
    >
      {open && (
        <div className="sheet-panel overscroll-contain max-h-[90dvh] overflow-y-auto rounded-t-[28px] border border-b-0 border-border bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl sm:rounded-[28px] sm:border-b sm:pb-6">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-3 sm:hidden" />
          {title && (
            <div className="mb-5 flex items-start justify-between gap-3">
              <h3 className="font-display min-w-0 text-[22px] font-semibold leading-tight">{title}</h3>
              <button onClick={onClose} className="press grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-text" aria-label="Close">
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
