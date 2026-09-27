"use client";

import { useCompare } from "./store";

export function CompareToggle({ id, className = "" }: { id: string; className?: string }) {
  const { has, toggle, full } = useCompare();
  const on = has(id);
  const disabled = !on && full;
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      disabled={disabled}
      aria-pressed={on}
      title={disabled ? "最多同时对比 4 份货" : on ? "移出对比" : "加入对比"}
      className={`relative z-10 inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "border-ink bg-ink text-card" : "border-rule bg-card text-ink-2 hover:border-ink hover:text-ink"
      } ${className}`}
    >
      <span className="num text-[13px] leading-none">{on ? "✓" : "+"}</span>
      {on ? "已加入对比" : "对比"}
    </button>
  );
}
