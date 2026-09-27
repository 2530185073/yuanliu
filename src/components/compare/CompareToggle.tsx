"use client";

import { useCompare } from "./store";

export function CompareToggle({ id, label = false }: { id: string; label?: boolean }) {
  const { has, toggle, full } = useCompare();
  const on = has(id);
  const disabled = !on && full;
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      disabled={disabled}
      aria-pressed={on}
      aria-label={on ? "移出对比" : "加入对比"}
      title={disabled ? "最多对比 4 份" : on ? "移出对比" : "加入对比"}
      className={`relative z-10 inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        label ? "px-2.5" : "w-7"
      } ${on ? "bg-fg text-white" : "text-fg-3 shadow-[0_0_0_1px_var(--color-line-strong)] hover:text-fg"}`}
    >
      <span className="text-[14px] leading-none">{on ? "✓" : "+"}</span>
      {label && <span>{on ? "已加入" : "对比"}</span>}
    </button>
  );
}
