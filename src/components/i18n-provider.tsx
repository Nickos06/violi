"use client";

import { createContext, useContext, type ReactNode } from "react";
import { dictionaries, type Locale, type Messages } from "@/lib/i18n";

const Ctx = createContext<{ t: Messages; locale: Locale }>({ t: dictionaries.el, locale: "el" });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={{ t: dictionaries[locale], locale }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
