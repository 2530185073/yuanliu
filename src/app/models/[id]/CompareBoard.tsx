"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ms, pct, yuan } from "@/lib/format";
import type { ModelCompareRow } from "@/lib/views";
import { PriceScatter } from "@/components/charts/PriceScatter";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { MysteryStamp, VerifyStamp } from "@/components/ui/Stamp";
import { availabilityTone, latencyTone, RiskTag, SourceTag } from "@/components/ui/Tags";

type Key = "output" | "input" | "cache" | "ttft" | "tps" | "h24" | "score";

const COLUMNS: { key: Key; label: string; asc: boolean }[] = [
  { key: "input", label: "输入 ¥/M", asc: true },
  { key: "output", label: "输出 ¥/M", asc: true },
  { key: "cache", label: "缓存读 ¥/M", asc: true },
  { key: "ttft", label: "首字", asc: true },
  { key: "tps", label: "吐字", asc: false },
  { key: "h24", label: "24h", asc: false },
  { key: "score", label: "综合分", asc: false },
];

export function CompareBoard({ rows, officialCny }: { rows: ModelCompareRow[]; officialCny: number }) {
  const [sort, setSort] = useState<{ key: Key; asc: boolean }>({ key: "output", asc: true });
  const [showExcluded, setShowExcluded] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const excludedCount = rows.filter((r) => r.excluded).length;
  const visible = useMemo(() => {
    const pool = rows.filter((r) => (showExcluded || !r.excluded) && (!onlyVerified || r.verify === "pass"));
    const val = (r: ModelCompareRow) => {
      const v = r[sort.key];
      return v === null ? (sort.asc ? Infinity : -Infinity) : v;
    };
    return [...pool].sort((a, b) => (sort.asc ? val(a) - val(b) : val(b) - val(a)));
  }, [rows, sort, showExcluded, onlyVerified]);

  return (
    <>
      <section className="panel mt-8 rounded-md p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] font-black">价格 × 稳定性</h2>
            <p className="mt-1 text-[12.5px] text-ink-3">点越大综合分越高；颜色是验真结果，虚线空心点为探测密钥异常（可用率暂停计入）。</p>
          </div>
          <div className="flex gap-3 text-[12px] text-ink-3">
            <Legend color="var(--color-ok)" label="验真通过" />
            <Legend color="var(--color-warn)" label="部分存疑" />
            <Legend color="var(--color-bad)" label="验真未过" />
          </div>
        </div>
        <div className="mt-4">{visible.length > 0 && <PriceScatter rows={visible} officialCny={officialCny} />}</div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[20px] font-black">
            排行 <span className="num text-[15px] font-semibold text-ink-3">{visible.length} 份</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" data-on={onlyVerified} onClick={() => setOnlyVerified((v) => !v)}>
              仅验真通过
            </button>
            {excludedCount > 0 && (
              <button type="button" className="chip" data-on={showExcluded} onClick={() => setShowExcluded((v) => !v)}>
                显示密钥异常 {excludedCount}
              </button>
            )}
          </div>
        </div>
        <div className="panel scroll-x mt-4 rounded-md">
          <table className="w-full min-w-[1240px] text-[13px]">
            <thead>
              <tr className="border-b border-ink text-left text-[11.5px] text-ink-3">
                <th className="w-10 px-4 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">渠道 · 分组</th>
                <th className="px-3 py-3 font-medium">来源</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right font-medium">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === c.key ? "font-semibold text-ink" : ""}`}
                      onClick={() => setSort(sort.key === c.key ? { key: c.key, asc: !sort.asc } : { key: c.key, asc: c.asc })}
                    >
                      {c.label}
                      <span className="text-[10px]">{sort.key === c.key ? (sort.asc ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 font-medium">相当于官方</th>
                <th className="px-3 py-3 font-medium">验真</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={r.id} className={`border-b border-rule/70 hover:bg-paper/60 ${r.excluded ? "text-ink-3" : ""}`}>
                  <td className="num px-4 py-3 text-ink-3">{String(i + 1).padStart(2, "0")}</td>
                  <td className="max-w-[260px] px-3 py-3">
                    <Link href={`/channels/${r.channelSlug}#${r.id}`} className="group block">
                      <span className="font-semibold text-ink group-hover:text-signal">{r.channelName}</span>
                      <span className="mt-0.5 block truncate text-ink-3">{r.group}</span>
                    </Link>
                    {r.risks.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {r.risks.slice(0, 2).map((risk) => (
                          <RiskTag key={risk}>{risk}</RiskTag>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <SourceTag type={r.sourceType} />
                  </td>
                  <td className="num px-3 py-3 text-right">{yuan(r.input)}</td>
                  <td className="num px-3 py-3 text-right text-[15px] font-semibold text-ink">{yuan(r.output)}</td>
                  <td className="num px-3 py-3 text-right">{yuan(r.cache)}</td>
                  <td className="num px-3 py-3 text-right" style={{ color: latencyTone(r.ttft) }}>
                    {ms(r.ttft)}
                  </td>
                  <td className="num px-3 py-3 text-right">{r.tps} t/s</td>
                  <td className="num px-3 py-3 text-right" style={{ color: availabilityTone(r.h24) }}>
                    {r.excluded ? "—" : pct(r.h24)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <ScoreDial score={r.score} size={36} />
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-ink-2">{r.fold < 1 ? r.fold.toFixed(2) : r.fold.toFixed(1)} 折</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      <VerifyStamp status={r.verify} stale={r.stale} />
                      {r.mystery && <MysteryStamp />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CompareToggle id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ background: color }} />
      {label}
    </span>
  );
}
