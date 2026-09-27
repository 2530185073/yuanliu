"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FAMILIES, type Family } from "@/lib/catalog";
import type { OfferingListItem, SourceType } from "@/lib/types";
import { OfferingRow, OfferingRowHeader } from "@/components/offer/OfferingRow";
import { Popover } from "@/components/ui/Popover";

export type SortKey = "score" | "dao" | "ttft" | "avail";

export interface BoardState {
  family: Family | "all";
  q: string;
  sort: SortKey;
  verified: boolean;
  sources: SourceType[];
  scenes: string[];
  invoice: boolean;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "综合" },
  { key: "dao", label: "最便宜" },
  { key: "ttft", label: "最快" },
  { key: "avail", label: "最稳" },
];

const SOURCES: SourceType[] = ["官转", "号池", "官方Key", "云厂商", "Kiro", "混合", "逆向"];
const SCENES = ["Claude Code", "Codex CLI", "可蒸馏", "高缓存", "高并发"];
const POPULAR = ["claude-opus-5", "gpt-5.6-sol", "gemini-3.7-flash", "grok-4.6"];

function toQuery(s: BoardState) {
  const p = new URLSearchParams();
  if (s.family !== "all") p.set("family", s.family);
  if (s.q) p.set("q", s.q);
  if (s.sort !== "score") p.set("sort", s.sort);
  if (s.verified) p.set("verified", "1");
  if (s.sources.length) p.set("source", s.sources.join(","));
  if (s.scenes.length) p.set("scene", s.scenes.join(","));
  if (s.invoice) p.set("invoice", "1");
  const str = p.toString();
  return str ? `?${str}` : "";
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-fg-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-fg" />
      {label}
    </label>
  );
}

export function HomeBoard({ items, summary, initial }: { items: OfferingListItem[]; summary: string; initial: BoardState }) {
  const [s, setS] = useState<BoardState>(initial);
  const [showExcluded, setShowExcluded] = useState(false);
  const set = (patch: Partial<BoardState>) => setS((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${toQuery(s)}`);
  }, [s]);

  const { rows, hidden } = useMemo(() => {
    const q = s.q.trim().toLowerCase();
    const matched = items.filter(
      (it) =>
        (s.family === "all" || it.family === s.family) &&
        (!s.verified || it.verify === "pass") &&
        (!s.invoice || it.invoice) &&
        (!s.sources.length || s.sources.includes(it.sourceType)) &&
        s.scenes.every((sc) => it.scenes.includes(sc)) &&
        (!q || `${it.channelName} ${it.group} ${it.primaryModel}`.toLowerCase().includes(q)),
    );
    const pool = showExcluded ? matched : matched.filter((it) => !it.excludedReason);
    const sorted = [...pool].sort((a, b) => {
      if (Boolean(a.excludedReason) !== Boolean(b.excludedReason)) return a.excludedReason ? 1 : -1;
      if (s.sort === "dao") return a.daoPrice - b.daoPrice;
      if (s.sort === "ttft") return (a.ttft ?? Infinity) - (b.ttft ?? Infinity);
      if (s.sort === "avail") return (b.h24 ?? -1) - (a.h24 ?? -1) || b.score - a.score;
      return b.score - a.score;
    });
    const sponsored = s.sort === "score" && !q ? sorted.filter((it) => it.sponsored) : [];
    return { rows: [...sponsored, ...sorted.filter((it) => !sponsored.includes(it))], hidden: matched.length - pool.length };
  }, [items, s, showExcluded]);

  const filterCount = s.sources.length + s.scenes.length + Number(s.invoice) + Number(s.verified);

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
            value={s.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById("board")?.scrollIntoView({ behavior: "smooth" })}
            placeholder="搜索渠道、分组或模型"
            aria-label="搜索渠道、分组或模型"
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

      <section id="board" className="mx-auto max-w-[1120px] scroll-mt-28 px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="seg scroll-x max-w-full">
            <button type="button" data-on={s.family === "all"} onClick={() => set({ family: "all" })}>
              全部
            </button>
            {FAMILIES.map((f) => (
              <button key={f.id} type="button" data-on={s.family === f.id} onClick={() => set({ family: f.id })}>
                {f.short}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Popover label="筛选" badge={filterCount}>
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-[12px] text-fg-3">来源</p>
                  <div className="grid grid-cols-2">
                    {SOURCES.map((src) => (
                      <Check key={src} label={src} checked={s.sources.includes(src)} onChange={() => set({ sources: toggle(s.sources, src) })} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[12px] text-fg-3">场景</p>
                  <div className="grid grid-cols-2">
                    {SCENES.map((sc) => (
                      <Check key={sc} label={sc} checked={s.scenes.includes(sc)} onChange={() => set({ scenes: toggle(s.scenes, sc) })} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-line pt-3">
                  <Check label="仅看已验真" checked={s.verified} onChange={() => set({ verified: !s.verified })} />
                  <Check label="可开发票" checked={s.invoice} onChange={() => set({ invoice: !s.invoice })} />
                </div>
                {filterCount > 0 && (
                  <button type="button" onClick={() => set({ sources: [], scenes: [], invoice: false, verified: false })} className="text-[13px] text-fg-3 hover:text-fg">
                    清除筛选
                  </button>
                )}
              </div>
            </Popover>
            <div className="seg">
              {SORTS.map((o) => (
                <button key={o.key} type="button" data-on={s.sort === o.key} onClick={() => set({ sort: o.key })}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card pt-3">
          <OfferingRowHeader />
          {rows.length ? (
            <div className="divide-y divide-line overflow-hidden rounded-b-xl">
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
