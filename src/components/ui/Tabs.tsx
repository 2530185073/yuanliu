"use client";

import { useState, type ReactNode } from "react";

export function Tabs({ tabs, children }: { tabs: { label: string; count?: number }[]; children: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-6 border-b border-line" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 pb-3 text-[14px] transition-colors ${active === i ? "border-fg font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg"}`}
          >
            {t.label}
            {t.count !== undefined && <span className="tnum ml-1.5 text-fg-3">{t.count}</span>}
          </button>
        ))}
      </div>
      {children.map((panel, i) => (
        <div key={tabs[i].label} role="tabpanel" hidden={active !== i} className="pt-6">
          {panel}
        </div>
      ))}
    </div>
  );
}
