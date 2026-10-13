"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown } from "lucide-react";
import { shareProgress } from "@/app/actions/social";
import { useT } from "./i18n-provider";
import { Sheet } from "./sheet";
import { VisibilityPicker } from "./meal-section";
import { Button, Textarea } from "./ui";
import { PhotoPicker, type PickedPhoto } from "./photo-picker";
import { uploadImage } from "@/lib/image-client";

export function ShareProgressButton() {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [vis, setVis] = useState("friends");
  const [picked, setPicked] = useState<PickedPhoto>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={t.common.share}><TrendingDown className="size-4" /></Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.common.share}>
        <div className="space-y-3">
          <PhotoPicker value={picked} onChange={setPicked} />
          <Textarea placeholder={t.social.composer} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <VisibilityPicker value={vis} onChange={setVis} />
          <Button className="w-full" disabled={pending} onClick={() => start(async () => {
            const photoUrl = picked ? await uploadImage(picked.blob) : undefined;
            await shareProgress({ text, visibility: vis, photoUrl });
            setOpen(false);
            router.refresh();
          })}>
            {t.social.post}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
