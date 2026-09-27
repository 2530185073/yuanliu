"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAX_COMPARE, useCompare } from "./store";

export function CompareTray({ labels }: { labels: Record<string, { channel: string; group: string }> }) {
  const { ids, remove, clear } = useCompare();
  const pathname = usePathname();
  const known = ids.filter((id) => labels[id]);
  if (!known.length || pathname.startsWith("/compare")) return null;

  return (
    <div className="rise fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-4xl items-center gap-3 rounded-lg border border-ink bg-ink p-2 pl-4 text-card shadow-[0_18px_40px_-12px_rgb(23_21_15/0.55)]">
        <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.18em] text-white/55 sm:block">
          对比 {known.length}/{MAX_COMPARE}
        </span>
        <ul className="scroll-x flex min-w-0 flex-1 gap-2">
          {known.map((id) => (
            <li key={id} className="flex shrink-0 items-center gap-2 rounded-md bg-white/10 py-1 pl-3 pr-1 text-[12.5px]">
              <span className="max-w-44 truncate">
                <b className="font-semibold">{labels[id].channel}</b>
                <span className="text-white/55"> · {labels[id].group}</span>
              </span>
              <button type="button" onClick={() => remove(id)} className="h-6 w-6 rounded text-white/60 hover:bg-white/15 hover:text-white" aria-label="移出对比">
                ×
              </button>
            </li>
          ))}
          {Array.from({ length: MAX_COMPARE - known.length }).map((_, i) => (
            <li key={i} className="hidden shrink-0 items-center rounded-md border border-dashed border-white/20 px-3 text-[12px] text-white/35 md:flex">
              空位
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="shrink-0 px-2 text-[12.5px] text-white/60 hover:text-white">
          清空
        </button>
        <Link
          href={`/compare?ids=${known.join(",")}`}
          aria-disabled={known.length < 2}
          className={`btn shrink-0 ${known.length < 2 ? "pointer-events-none bg-white/15 text-white/45" : "bg-signal text-card hover:bg-card hover:text-ink"}`}
        >
          {known.length < 2 ? "再选 1 份" : "开始对比 →"}
        </Link>
      </div>
    </div>
  );
}
