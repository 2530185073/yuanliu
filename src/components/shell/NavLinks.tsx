"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "下游货", match: (p: string) => p === "/" || p.startsWith("/channels") || p.startsWith("/compare") },
  { href: "/models", label: "按模型比价", short: "比价", match: (p: string) => p.startsWith("/models") },
  { href: "/supply", label: "货源广场", short: "货源", match: (p: string) => p.startsWith("/supply") },
  { href: "/check", label: "一键验货", short: "验货", match: (p: string) => p.startsWith("/check") },
];

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={compact ? "grid grid-cols-4" : "flex items-center gap-1"}>
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md text-[14px] transition-colors ${compact ? "py-2.5 text-center" : "px-3 py-1.5"} ${
              active ? "font-medium text-fg" : "text-fg-3 hover:text-fg"
            }`}
          >
            {compact ? (link.short ?? link.label) : link.label}
          </Link>
        );
      })}
    </nav>
  );
}
