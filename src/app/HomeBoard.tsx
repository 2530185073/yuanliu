"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FAMILIES, type Family } from "@/lib/catalog";
import type { OfferingListItem } from "@/lib/types";
import { OfferingRow, OfferingRowHeader } from "@/components/offer/OfferingRow";

type SortKey = "score" | "dao" | "ttft" | "avail";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "综合" },
  { key: "dao", label: "最便宜" },
  { key: "ttft", label: "最快" },
  { key: "avail", label: "最稳" },
];

const POPULAR = ["claude-opus-5", "gpt-5.6-sol", "gemini-3.7-flash", "grok-4.6"];

export function HomeBoard({ items, summary }: { items: OfferingListItem[]; summary: string }) {
  const [family, setFamily] = useState<Family | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const { rows, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = items.filter(
      (it) =>
        (family === "all" || it.family === family) &&
        (!onlyVerified || it.verify === "pass") &&
        (!q || `${it.channelName} ${it.group} ${it.primaryModel}`.toLowerCase().includes(q)),
    );
    const pool = showExcluded ? matched : matched.filter((it) => !it.excludedReason);
    const sorted = [...pool].sort((a, b) => {
      if (Boolean(a.excludedReason) !== Boolean(b.excludedReason)) return a.excludedReason ? 1 : -1;
      if (sort === "dao") return a.daoPrice - b.daoPrice;
      if (sort === "ttft") return (a.ttft ?? Infinity) - (b.ttft ?? Infinity);
      if (sort === "avail") return (b.h24 ?? -1) - (a.h24 ?? -1) || b.score - a.score;
      return b.score - a.score;
    });
    const sponsored = sort === "score" && !q ? sorted.filter((it) => it.sponsored) : [];
    return { rows: [...sponsored, ...sorted.filter((it) => !sponsored.includes(it))], hidden: matched.length - pool.length };
  }, [items, family, query, sort, onlyVerified, showExcluded]);

  return (
    <>
      <section className="mx-auto max-w-[720px] px-5 pb-16 pt-20 text-center md:pt-28">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[56px]">
          AI 中转，
          <br className="sm:hidden" />
          先验货再比价
        </h1>
        <p className="mt-4 text-[16px] text-fg-2">{summary}</p>
        <div className="relative mx-auto mt-9 max-w-[560px]">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById("board")?.scrollIntoView({ behavior: "smooth" })}
            placeholder="搜索渠道、分组或模型"
            className="input h-12 rounded-xl pl-11 text-[15px]"
          />
        </div>
        <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-fg-3">
          {POPULAR.map((m) => (
            <Link key={m} href={`/models/${m}`} className="hover:text-fg">
              {m}
            </Link>
          ))}
        </p>
      </section>

      <section id="board" className="mx-auto max-w-[1120px] scroll-mt-20 px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="seg">
            <button type="button" data-on={family === "all"} onClick={() => setFamily("all")}>
              全部
            </button>
            {FAMILIES.map((f) => (
              <button key={f.id} type="button" data-on={family === f.id} onClick={() => setFamily(f.id)}>
                {f.short}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg-2">
              <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="h-3.5 w-3.5 accent-fg" />
              仅看已验真
            </label>
            <div className="seg">
              {SORTS.map((s) => (
                <button key={s.key} type="button" data-on={sort === s.key} onClick={() => setSort(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden pt-3">
          <OfferingRowHeader />
          {rows.length ? (
            <div className="divide-y divide-line">
              {rows.map((item) => (
                <OfferingRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="px-4 py-16 text-center text-fg-3">没有找到匹配的货</p>
          )}
        </div>
        {(hidden > 0 || showExcluded) && (
          <button type="button" onClick={() => setShowExcluded((v) => !v)} className="mt-4 text-[13px] text-fg-3 hover:text-fg">
            {showExcluded ? "隐藏探测密钥异常的货" : `另有 ${hidden} 份探测密钥异常，暂不排序 · 显示`}
          </button>
        )}
      </section>
    </>
  );
}
