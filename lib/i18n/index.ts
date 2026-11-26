// Tiny i18n: flat JSON dictionaries (EN/FR), "{var}" interpolation. Safe for client and server.
import en from "./en.json";
import fr from "./fr.json";

export type Lang = "en" | "fr";
export type Dict = Record<string, string>;
export const DICTS: Record<Lang, Dict> = { en, fr };
export const LANGS: Lang[] = ["en", "fr"];

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "fr";
}

export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  let s = dict[key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
}
