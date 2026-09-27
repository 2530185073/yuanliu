"use client";

import { useState, type ReactNode } from "react";

export function Tabs({ tabs, initial = 0, children }: { tabs: { key: string; label: string; count?: number }[]; initial?: number; children: ReactNode[] }) {
  const [active, setActive] = useState(initial);

  function select(i: number) {
    setActive(i);
    const url = new URL(window.location.href);
    if (i === 0) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tabs[i].key);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <div className="scroll-x flex gap-6 border-b border-line" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => select(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") select((i + 1) % tabs.length);
              if (e.key === "ArrowLeft") select((i - 1 + tabs.length) % tabs.length);
            }}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-[14px] transition-colors ${active === i ? "border-fg font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg"}`}
          >
            {t.label}
            {t.count !== undefined && <span className="tnum ml-1.5 text-fg-3">{t.count}</span>}
          </button>
        ))}
      </div>
      {children.map((panel, i) => (
        <div key={tabs[i].key} role="tabpanel" hidden={active !== i} className="pt-6">
          {panel}
        </div>
      ))}
    </div>
  );
}
