"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "下游货", match: (p: string) => p === "/" || p.startsWith("/channels") },
  { href: "/models", label: "按模型比价", match: (p: string) => p.startsWith("/models") },
  { href: "/supply", label: "货源广场", match: (p: string) => p.startsWith("/supply") },
  { href: "/check", label: "一键验货", match: (p: string) => p.startsWith("/check") },
];

export function NavLinks({ variant = "bar" }: { variant?: "bar" | "strip" }) {
  const pathname = usePathname();
  const strip = variant === "strip";
  return (
    <nav className={`flex items-center gap-1 whitespace-nowrap ${strip ? "scroll-x h-10 px-3 text-[14px]" : "text-[15px]"}`}>
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-3 py-2 font-semibold transition-colors ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {link.label}
            {active && <span className={`absolute inset-x-3 h-[3px] bg-signal ${strip ? "-bottom-[1px]" : "-bottom-[13px]"}`} />}
          </Link>
        );
      })}
    </nav>
  );
}
