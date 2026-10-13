"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet on mobile, centered dialog on desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-text sm:m-auto sm:max-w-md"
    >
      {open && (
        <div className="animate-rise max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-8 sm:rounded-3xl sm:pb-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
          {title && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="truncate text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-text" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
