"use client";

import { useEffect, useState } from "react";

export function SectionNav({ items }: { items: { id: string; label: string; count?: number }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-180px 0px -55% 0px" },
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-[141px] z-30 -mx-6 mt-8 border-y border-rule bg-paper/95 px-6 backdrop-blur md:top-[100px]">
      <ul className="scroll-x flex h-12 items-center gap-1 whitespace-nowrap text-[13.5px]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`relative flex h-12 items-center gap-1.5 px-3 font-semibold transition-colors ${active === item.id ? "text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              {item.label}
              {item.count !== undefined && <span className="num text-[11px] font-normal text-ink-3">{item.count}</span>}
              {active === item.id && <span className="absolute inset-x-3 bottom-0 h-[3px] bg-signal" />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
