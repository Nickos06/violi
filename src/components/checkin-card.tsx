"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { doCheckIn } from "@/app/actions/profile";
import { useT } from "./i18n-provider";
import { Button, Card, fmt } from "./ui";

type Last = { expenditure: number; prev: number; target: number; daysLogged: number; weeklyChangeKg: number | null };

export function CheckInCard({ due, daysUntil, expenditure, last }: { due: boolean; daysUntil: number; expenditure: number; last: Last | null }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Last | null>(null);
  const shown = result ?? last;
  const delta = shown ? shown.expenditure - shown.prev : 0;

  return (
    <Card className="p-5">
      {due && !result ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles className="size-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.today.checkInDue}</p>
              <p className="text-[13px] text-muted">{t.progress.checkInD}</p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => start(async () => {
              const c = await doCheckIn();
              setResult({ expenditure: c.expenditure, prev: c.prevExpenditure, target: c.targetKcal, daysLogged: c.daysLogged, weeklyChangeKg: c.weeklyChangeKg });
              router.refresh();
            })}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : t.progress.checkInNow}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted">{result ? t.progress.result : `${t.progress.nextCheckIn}: ${daysUntil}d`}</span>
            <span className="tabular text-[13px] font-semibold">{fmt(expenditure)} kcal</span>
          </div>
          {shown && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-surface-2 py-3">
                <div className="tabular text-lg font-bold">{fmt(shown.target)}</div>
                <div className="text-[11px] text-muted">{t.progress.newTarget}</div>
              </div>
              <div className="rounded-2xl bg-surface-2 py-3">
                <div className="tabular text-lg font-bold" style={{ color: delta === 0 ? undefined : delta > 0 ? "var(--good)" : "var(--warn)" }}>{delta > 0 ? "+" : ""}{fmt(delta)}</div>
                <div className="text-[11px] text-muted">{t.progress.change}</div>
              </div>
              <div className="rounded-2xl bg-surface-2 py-3">
                <div className="tabular text-lg font-bold">{shown.weeklyChangeKg != null ? `${shown.weeklyChangeKg > 0 ? "+" : ""}${fmt(shown.weeklyChangeKg, 2)}` : "—"}</div>
                <div className="text-[11px] text-muted">kg {t.progress.weekly}</div>
              </div>
            </div>
          )}
          {shown && shown.daysLogged < 5 && <p className="mt-3 text-[12px] text-faint">{t.progress.notEnough}</p>}
        </div>
      )}
    </Card>
  );
}
