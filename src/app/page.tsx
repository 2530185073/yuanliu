import Link from "next/link";
import { CHANNELS, getChannel, LIST_ITEMS, OFFERINGS } from "@/lib/data";
import { getSupplier, SUPPLY_ITEMS, WANTED_POSTS } from "@/lib/supply";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InspectionSlip } from "@/components/home/InspectionSlip";
import { MarketBoard } from "@/components/home/MarketBoard";
import { OfferingCard } from "@/components/offer/OfferingCard";
import { HomeBoard } from "./HomeBoard";

export default function HomePage() {
  const supplies = [...SUPPLY_ITEMS]
    .map((item) => ({
      item,
      supplier: getSupplier(item.supplierId)!,
      downstream: OFFERINGS.filter((o) => o.cluster?.supplyId === item.id).length,
    }))
    .sort((a, b) => b.supplier.reputation - a.supplier.reputation);
  const wanted = WANTED_POSTS.map((post) => ({ post, authorName: getChannel(post.authorSlug)?.name ?? "某中转站" }));
  const sponsored = LIST_ITEMS.filter((it) => it.sponsored);
  const slipOffering = [...OFFERINGS].filter((o) => o.verification.status === "pass" && !o.probe.excludedReason).sort((a, b) => b.verification.score - a.verification.score)[0];

  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-10 px-6 pb-14 pt-12 lg:grid-cols-[1.25fr_1fr]">
        <div className="rise">
          <p className="eyebrow">第 1 期原型 · 数据快照 2026.09.27</p>
          <h1 className="mt-5 font-display text-[44px] font-black leading-[1.12] tracking-[0.02em] md:text-[64px]">
            每一份货，
            <br />
            先<span className="text-signal">验</span>过再上架。
          </h1>
          <p className="mt-6 max-w-[560px] text-[16px] leading-[1.9] text-ink-2">
            收录 <b className="num text-ink">{CHANNELS.length}</b> 家中转的 <b className="num text-ink">{OFFERINGS.length}</b> 份货。每 5 分钟探测一次首字与可用率，9 项验真检查识别套壳、注入和倍率套路。所有价格折算成「刀价」——每消耗
            1 美元官方额度要花多少人民币，不同充值比例、不同倍率终于能放在一起比。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/models" className="btn btn-ink h-11 px-5">
              按模型比价 →
            </Link>
            <Link href="/supply" className="btn btn-line h-11 px-5">
              进入货源广场
            </Link>
          </div>
        </div>

        <div className="rise relative lg:pt-16" style={{ "--i": 3 } as React.CSSProperties}>
          <InspectionSlip offering={slipOffering} />
          <div className="relative lg:mr-14">
            <MarketBoard />
          </div>
        </div>
      </section>

      <HowItWorks />

      {sponsored.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-12">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">赞助位 · 需满足 7 日可用率 ≥ 97% 且验真通过</p>
            <p className="text-[12px] text-ink-3">不影响下方自然排序</p>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {sponsored.map((item, i) => (
              <OfferingCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      <HomeBoard items={LIST_ITEMS} supplies={supplies} wanted={wanted} />
    </>
  );
}