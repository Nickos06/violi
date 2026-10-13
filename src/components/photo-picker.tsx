"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { compressImage } from "@/lib/image-client";
import { useT } from "./i18n-provider";
import { cn } from "./ui";

export type PickedPhoto = { blob: Blob; preview: string } | null;

/**
 * Lets the user attach one photo. `accept="image/*"` gives phones the native
 * "Take photo / Photo library" chooser. The image is downscaled on the device before upload.
 */
export function PhotoPicker({ value, onChange, existing, compact }: { value: PickedPhoto; onChange: (p: PickedPhoto) => void; existing?: string | null; compact?: boolean }) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const shown = value?.preview ?? existing ?? null;

  const pick = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const { blob, dataUrl } = await compressImage(file);
      onChange({ blob, preview: dataUrl });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {shown ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="max-h-72 w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => ref.current?.click()} className="press grid size-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur" aria-label={t.social.photo}>
              <ImagePlus className="size-4" />
            </button>
            {value && (
              <button type="button" onClick={() => onChange(null)} className="press grid size-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur" aria-label={t.common.delete}>
                <X className="size-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className={cn(
            "press flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-[14px] font-bold text-muted hover:border-text hover:text-text",
            compact ? "h-11" : "h-28 flex-col",
          )}
        >
          <ImagePlus className={compact ? "size-4" : "size-6"} strokeWidth={2} />
          {t.social.addPhoto}
        </button>
      )}
    </>
  );
}
