import Link from "next/link";
import { channelOf, offeringsForSupply } from "@/lib/data";
import { ms, pct, yuan } from "@/lib/format";
import { encodeBars } from "@/lib/probe";
import type { Channel, Offering } from "@/lib/types";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { availabilityTone, latencyTone, VerifyBadge } from "@/components/ui/Badges";
import { UptimeBars } from "@/components/ui/UptimeBars";

export function OfferingBlock({ offering: o, channel }: { offering: Offering; channel: Channel }) {
  const peers = o.cluster ? offeringsForSupply(o.cluster.supplyId).filter((p) => p.id !== o.id) : [];
  const risks = o.risks.filter((r) => !/密钥|配置/.test(r));

  return (
    <article id={o.id} className="card scroll-mt-24 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-tight">{o.group}</h3>
          <p className="tnum mt-1 text-[13px] text-fg-3">
            {o.sourceType} · 倍率 {o.effective}
            {o.measured !== null && "（实测）"} · {channel.rechargeText}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="tnum text-[20px] font-semibold tracking-tight">
            {yuan(o.daoPrice)}
            <span className="ml-0.5 text-[13px] font-normal text-fg-3">/刀</span>
          </p>
          <CompareToggle id={o.id} label />
        </div>
      </div>

      <div className="scroll-x mt-4">
        <table className="w-full min-w-[480px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-fg-3">
              <th className="pb-2 font-normal">模型</th>
              <th className="pb-2 text-right font-normal">输入 ¥/M</th>
              <th className="pb-2 text-right font-normal">输出 ¥/M</th>
              <th className="pb-2 text-right font-normal">缓存 ¥/M</th>
              <th className="pb-2 text-right font-normal">首字</th>
            </tr>
          </thead>
          <tbody>
            {o.quotes.map((q) => (
              <tr key={q.modelId} className="border-t border-line">
                <td className="py-2">
                  <Link href={`/models/${q.modelId}`} className="hover:underline">
                    {q.modelId}
                  </Link>
                </td>
                <td className="tnum py-2 text-right text-fg-2">{yuan(q.realInput)}</td>
                <td className="tnum py-2 text-right font-medium">{yuan(q.realOutput)}</td>
                <td className="tnum py-2 text-right text-fg-2">{yuan(q.realCache)}</td>
                <td className="tnum py-2 text-right" style={{ color: latencyTone(q.ttftMs) }}>
                  {ms(q.ttftMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
        <span className="tnum w-16 shrink-0 text-[13px]" style={{ color: availabilityTone(o.probe.excludedReason ? null : o.probe.h24) }}>
          {o.probe.excludedReason ? "暂停计入" : pct(o.probe.h24)}
        </span>
        <UptimeBars bars={encodeBars(o.probe.curve)} height={16} />
        <VerifyBadge status={o.verification.status} stale={o.verification.stale} />
      </div>

      {(risks.length > 0 || o.probe.excludedReason || peers.length > 0) && (
        <p className="mt-3 text-[13px] text-fg-3">
          {o.probe.excludedReason && <span>{o.probe.excludedReason}，已通知站长。</span>}
          {risks.length > 0 && <span className="text-bad">{risks.join("、")}。</span>}
          {peers.length > 0 && (
            <span>
              与{" "}
              <Link href={`/channels/${peers[0].channelSlug}#${peers[0].id}`} className="link">
                {channelOf(peers[0]).name}
              </Link>
              {peers.length > 1 && ` 等 ${peers.length} 份货`}疑似同源。
            </span>
          )}
        </p>
      )}
    </article>
  );
}
