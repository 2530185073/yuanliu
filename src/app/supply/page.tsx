import type { Metadata } from "next";
import { getChannel, offeringsForSupply } from "@/lib/data";
import { getSupplier, SUPPLIERS, SUPPLY_ITEMS, WANTED_POSTS } from "@/lib/supply";
import { ProtoModal } from "@/components/ui/Proto";
import { SupplyBoard } from "./SupplyBoard";

export const metadata: Metadata = { title: "货源广场" };

const RULES = [
  { title: "只撮合，不经手资金", body: "买家登录后可见供应商联系方式，双方站外成交。平台不做担保、不代收款。" },
  { title: "上游货也要验真", body: "供应商上架时提交测试 Key，与下游货走同一套心跳探测、验真与报价核对。" },
  { title: "成交可追溯", body: "买家确认成交后才能评价，供应商信誉分据此累积；跑路或掺假查实后公开曝光。" },
  { title: "禁售清单", body: "盗刷卡充值、被盗账号、来源不明的 Key 一律禁售。号池等灰色来源必须如实标注。" },
];

export default function SupplyPage() {
  const supplies = SUPPLY_ITEMS.map((item) => ({ item, supplier: getSupplier(item.supplierId)!, downstream: offeringsForSupply(item.id).length }));
  const wanted = WANTED_POSTS.map((post) => ({ post, authorName: getChannel(post.authorSlug)?.name ?? "某中转站" }));
  const verifiedSuppliers = SUPPLIERS.filter((s) => s.verified).length;

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-12">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="rise">
          <p className="eyebrow" style={{ color: "var(--color-source)" }}>
            UPSTREAM · 货源广场
          </p>
          <h1 className="mt-4 font-display text-[44px] font-black leading-[1.12] md:text-[58px]">
            给中转站找货，
            <br />
            <span className="text-source">货也先验过。</span>
          </h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-[1.9] text-ink-2">
            云厂商渠道、企业账户、号池、官方 Key 分销、中转批发，全部按「刀价」报价，并接入同一套探测。
            通过响应指纹比对，还能看到一份上游货在哪些下游中转里被转卖。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ProtoModal className="btn btn-ink h-11 px-5" label="发布货源" title="发布上游货源" subtitle="提交后平台会用测试 Key 跑 24 小时探测与验真，通过后上架">
              <div className="grid gap-3">
                {["货源标题", "来源类型（云厂商 / 企业账户 / 号池 / 官方 Key / 中转批发）", "可用模型", "刀价报价（元 / 每 1 美元官方额度）", "结算方式与起购量", "RPM / 并发上限", "测试 Key（仅用于探测，加密存储）"].map((f) => (
                  <label key={f} className="block">
                    <span className="text-[12px] text-ink-3">{f}</span>
                    <input className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-3 outline-none focus:border-ink" />
                  </label>
                ))}
              </div>
            </ProtoModal>
            <ProtoModal className="btn btn-line h-11 px-5" label="发布求购" title="发布求购" subtitle="描述你需要的模型、用量和目标价，供应商会带着验真报告来报价">
              <div className="grid gap-3">
                {["求购标题", "模型", "预计用量", "目标刀价", "硬性要求（如：首字 < 3 秒、可开票）"].map((f) => (
                  <label key={f} className="block">
                    <span className="text-[12px] text-ink-3">{f}</span>
                    <input className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-3 outline-none focus:border-ink" />
                  </label>
                ))}
              </div>
            </ProtoModal>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-md border border-ink bg-ink">
          {RULES.map((r, i) => (
            <div key={r.title} className="rise bg-card p-5" style={{ "--i": i + 2 } as React.CSSProperties}>
              <p className="num text-[11px] text-source">0{i + 1}</p>
              <p className="mt-1 font-display text-[16px] font-black">{r.title}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{r.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-y border-rule py-4 text-[13px] text-ink-3">
        <span>
          在架货源 <b className="num text-[18px] text-ink">{SUPPLY_ITEMS.length}</b>
        </span>
        <span>
          供应商 <b className="num text-[18px] text-ink">{SUPPLIERS.length}</b>（认证 {verifiedSuppliers}）
        </span>
        <span>
          开放求购 <b className="num text-[18px] text-ink">{WANTED_POSTS.filter((w) => w.status !== "已成交").length}</b>
        </span>
        <span>
          同源关联的下游货 <b className="num text-[18px] text-ink">{supplies.reduce((s, x) => s + x.downstream, 0)}</b> 份
        </span>
      </div>

      <SupplyBoard supplies={supplies} wanted={wanted} />
    </div>
  );
}
