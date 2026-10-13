"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setGuestLocale } from "@/app/actions/auth";

export function LocaleSwitch({ locale }: { locale: "el" | "en" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "el" ? "en" : "el";
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await setGuestLocale(next); router.refresh(); })}
      className="h-8 rounded-lg px-2.5 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-text"
    >
      {next === "en" ? "EN" : "ΕΛ"}
    </button>
  );
}
