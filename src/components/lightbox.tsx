"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Post photo that opens full-screen on tap. */
export function PostImage({ src, alt = "" }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 block w-full px-4" aria-label="Open photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="max-h-[520px] w-full rounded-2xl border border-border object-cover" />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={() => setOpen(false)}
        className="sheet m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 backdrop:bg-black"
      >
        {open && (
          <div className="grid h-full place-items-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl object-contain" />
            <button
              onClick={() => setOpen(false)}
              className="press absolute right-4 top-[max(env(safe-area-inset-top,0px),16px)] grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
