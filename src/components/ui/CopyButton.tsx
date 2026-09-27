"use client";

import { useState } from "react";

export function CopyButton({ text, label = "复制", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "已复制" : label}
    </button>
  );
}
