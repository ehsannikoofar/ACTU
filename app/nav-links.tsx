"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="main-nav" aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
