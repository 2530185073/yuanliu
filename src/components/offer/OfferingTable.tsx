import Link from "next/link";
import { ms, pct, yuan } from "@/lib/format";
import type { OfferingListItem } from "@/lib/types";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { VerifyStamp } from "@/components/ui/Stamp";
import { availabilityTone, latencyTone, Pill, RiskTag, SourceTag } from "@/components/ui/Tags";
import { UptimeBars } from "@/components/ui/UptimeBars";

export function OfferingTable({ items }: { items: OfferingListItem[] }) {
  return (
    <div className="panel scroll-x rounded-md">
      <table className="w-full min-w-[1200px] text-[13px]">
        <thead>
          <tr className="border-b border-ink text-left text-[11.5px] text-ink-3">
            <th className="px-4 py-3 font-medium">渠道 · 分组</th>
            <th className="px-3 py-3 font-medium">来源</th>
            <th className="px-3 py-3 text-right font-medium">刀价</th>
            <th className="px-3 py-3 font-medium">主模型 ¥/M（入 · 出）</th>
            <th className="px-3 py-3 text-right font-medium">首字 p50</th>
            <th className="px-3 py-3 text-right font-medium">24h</th>
            <th className="px-3 py-3 text-right font-medium">7 日</th>
            <th className="w-[160px] px-3 py-3 font-medium">24h 探测</th>
            <th className="px-3 py-3 font-medium">验真</th>
            <th className="px-3 py-3 text-right font-medium">综合分</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-rule/70 hover:bg-paper/60">
              <td className="max-w-[280px] px-4 py-3">
                <Link href={`/channels/${item.channelSlug}#${item.id}`} className="group block">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold group-hover:text-signal">{item.channelName}</span>
                    {item.sponsored && <Pill tone="signal">赞助</Pill>}
                  </span>
                  <span className="mt-0.5 block truncate text-ink-3">{item.group}</span>
                  {item.risks.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {item.risks.slice(0, 2).map((r) => (
                        <RiskTag key={r}>{r}</RiskTag>
                      ))}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-3 py-3">
                <SourceTag type={item.sourceType} />
              </td>
              <td className="num px-3 py-3 text-right text-[15px] font-semibold">{yuan(item.daoPrice)}</td>
              <td className="num px-3 py-3 text-ink-2">
                <span className="block text-[12px]">{item.primaryModel}</span>
                <span className="text-ink-3">
                  {yuan(item.primaryInput)} · {yuan(item.primaryOutput)}
                </span>
              </td>
              <td className="num px-3 py-3 text-right" style={{ color: latencyTone(item.ttft) }}>
                {ms(item.ttft)}
              </td>
              <td className="num px-3 py-3 text-right" style={{ color: availabilityTone(item.h24) }}>
                {item.excludedReason ? "—" : pct(item.h24)}
              </td>
              <td className="num px-3 py-3 text-right text-ink-2">{pct(item.d7)}</td>
              <td className="px-3 py-3">
                <UptimeBars bars={item.bars} height={18} />
              </td>
              <td className="px-3 py-3">
                <VerifyStamp status={item.verify} stale={Boolean(item.excludedReason)} />
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-end">
                  <ScoreDial score={item.score} size={38} />
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <CompareToggle id={item.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
