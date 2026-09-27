import Link from "next/link";
import { ms, pct, yuan } from "@/lib/format";
import type { OfferingListItem } from "@/lib/types";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { availabilityTone, Badge, latencyTone, VerifyBadge } from "@/components/ui/Badges";
import { UptimeBars } from "@/components/ui/UptimeBars";

export const ROW_GRID = "md:grid md:grid-cols-[minmax(0,1fr)_88px_72px_200px_76px_28px] md:items-center md:gap-5";

export function OfferingRowHeader() {
  return (
    <div className={`hidden border-b border-line px-4 pb-2.5 text-[12px] text-fg-3 ${ROW_GRID}`}>
      <span>渠道</span>
      <span className="text-right">刀价</span>
      <span className="text-right">首字</span>
      <span>24 小时</span>
      <span>验真</span>
      <span />
    </div>
  );
}

export function OfferingRow({ item }: { item: OfferingListItem }) {
  const risk = item.risks.find((r) => !/密钥|配置/.test(r));
  return (
    <div className={`group relative px-4 py-3.5 transition-colors hover:bg-subtle ${ROW_GRID} ${item.excludedReason ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 items-start justify-between gap-3 md:block">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate">
            {item.sponsored && <Badge>推广</Badge>}
            <Link href={`/channels/${item.channelSlug}#${item.id}`} className="truncate font-medium after:absolute after:inset-0">
              {item.channelName}
            </Link>
            <span className="truncate text-fg-2">{item.group}</span>
          </p>
          <p className="mt-0.5 truncate text-[13px] text-fg-3">
            {item.sourceType} · {item.primaryModel}
            {item.modelCount > 1 && ` +${item.modelCount - 1}`}
            {risk && <span className="text-bad"> · {risk}</span>}
          </p>
        </div>
        <p className="tnum shrink-0 text-[15px] font-semibold md:hidden">{yuan(item.daoPrice)}</p>
      </div>
      <p className="tnum hidden text-right text-[15px] font-semibold md:block">{yuan(item.daoPrice)}</p>
      <p className="tnum hidden text-right md:block" style={{ color: latencyTone(item.ttft) }}>
        {ms(item.ttft)}
      </p>
      <div className="mt-2 flex items-center gap-4 md:contents">
        <div className="flex items-center gap-3">
          <span className="tnum shrink-0 text-[13px] md:w-14" style={{ color: availabilityTone(item.excludedReason ? null : item.h24) }}>
            {item.excludedReason ? "暂停" : pct(item.h24)}
          </span>
          <UptimeBars bars={item.bars} height={18} className="hidden max-w-[128px] md:block" />
        </div>
        <span className="tnum text-[13px] text-fg-3 md:hidden">{ms(item.ttft)}</span>
        <VerifyBadge status={item.verify} stale={Boolean(item.excludedReason)} />
        <span className="ml-auto md:ml-0">
          <CompareToggle id={item.id} />
        </span>
      </div>
    </div>
  );
}
