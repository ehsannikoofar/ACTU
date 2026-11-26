"use client";
import { usePathname } from "next/navigation";

export function LangToggle({ other, label, text }: { other: "en" | "fr"; label: string; text: string }) {
  const path = usePathname();
  return (
    <form action="/api/lang" method="post">
      <input type="hidden" name="lang" value={other} />
      <input type="hidden" name="returnTo" value={path} />
      <button className="btn ghost small" type="submit" lang={other} aria-label={label}>{text}</button>
    </form>
  );
}
