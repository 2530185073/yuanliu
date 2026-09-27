"use client";

import { useEffect, useState, type ReactNode } from "react";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="fade-in fixed bottom-6 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl bg-fg px-4 py-3 text-[13px] text-white shadow-lg">
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

export function ProtoModal({ label, title, className, children }: { label: ReactNode; title: string; className?: string; children: ReactNode }) {
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
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="fade-in card relative w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold">{title}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-[20px] leading-none text-fg-3 hover:text-fg" aria-label="关闭">
                ×
              </button>
            </div>
            <div className="mt-4 text-[14px] text-fg-2">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
