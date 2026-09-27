"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "下游货", match: (p: string) => p === "/" || p.startsWith("/channels") || p.startsWith("/compare") },
  { href: "/models", label: "按模型比价", match: (p: string) => p.startsWith("/models") },
  { href: "/supply", label: "货源广场", match: (p: string) => p.startsWith("/supply") },
  { href: "/check", label: "一键验货", match: (p: string) => p.startsWith("/check") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="scroll-x flex items-center gap-1 whitespace-nowrap">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-[14px] transition-colors ${link.match(pathname) ? "font-medium text-fg" : "text-fg-3 hover:text-fg"}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
