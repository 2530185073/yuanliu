"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "./store";

export function CompareTray() {
  const { entries, remove, clear } = useCompare();
  const pathname = usePathname();
  if (!entries.length || pathname.startsWith("/compare") || pathname.startsWith("/console") || pathname.startsWith("/admin")) return null;

  return (
    <div className="fade-in fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div className="card flex max-w-full items-center gap-2 p-1.5 pl-3 shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_12px_32px_-8px_rgb(0_0_0/0.18)]">
        <ul className="scroll-x flex min-w-0 gap-1.5">
          {entries.map((e) => (
            <li key={e.id} className="flex shrink-0 items-center rounded-md bg-muted py-1 pl-2.5 text-[13px]" title={e.group}>
              <span className="max-w-40 truncate">{e.channel}</span>
              <button type="button" onClick={() => remove(e.id)} className="px-2 text-fg-3 hover:text-fg" aria-label="移出对比">
                ×
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="shrink-0 px-2 text-[13px] text-fg-3 hover:text-fg">
          清空
        </button>
        {entries.length < 2 ? (
          <span className="btn h-8 shrink-0 bg-muted px-3 text-[13px] text-fg-3">再选 1 份</span>
        ) : (
          <Link href={`/compare?ids=${entries.map((e) => e.id).join(",")}`} className="btn btn-primary h-8 shrink-0 px-3 text-[13px]">
            对比 {entries.length} 份
          </Link>
        )}
      </div>
    </div>
  );
}
