"use client";

import { useEffect, useState, type ReactNode } from "react";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="rise fixed bottom-6 left-1/2 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-md border border-ink bg-ink px-4 py-3 text-sm text-card shadow-[4px_4px_0_var(--color-signal)]">
      <span className="mr-2 font-mono text-[11px] tracking-widest text-signal">原型</span>
      {message}
    </div>
  );
}

export function ProtoButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <Toast message={message} onDone={() => setOpen(false)} />}
    </>
  );
}

export function ProtoModal({
  label,
  title,
  subtitle,
  className,
  children,
}: {
  label: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="rise panel relative w-full max-w-lg rounded-md p-6 shadow-[6px_6px_0_var(--color-ink)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">原型演示</p>
                <h3 className="mt-1 font-display text-xl font-black">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl leading-none text-ink-3 hover:text-ink">
                ×
              </button>
            </div>
            <div className="mt-5 text-sm leading-relaxed text-ink-2">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
