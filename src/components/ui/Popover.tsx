"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Popover({ label, children, badge }: { label: string; children: ReactNode; badge?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="btn btn-secondary h-[34px] px-3 text-[13px]">
        {label}
        {badge ? <span className="tnum rounded-full bg-fg px-1.5 text-[11px] leading-[18px] text-white">{badge}</span> : null}
      </button>
      {open && <div className="fade-in card absolute right-0 top-full z-30 mt-2 w-72 p-4 shadow-lg">{children}</div>}
    </div>
  );
}
