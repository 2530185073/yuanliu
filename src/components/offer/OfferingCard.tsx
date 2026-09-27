import Link from "next/link";
import { ms, pct, yuan } from "@/lib/format";
import type { OfferingListItem } from "@/lib/types";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { Perforation } from "@/components/ui/Perforation";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { MysteryStamp, VerifyStamp } from "@/components/ui/Stamp";
import { availabilityTone, latencyTone, Metric, Pill, RiskTag, SceneTag, SourceTag } from "@/components/ui/Tags";
import { UptimeBars } from "@/components/ui/UptimeBars";

export const PRICE_SOURCE_LABEL = { synced: "自动同步", manual: "站长填写", measured: "平台实测" } as const;

export function OfferingCard({ item, index = 0 }: { item: OfferingListItem; index?: number }) {
  return (
    <article
      className={`panel card-hover rise group relative flex flex-col rounded-md p-5 ${item.excludedReason ? "opacity-80" : ""}`}
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
    >
      {item.sponsored && (
        <span className="absolute -top-2.5 left-5">
          <Pill tone="signal">赞助</Pill>
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px]">
            <span className="font-semibold text-ink">{item.channelName}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${item.claimed ? "bg-ok" : "bg-rule"}`} title={item.claimed ? "站长已认领" : "平台收录，未认领"} />
          </p>
          <p className="num mt-0.5 truncate text-[11.5px] text-ink-3">
            {item.domain} · {item.ageDays} 天
          </p>
        </div>
        <ScoreDial score={item.score} size={46} />
      </div>

      <h3 className="mt-3 line-clamp-1 font-display text-[19px] font-black leading-snug tracking-wide group-hover:text-signal">
        <Link href={`/channels/${item.channelSlug}#${item.id}`} className="after:absolute after:inset-0 after:content-['']">
          {item.group}
        </Link>
      </h3>
      <div className="mt-2 flex min-h-[22px] flex-wrap gap-1.5">
        <SourceTag type={item.sourceType} />
        {item.scenes.slice(0, 3).map((s) => (
          <SceneTag key={s}>{s}</SceneTag>
        ))}
      </div>

      <Perforation className="mt-4" />
      <div className="flex items-end justify-between gap-3 py-4">
        <div>
          <p className="num text-[30px] font-semibold leading-none tracking-tight">
            {yuan(item.daoPrice)}
            <span className="ml-1 text-[13px] font-normal text-ink-3">/刀</span>
          </p>
          <p className="mt-2 text-[11.5px] text-ink-3">刀价 · {PRICE_SOURCE_LABEL[item.priceSource]}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="num truncate text-[12px] text-ink-2">
            {item.primaryModel}
            {item.modelCount > 1 && <span className="text-ink-3"> +{item.modelCount - 1}</span>}
          </p>
          <p className="num mt-1.5 text-[12px] text-ink-3">
            入 {yuan(item.primaryInput)} · 出 {yuan(item.primaryOutput)}
            <span className="text-[10.5px]"> /M</span>
          </p>
        </div>
      </div>
      <Perforation />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="首字 p50" value={ms(item.ttft)} tone={latencyTone(item.ttft)} sub={`p95 ${ms(item.ttft95)}`} />
        <Metric
          label="24h 可用率"
          value={item.excludedReason ? "暂停计入" : pct(item.h24)}
          tone={availabilityTone(item.excludedReason ? null : item.h24)}
          sub={`7 日 ${pct(item.d7)}`}
        />
        <Metric label="吐字速度" value={`${item.tps} t/s`} sub={item.excludedReason ?? (item.mystery ? "含平台实测" : "站长 Key 探测")} />
      </div>
      <UptimeBars bars={item.bars} className="mt-4" height={22} />

      <div className="mt-4 flex min-h-[30px] flex-wrap items-center gap-2">
        <VerifyStamp status={item.verify} stale={Boolean(item.excludedReason)} />
        {item.mystery && <MysteryStamp />}
        {item.risks.slice(0, 2).map((r) => (
          <RiskTag key={r}>{r}</RiskTag>
        ))}
        <span className="ml-auto flex items-center gap-2">
          {item.welfare && <span className="text-[12px] font-semibold text-signal">有福利</span>}
          <CompareToggle id={item.id} />
        </span>
      </div>
    </article>
  );
}
