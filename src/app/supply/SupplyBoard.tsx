"use client";

import { useMemo, useState } from "react";
import { FAMILIES, type Family } from "@/lib/catalog";
import type { Supplier, SupplyItem, WantedPost } from "@/lib/supply";
import type { SourceType } from "@/lib/types";
import { SupplyCard, WantedCard } from "@/components/supply/SupplyCard";

type Sort = "price" | "reputation" | "uptime";

interface Props {
  supplies: { item: SupplyItem; supplier: Supplier; downstream: number }[];
  wanted: { post: WantedPost; authorName: string }[];
}

export function SupplyBoard({ supplies, wanted }: Props) {
  const [tab, setTab] = useState<"offer" | "wanted">("offer");
  const [family, setFamily] = useState<Family | "all">("all");
  const [source, setSource] = useState<SourceType | "all">("all");
  const [onlyVerifiedSupplier, setOnlyVerifiedSupplier] = useState(false);
  const [sort, setSort] = useState<Sort>("reputation");
  const [status, setStatus] = useState<WantedPost["status"] | "all">("all");

  const sources = [...new Set(supplies.map((s) => s.item.sourceType))];

  const visibleSupplies = useMemo(() => {
    const list = supplies.filter(
      (s) => (family === "all" || s.item.family === family) && (source === "all" || s.item.sourceType === source) && (!onlyVerifiedSupplier || s.supplier.verified),
    );
    return [...list].sort((a, b) => {
      if (sort === "price") return a.item.cnyPerUsd - b.item.cnyPerUsd;
      if (sort === "uptime") return b.item.probe.d7 - a.item.probe.d7;
      return b.supplier.reputation - a.supplier.reputation;
    });
  }, [supplies, family, source, onlyVerifiedSupplier, sort]);

  const visibleWanted = wanted.filter((w) => (family === "all" || w.post.family === family) && (status === "all" || w.post.status === status));

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
        <div className="flex items-end gap-6">
          {(
            [
              ["offer", "供应", supplies.length],
              ["wanted", "求购", wanted.length],
            ] as const
          ).map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`relative pb-1 ${tab === key ? "" : "opacity-45 hover:opacity-80"}`}>
              <span className="font-display text-[26px] font-black">{label}</span>
              <span className="num ml-2 text-[15px] font-semibold text-source">{count}</span>
              {tab === key && <span className="absolute -bottom-[14px] left-0 right-0 h-[4px] bg-source" />}
            </button>
          ))}
        </div>
        {tab === "offer" && (
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-[34px] rounded-md border border-rule bg-card px-2 text-[13px] outline-none focus:border-ink">
            <option value="reputation">按供应商信誉</option>
            <option value="price">按刀价最低</option>
            <option value="uptime">按 7 日可用率</option>
          </select>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="chip" data-on={family === "all"} onClick={() => setFamily("all")}>
          全部模型
        </button>
        {FAMILIES.map((f) => (
          <button key={f.id} type="button" className="chip" data-on={family === f.id} onClick={() => setFamily(f.id)}>
            {f.short}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-rule" />
        {tab === "offer" ? (
          <>
            <button type="button" className="chip" data-on={source === "all"} onClick={() => setSource("all")}>
              全部来源
            </button>
            {sources.map((s) => (
              <button key={s} type="button" className="chip" data-on={source === s} onClick={() => setSource(source === s ? "all" : s)}>
                {s}
              </button>
            ))}
            <button type="button" className="chip" data-on={onlyVerifiedSupplier} onClick={() => setOnlyVerifiedSupplier((v) => !v)}>
              仅认证供应商
            </button>
          </>
        ) : (
          (["all", "开放报价", "洽谈中", "已成交"] as const).map((s) => (
            <button key={s} type="button" className="chip" data-on={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "全部状态" : s}
            </button>
          ))
        )}
      </div>

      {tab === "offer" ? (
        visibleSupplies.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleSupplies.map((s, i) => (
              <SupplyCard key={s.item.id} item={s.item} supplier={s.supplier} downstream={s.downstream} index={i} />
            ))}
          </div>
        ) : (
          <div className="panel mt-6 rounded-md p-10 text-center text-ink-3">没有符合条件的货源。</div>
        )
      ) : visibleWanted.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleWanted.map((w, i) => (
            <WantedCard key={w.post.id} post={w.post} authorName={w.authorName} index={i} />
          ))}
        </div>
      ) : (
        <div className="panel mt-6 rounded-md p-10 text-center text-ink-3">没有符合条件的求购。</div>
      )}
    </section>
  );
}
