"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { logWeight } from "@/app/actions/profile";
import { useT } from "./i18n-provider";
import { Sheet } from "./sheet";
import { Button, Input } from "./ui";

export function WeighInButton({ className, children, last }: { className?: string; children: ReactNode; last?: number | null }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(last ? String(last) : "");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.progress.logWeight}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => { await logWeight(Number(value)); setOpen(false); router.refresh(); });
          }}
        >
          <div className="flex items-center gap-3">
            <Input data-autofocus="" type="number" inputMode="decimal" step="0.1" min={30} max={300} required value={value} onChange={(e) => setValue(e.target.value)} className="h-16 text-center text-3xl font-bold" />
            <span className="text-lg text-muted">kg</span>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending || !value}>{t.common.save}</Button>
        </form>
      </Sheet>
    </>
  );
}
