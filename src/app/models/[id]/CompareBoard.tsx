"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ms, pct, yuan } from "@/lib/format";
import type { ModelCompareRow } from "@/lib/views";
import { PriceScatter } from "@/components/charts/PriceScatter";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { availabilityTone, latencyTone, VerifyBadge } from "@/components/ui/Badges";

type Key = "output" | "input" | "ttft" | "h24";

const COLUMNS: { key: Key; label: string; asc: boolean }[] = [
  { key: "input", label: "输入", asc: true },
  { key: "output", label: "输出", asc: true },
  { key: "ttft", label: "首字", asc: true },
  { key: "h24", label: "24h", asc: false },
];

export function CompareBoard({ rows, officialCny }: { rows: ModelCompareRow[]; officialCny: number }) {
  const [sort, setSort] = useState<{ key: Key; asc: boolean }>({ key: "output", asc: true });
  const live = useMemo(() => {
    const val = (r: ModelCompareRow) => r[sort.key] ?? (sort.asc ? Infinity : -Infinity);
    return rows.filter((r) => !r.excluded).sort((a, b) => (sort.asc ? val(a) - val(b) : val(b) - val(a)));
  }, [rows, sort]);

  return (
    <>
      <div className="card mt-10 px-4 pb-2 pt-5">
        <PriceScatter rows={rows} officialCny={officialCny} />
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="scroll-x">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-fg-3">
                <th className="px-4 py-3 font-normal">渠道</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right font-normal">
                    <button
                      type="button"
                      className={`hover:text-fg ${sort.key === c.key ? "text-fg" : ""}`}
                      onClick={() => setSort(sort.key === c.key ? { key: c.key, asc: !sort.asc } : { key: c.key, asc: c.asc })}
                    >
                      {c.label}
                      {sort.key === c.key && (sort.asc ? " ↑" : " ↓")}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 font-normal">验真</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {live.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-subtle">
                  <td className="max-w-[280px] px-4 py-3">
                    <Link href={`/channels/${r.channelSlug}#${r.id}`} className="font-medium hover:underline">
                      {r.channelName}
                    </Link>
                    <span className="ml-2 text-fg-3">{r.group}</span>
                  </td>
                  <td className="tnum px-3 py-3 text-right text-fg-2">{yuan(r.input)}</td>
                  <td className="tnum px-3 py-3 text-right font-semibold">{yuan(r.output)}</td>
                  <td className="tnum px-3 py-3 text-right" style={{ color: latencyTone(r.ttft) }}>
                    {ms(r.ttft)}
                  </td>
                  <td className="tnum px-3 py-3 text-right" style={{ color: availabilityTone(r.h24) }}>
                    {pct(r.h24)}
                  </td>
                  <td className="px-3 py-3">
                    <VerifyBadge status={r.verify} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CompareToggle id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
