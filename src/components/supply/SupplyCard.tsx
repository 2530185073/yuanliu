import Link from "next/link";
import { familyLabel } from "@/lib/catalog";
import { ago, discount, ms, pct, yuan } from "@/lib/format";
import { encodeBars } from "@/lib/probe";
import type { Supplier, SupplyItem, WantedPost } from "@/lib/supply";
import { VerifyStamp } from "@/components/ui/Stamp";
import { Metric, SceneTag, SourceTag } from "@/components/ui/Tags";
import { UptimeBars } from "@/components/ui/UptimeBars";

const STOCK_TONE = { 充足: "text-ok", 紧张: "text-warn", 需预约: "text-source" } as const;

export function SupplyCard({ item, supplier, downstream, index = 0 }: { item: SupplyItem; supplier: Supplier; downstream: number; index?: number }) {
  return (
    <Link
      href={`/supply/offers/${item.id}`}
      className="panel card-hover rise group relative flex flex-col overflow-hidden rounded-md"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="h-1 bg-source" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[13px]">
              <span className="font-semibold">{supplier.name}</span>
              {supplier.verified ? <span className="text-source">◆ 已认证</span> : <span className="text-ink-3">◇ 未认证</span>}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              {supplier.kind} · 信誉 <span className="num text-ink-2">{supplier.reputation}</span> · 成交 <span className="num">{supplier.deals}</span> 笔
            </p>
          </div>
          <span className={`text-[12px] font-semibold ${STOCK_TONE[item.stock]}`}>库存{item.stock}</span>
        </div>

        <h3 className="mt-3 font-display text-[17px] font-black leading-snug group-hover:text-source">{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <SourceTag type={item.sourceType} />
          <SceneTag>{familyLabel(item.family)}</SceneTag>
          {item.features.slice(0, 2).map((f) => (
            <SceneTag key={f}>{f}</SceneTag>
          ))}
        </div>

        <div className="mt-4 flex items-end justify-between border-y border-dashed border-rule py-3">
          <div>
            <p className="num text-[26px] font-semibold leading-none">
              {yuan(item.cnyPerUsd)}
              <span className="ml-1 text-[13px] font-normal text-ink-3">/刀</span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-3">约官方 {discount(item.cnyPerUsd)}</p>
          </div>
          <div className="text-right text-[12px] text-ink-2">
            <p>{item.settlement} · {item.minOrder}</p>
            <p className="num mt-1 text-ink-3">
              RPM {item.rpm.toLocaleString("en-US")} · 并发 {item.concurrency}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Metric label="首字 p50" value={ms(item.probe.p50)} />
          <Metric label="7 日可用率" value={pct(item.probe.d7)} />
          <Metric label="同源下游" value={`${downstream} 份货`} />
        </div>
        <UptimeBars bars={encodeBars(item.probe.curve)} className="mt-3" height={20} />

        <div className="mt-4 flex items-center gap-2">
          <VerifyStamp status={item.verification.status} />
          <span className="ml-auto text-[11.5px] text-ink-3">{ago(item.updatedAt)}更新</span>
        </div>
      </div>
    </Link>
  );
}

const WANTED_TONE = { 开放报价: "bg-signal text-card", 洽谈中: "bg-source text-card", 已成交: "bg-paper-2 text-ink-3" } as const;

export function WantedCard({ post, authorName, index = 0 }: { post: WantedPost; authorName: string; index?: number }) {
  return (
    <Link
      href={`/supply/wanted/${post.id}`}
      className="panel card-hover rise group flex flex-col rounded-md p-5"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-sm px-2 py-0.5 text-[12px] font-semibold ${WANTED_TONE[post.status]}`}>{post.status}</span>
        <span className="text-[11.5px] text-ink-3">
          {ago(post.postedAt)} · <span className="num">{post.views}</span> 次浏览
        </span>
      </div>
      <h3 className="mt-3 font-display text-[17px] font-black leading-snug group-hover:text-signal">{post.title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">求购方：{authorName}（中转站）</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-rule pt-3 text-[12.5px]">
        <div>
          <dt className="text-ink-3">用量</dt>
          <dd className="mt-0.5 font-semibold">{post.volume}</dd>
        </div>
        <div>
          <dt className="text-ink-3">目标价</dt>
          <dd className="num mt-0.5 font-semibold text-signal">{post.target}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.requirements.slice(0, 3).map((req) => (
          <SceneTag key={req}>{req}</SceneTag>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] font-semibold text-ink-2">
        已有 <span className="num text-ink">{post.responses.length}</span> 家供应商报价 →
      </p>
    </Link>
  );
}
