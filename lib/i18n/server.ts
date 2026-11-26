import "server-only";
import { cookies } from "next/headers";
import { DICTS, type Lang, isLang, translate } from "./index";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return isLang(v) ? v : "en";
}

export async function getT() {
  const lang = await getLang();
  const dict = DICTS[lang];
  return { lang, dict, t: (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars) };
}
