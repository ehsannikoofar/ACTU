import { NextResponse } from "next/server";
import { isLang } from "@/lib/i18n";

export async function POST(req: Request) {
  const form = await req.formData();
  const lang = form.get("lang");
  const back = String(form.get("returnTo") ?? "/");
  const res = NextResponse.redirect(new URL(back.startsWith("/") && !back.startsWith("//") ? back : "/", req.url), 303);
  if (isLang(lang)) res.cookies.set("lang", lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
