"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Card, Field, fmt, Input, SectionTitle } from "@/components/ui";
import { e1rm, fmtKg, platesPerSide } from "@/lib/gym";

const PCT = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];
const REPS_AT = [1, 2, 4, 6, 8, 10, 12, 16, 20, 24];

export function Tools() {
  const { t } = useT();
  const [target, setTarget] = useState("100");
  const [bar, setBar] = useState("20");
  const [w, setW] = useState("80");
  const [r, setR] = useState("8");
  const plates = platesPerSide(Number(target) || 0, Number(bar) || 20);
  const max = e1rm(Number(w) || 0, Number(r) || 0);

  return (
    <div>
      <SectionTitle className="mt-0">{t.gym.plateCalc}</SectionTitle>
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.gym.targetWeight}><Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label={t.gym.bar}><Input inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} /></Field>
        </div>
        <div>
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t.gym.perSide}</div>
          <div className="flex min-h-24 items-center gap-1 overflow-x-auto rounded-2xl bg-surface-2 px-4 py-3">
            <div className="h-3 w-10 shrink-0 rounded-l-full bg-surface-3" />
            {plates.plates.map((p, i) => (
              <div
                key={i}
                className="varnish grid shrink-0 place-items-center rounded-md text-[10px] font-black"
                style={{ height: 34 + p * 2.2, width: p >= 10 ? 22 : 16 }}
              >
                <span className="-rotate-90 whitespace-nowrap">{fmtKg(p)}</span>
              </div>
            ))}
            <div className="h-3 flex-1 rounded-r-full bg-surface-3" />
          </div>
          <p className="mt-2 text-[13px] font-semibold text-muted">
            {plates.plates.length ? plates.plates.map(fmtKg).join(" + ") : "—"}
            {plates.remainder > 0 && ` · ±${fmtKg(plates.remainder)} kg`}
          </p>
        </div>
      </Card>

      <SectionTitle>{t.gym.oneRmCalc}</SectionTitle>
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.gym.weight}><Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></Field>
          <Field label={t.gym.reps}><Input inputMode="numeric" value={r} onChange={(e) => setR(e.target.value.replace(/\D/g, ""))} /></Field>
        </div>
        <div className="text-center">
          <div className="text-chrome tabular text-[44px] font-extrabold leading-none tracking-[-0.04em]">{fmt(max, 1)}<span className="ml-1 text-[16px] text-muted">kg</span></div>
          <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-faint">1RM · Epley</div>
        </div>
        <div className="divide-y divide-border rounded-2xl bg-surface-2">
          {PCT.map((p, i) => (
            <div key={p} className="tabular flex items-center justify-between px-4 py-2 text-[14px]">
              <span className="font-semibold text-muted">{p}%</span>
              <span className="font-extrabold">{fmt((max * p) / 100, 1)} kg</span>
              <span className="w-16 text-right text-[12px] font-semibold text-faint">~{REPS_AT[i]} {t.gym.reps.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
