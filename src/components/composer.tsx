"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createTextPost } from "@/app/actions/social";
import { useT } from "./i18n-provider";
import { VisibilityPicker } from "./meal-section";
import { Avatar, Button } from "./ui";

export function Composer({ name, color, url, defaultVisibility }: { name: string; color: string; url: string | null; defaultVisibility: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("text", text);
      fd.set("visibility", vis);
      if (file) fd.set("photo", file);
      await createTextPost(fd);
      setText(""); setFile(null); setPreview(null); setOpen(false);
      router.refresh();
    });

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} color={color} url={url} size={40} />
        <textarea
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.social.composer}
          rows={open ? 3 : 1}
          maxLength={1000}
          className="min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      {preview && (
        <div className="relative mt-3 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-64 w-full object-cover" />
          <button onClick={() => { setFile(null); setPreview(null); }} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove"><X className="size-4" /></button>
        </div>
      )}
      {open && (
        <div className="mt-3 space-y-3">
          <VisibilityPicker value={vis} onChange={setVis} />
          <div className="flex items-center justify-between">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-muted hover:bg-surface-2">
              <ImagePlus className="size-4" /> {t.social.photo}
            </button>
            <input
              ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }}
            />
            <Button size="sm" disabled={pending || (!text.trim() && !file)} onClick={submit}>{t.social.post}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
