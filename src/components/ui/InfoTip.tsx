import type { ReactNode } from "react";

/** 悬停或键盘聚焦时显示的简短说明，不依赖 JS */
export function InfoTip({ children, label = "说明", align = "center" }: { children: ReactNode; label?: string; align?: "center" | "end" }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none text-fg-3 shadow-[0_0_0_1px_var(--color-line-strong)] hover:text-fg focus-visible:text-fg"
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-30 mt-2 w-60 rounded-lg bg-fg px-3 py-2 text-left text-[12px] font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${
          align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
