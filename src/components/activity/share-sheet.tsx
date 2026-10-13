"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { shareWorkout } from "@/app/actions/social";
import { useT } from "../i18n-provider";
import { Sheet } from "../sheet";
import { VisibilityPicker } from "../meal-section";
import { PhotoPicker, type PickedPhoto } from "../photo-picker";
import { Button, fmt, IconTile, Textarea } from "../ui";
import { WorkoutIcon } from "../icons";
import { SwitchRow } from "./switch-row";
import { uploadImage } from "@/lib/image-client";
import { formatDuration } from "@/lib/workouts";

export type ShareableActivity = { id: string; type: string; name: string; durationSec: number; kcal: number; hasRoute?: boolean };

/** Share an activity to the feed (photo, caption, audience, optional map). */
export function ActivityShareSheet({ act, onClose, defaultVisibility }: { act: ShareableActivity | null; onClose: () => void; defaultVisibility: string }) {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [vis, setVis] = useState(defaultVisibility);
  const [picked, setPicked] = useState<PickedPhoto>(null);
  const [showMap, setShowMap] = useState(true);
  const [pending, start] = useTransition();
  return (
    <Sheet open={!!act} onClose={onClose} title={t.workouts.shareWorkout}>
      {act && (
        <div className="space-y-3">
          <PhotoPicker value={picked} onChange={setPicked} />
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <IconTile><WorkoutIcon type={act.type} className="size-5" /></IconTile>
            <div>
              <div className="font-semibold">{act.name}</div>
              <div className="text-[13px] text-muted">{formatDuration(act.durationSec)} · {fmt(act.kcal)} kcal</div>
            </div>
          </div>
          <Textarea placeholder={t.social.composer} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <VisibilityPicker value={vis} onChange={setVis} />
          {act.hasRoute && <SwitchRow label={t.record.showMap} desc={t.record.showMapD} checked={showMap} onChange={setShowMap} />}
          <Button className="w-full" disabled={pending} onClick={() => start(async () => {
            const photoUrl = picked ? await uploadImage(picked.blob) : undefined;
            await shareWorkout({ activityId: act.id, text, visibility: vis, photoUrl, showMap });
            onClose();
            router.push("/social");
          })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : t.social.post}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
