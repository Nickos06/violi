"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createTextPost } from "@/app/actions/social";
import { compressImage, uploadImage } from "@/lib/image-client";
import { useT } from "./i18n-provider";
import { VisibilityPicker } from "./meal-section";
import { Avatar, Button } from "./ui";

export function Composer({ name, url, defaultVisibility }: { name: string; color?: string; url: string | null; defaultVisibility: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setOpen(true);
    setPhoto(await compressImage(file).then(({ blob, dataUrl }) => ({ blob, preview: dataUrl })));
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () =>
    start(async () => {
      setError(false);
      try {
        const photoUrl = photo ? await uploadImage(photo.blob) : null;
        await createTextPost({ text, visibility: vis, photoUrl });
        setText(""); setPhoto(null); setOpen(false);
        router.refresh();
      } catch {
        setError(true);
      }
    });

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} url={url} size={40} />
        <textarea
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.social.composer}
          rows={open ? 3 : 1}
          maxLength={1000}
          className="min-h-10 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-faint"
        />
        {!open && (
          <button onClick={() => fileRef.current?.click()} className="press grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text hover:bg-surface-3" aria-label={t.social.addPhoto}>
            <ImagePlus className="size-[18px]" />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {photo && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.preview} alt="" className="max-h-80 w-full object-cover" />
          <button onClick={() => setPhoto(null)} className="press absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur" aria-label={t.common.delete}>
            <X className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <VisibilityPicker value={vis} onChange={setVis} />
          {error && <p className="text-[13px] font-semibold text-bad">{t.common.error}</p>}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => fileRef.current?.click()} className="press flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[13px] font-bold text-text hover:bg-surface-3">
              <ImagePlus className="size-4" /> {photo ? t.social.photo : t.social.addPhoto}
            </button>
            <Button size="sm" className="h-10 px-5" disabled={pending || (!text.trim() && !photo)} onClick={submit}>
              {pending ? <><Loader2 className="size-4 animate-spin" /> {photo ? t.social.uploading : ""}</> : t.social.post}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
