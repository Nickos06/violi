"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useT } from "./i18n-provider";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/** Square delete button that asks before running a destructive action. */
export function ConfirmDelete({ title, onConfirm }: { title: string; onConfirm: () => Promise<void> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button type="button" variant="danger" size="lg" className="w-14 shrink-0 px-0" aria-label={title} onClick={() => setOpen(true)}>
        <Trash2 className="size-5" />
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-[15px] text-muted">{t.gym.discardConfirm.split("?")[0]}?</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => { await onConfirm(); setOpen(false); })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : t.common.delete}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
