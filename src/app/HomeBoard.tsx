"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FAMILIES, type Family } from "@/lib/catalog";
import type { Supplier, SupplyItem, WantedPost } from "@/lib/supply";
import type { OfferingListItem, SourceType } from "@/lib/types";
import { OfferingCard } from "@/components/offer/OfferingCard";
import { OfferingTable } from "@/components/offer/OfferingTable";
import { SupplyCard, WantedCard } from "@/components/supply/SupplyCard";

type SortKey = "score" | "dao" | "ttft" | "avail";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "综合分" },
  { key: "dao", label: "刀价最低" },
  { key: "ttft", label: "首字最快" },
  { key: "avail", label: "可用率最高" },
];

const SOURCES: SourceType[] = ["官转", "号池", "官方Key", "云厂商", "Kiro", "混合", "逆向"];
const SCENES = ["Claude Code", "Codex CLI", "可蒸馏", "高缓存", "高并发", "多模态"];

interface Props {
  items: OfferingListItem[];
  supplies: { item: SupplyItem; supplier: Supplier; downstream: number }[];
  wanted: { post: WantedPost; authorName: string }[];
}

function toggle<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function HomeBoard({ items, supplies, wanted }: Props) {
  const [side, setSide] = useState<"down" | "up">("down");
  const [family, setFamily] = useState<Family | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [sources, setSources] = useState<Set<SourceType>>(new Set());
  const [scenes, setScenes] = useState<Set<string>>(new Set());
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyMystery, setOnlyMystery] = useState(false);
  const [invoice, setInvoice] = useState(false);
  const [minAvail, setMinAvail] = useState<0 | 95 | 99>(0);
  const [showExcluded, setShowExcluded] = useState(false);
  const [view, setView] = useState<"card" | "table">("card");
  const [moreOpen, setMoreOpen] = useState(false);

  const activeFilters = sources.size + scenes.size + Number(onlyVerified) + Number(onlyMystery) + Number(invoice) + Number(minAvail > 0);

  const { visible, hiddenExcluded } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = items.filter((it) => {
      if (family !== "all" && it.family !== family) return false;
      if (q && !`${it.channelName} ${it.group} ${it.primaryModel} ${it.domain}`.toLowerCase().includes(q)) return false;
      if (sources.size && !sources.has(it.sourceType)) return false;
      if (scenes.size && ![...scenes].every((s) => it.scenes.includes(s))) return false;
      if (onlyVerified && it.verify !== "pass") return false;
      if (onlyMystery && !it.mystery) return false;
      if (invoice && !it.invoice) return false;
      if (minAvail && (it.h24 ?? 0) < minAvail) return false;
      return true;
    });
    const excluded = matched.filter((it) => it.excludedReason);
    const pool = showExcluded ? matched : matched.filter((it) => !it.excludedReason);
    const sorted = [...pool].sort((a, b) => {
      if (Boolean(a.excludedReason) !== Boolean(b.excludedReason)) return a.excludedReason ? 1 : -1;
      if (sort === "dao") return a.daoPrice - b.daoPrice;
      if (sort === "ttft") return (a.ttft ?? Infinity) - (b.ttft ?? Infinity);
      if (sort === "avail") return (b.h24 ?? -1) - (a.h24 ?? -1) || b.score - a.score;
      return b.score - a.score;
    });
    return { visible: sorted, hiddenExcluded: showExcluded ? 0 : excluded.length };
  }, [items, family, query, sources, scenes, onlyVerified, onlyMystery, invoice, minAvail, showExcluded, sort]);

  const familyCount = (f: Family | "all") => items.filter((it) => !it.excludedReason && (f === "all" || it.family === f)).length;

  const resetFilters = () => {
    setSources(new Set());
    setScenes(new Set());
    setOnlyVerified(false);
    setOnlyMystery(false);
    setInvoice(false);
    setMinAvail(0);
  };

  return (
    <section id="board" className="mx-auto max-w-[1440px] px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
        <div className="flex items-end gap-6">
          <SideTab active={side === "down"} onClick={() => setSide("down")} label="下游货" hint="中转站在卖的分组" count={items.length} accent="var(--color-signal)" />
          <SideTab active={side === "up"} onClick={() => setSide("up")} label="上游货源" hint="给中转站的批发货" count={supplies.length} accent="var(--color-source)" />
        </div>
        {side === "down" && (
          <div className="flex items-center gap-1 rounded-md border border-rule bg-card p-1 text-[13px]">
            {(["card", "table"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded px-3 py-1.5 font-semibold ${view === v ? "bg-ink text-card" : "text-ink-3 hover:text-ink"}`}>
                {v === "card" ? "卡片" : "表格"}
              </button>
            ))}
          </div>
        )}
      </div>

      {side === "down" ? (
        <>
          <div className="sticky top-[141px] z-30 -mx-6 border-b border-rule bg-paper/95 px-6 py-3 backdrop-blur md:top-[100px]">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="chip" data-on={family === "all"} onClick={() => setFamily("all")}>
                全部 <span className="num text-[11px] opacity-60">{familyCount("all")}</span>
              </button>
              {FAMILIES.map((f) => (
                <button key={f.id} type="button" className="chip" data-on={family === f.id} onClick={() => setFamily(f.id)}>
                  {f.short} <span className="num text-[11px] opacity-60">{familyCount(f.id)}</span>
                </button>
              ))}
              <span className="mx-1 hidden h-5 w-px bg-rule md:block" />
              <button type="button" className="chip" data-on={moreOpen || activeFilters > 0} onClick={() => setMoreOpen((v) => !v)}>
                更多筛选 {activeFilters > 0 && <span className="num rounded-full bg-signal px-1.5 text-[10px] text-card">{activeFilters}</span>}
                <span className="text-[10px]">{moreOpen ? "▲" : "▼"}</span>
              </button>
              <div className="ml-auto flex w-full items-center gap-2 md:w-auto">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜渠道、分组、模型…"
                  className="h-[34px] w-full rounded-md border border-rule bg-card px-3 text-[13px] outline-none placeholder:text-ink-3 focus:border-ink md:w-64"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-[34px] rounded-md border border-rule bg-card px-2 text-[13px] outline-none focus:border-ink"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      按{s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {moreOpen && (
              <div className="mt-3 grid gap-3 border-t border-dashed border-rule pt-3 text-[13px] lg:grid-cols-[auto_1fr]">
                <FilterRow label="来源">
                  {SOURCES.map((s) => (
                    <button key={s} type="button" className="chip" data-on={sources.has(s)} onClick={() => setSources(toggle(sources, s))}>
                      {s}
                    </button>
                  ))}
                </FilterRow>
                <FilterRow label="场景">
                  {SCENES.map((s) => (
                    <button key={s} type="button" className="chip" data-on={scenes.has(s)} onClick={() => setScenes(toggle(scenes, s))}>
                      {s}
                    </button>
                  ))}
                </FilterRow>
                <FilterRow label="条件">
                  <button type="button" className="chip" data-on={onlyVerified} onClick={() => setOnlyVerified((v) => !v)}>
                    仅验真通过
                  </button>
                  <button type="button" className="chip" data-on={onlyMystery} onClick={() => setOnlyMystery((v) => !v)}>
                    仅平台实测
                  </button>
                  <button type="button" className="chip" data-on={invoice} onClick={() => setInvoice((v) => !v)}>
                    支持发票
                  </button>
                  {([95, 99] as const).map((v) => (
                    <button key={v} type="button" className="chip" data-on={minAvail === v} onClick={() => setMinAvail(minAvail === v ? 0 : v)}>
                      24h 可用率 ≥ {v}%
                    </button>
                  ))}
                  {activeFilters > 0 && (
                    <button type="button" className="ml-1 text-[12.5px] font-semibold text-signal underline-offset-4 hover:underline" onClick={resetFilters}>
                      清空
                    </button>
                  )}
                </FilterRow>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-3">
            <p>
              共 <span className="num font-semibold text-ink">{visible.length}</span> 份货 · 按{SORTS.find((s) => s.key === sort)?.label}排序
              <span className="ml-2 hidden text-ink-3 md:inline">赞助位不参与排序，只在顶部单独标注</span>
            </p>
            {hiddenExcluded > 0 ? (
              <button type="button" onClick={() => setShowExcluded(true)} className="rounded-sm bg-mute-soft px-2.5 py-1 text-mute hover:text-ink">
                ◌ 另有 <span className="num font-semibold">{hiddenExcluded}</span> 份货的探测密钥异常，暂不参与排序 · 显示
              </button>
            ) : (
              showExcluded && (
                <button type="button" onClick={() => setShowExcluded(false)} className="rounded-sm bg-mute-soft px-2.5 py-1 text-mute hover:text-ink">
                  隐藏密钥异常的货
                </button>
              )
            )}
          </div>

          {visible.length === 0 ? (
            <div className="panel mt-4 rounded-md p-10 text-center text-ink-3">没有符合条件的货，试试放宽筛选条件。</div>
          ) : view === "card" ? (
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((item, i) => (
                <OfferingCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <OfferingTable items={visible} />
            </div>
          )}
        </>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-source/30 bg-source-soft/60 px-4 py-3 text-[13px] text-source">
            <p>上游货源也走同一套探测与验真。平台只做撮合，不经手资金；成交后由买家确认并评价。</p>
            <Link href="/supply" className="font-semibold underline-offset-4 hover:underline">
              进入货源广场 →
            </Link>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {supplies.slice(0, 6).map((s, i) => (
              <SupplyCard key={s.item.id} item={s.item} supplier={s.supplier} downstream={s.downstream} index={i} />
            ))}
          </div>
          <h3 className="mt-12 font-display text-xl font-black">最新求购</h3>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {wanted.slice(0, 3).map((w, i) => (
              <WantedCard key={w.post.id} post={w.post} authorName={w.authorName} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SideTab({ active, onClick, label, hint, count, accent }: { active: boolean; onClick: () => void; label: string; hint: string; count: number; accent: string }) {
  return (
    <button type="button" onClick={onClick} className={`group relative pb-1 text-left transition-opacity ${active ? "" : "opacity-45 hover:opacity-80"}`}>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-[26px] font-black leading-none">{label}</span>
        <span className="num text-[15px] font-semibold" style={{ color: accent }}>
          {count}
        </span>
      </span>
      <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>
      {active && <span className="absolute -bottom-[14px] left-0 right-0 h-[4px]" style={{ background: accent }} />}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="pt-1.5 text-[12px] font-semibold text-ink-3">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </>
  );
}
