"use client";
import { createContext, useContext } from "react";
import { type Dict, type Lang, translate } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; dict: Dict }>({ lang: "en", dict: {} });

export function I18nProvider({ lang, dict, children }: { lang: Lang; dict: Dict; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, dict }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const { lang, dict } = useContext(Ctx);
  return { lang, t: (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars) };
}
