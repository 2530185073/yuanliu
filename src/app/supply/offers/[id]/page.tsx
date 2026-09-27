import Link from "next/link";
import { notFound } from "next/navigation";
import { familyLabel, getModel } from "@/lib/catalog";
import { channelOf, offeringsForSupply } from "@/lib/data";
import { ago, discount, FX, ms, pct, yuan } from "@/lib/format";
import { encodeBars } from "@/lib/probe";
import { getSupplier, getSupply, SUPPLY_ITEMS, WANTED_POSTS } from "@/lib/supply";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { CheckGrid } from "@/components/offer/CheckGrid";
import { ProtoModal } from "@/components/ui/Proto";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { VerifyStamp } from "@/components/ui/Stamp";
import { SceneTag, SourceTag } from "@/components/ui/Tags";
import { UptimeBars } from "@/components/ui/UptimeBars";

export function generateStaticParams() {
  return SUPPLY_ITEMS.map((s) => ({ id: s.id }));
}

export async function generateMetadata(props: PageProps<"/supply/offers/[id]">) {
  const { id } = await props.params;
  return { title: getSupply(id)?.title ?? "货源不存在" };
}

export default async function SupplyOfferPage(props: PageProps<"/supply/offers/[id]">) {
  const { id } = await props.params;
  const item = getSupply(id);
  if (!item) notFound();
  const supplier = getSupplier(item.supplierId)!;
  const downstream = offeringsForSupply(item.id);
  const siblings = SUPPLY_ITEMS.filter((s) => s.supplierId === supplier.id && s.id !== item.id);
  const quotedIn = WANTED_POSTS.filter((w) => w.responses.some((r) => r.supplyId === item.id));

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-10">
      <nav className="text-[13px] text-ink-3">
        <Link href="/supply" className="link-underline hover:text-ink">
          货源广场
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{supplier.name}</span>
      </nav>

      <header className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="rise">
          <p className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold">{supplier.name}</span>
            {supplier.verified ? (
              <span className="rounded-sm bg-source-soft px-2 py-0.5 font-semibold text-source">◆ 认证供应商</span>
            ) : (
              <span className="rounded-sm bg-paper-2 px-2 py-0.5 text-ink-3">◇ 未认证</span>
            )}
            <span className="text-ink-3">{supplier.kind}</span>
          </p>
          <h1 className="mt-3 font-display text-[36px] font-black leading-tight md:text-[48px]">{item.title}</h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <SourceTag type={item.sourceType} />
            <SceneTag>{familyLabel(item.family)}</SceneTag>
            {item.features.map((f) => (
              <SceneTag key={f}>{f}</SceneTag>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <ProtoModal className="btn btn-ink" label="查看联系方式" title={`联系 ${supplier.name}`} subtitle="登录后可见；查看记录会同步给供应商，便于双方确认线索">
              <div className="rounded-md border border-rule bg-paper p-4">
                <p className="num select-none text-[16px] blur-[5px]">{supplier.contact}</p>
              </div>
              <p className="mt-3 text-[12px] text-ink-3">平台不经手资金。成交后请回到这里点「确认成交」并评价，供应商的信誉分依此累积。</p>
            </ProtoModal>
            <ProtoModal className="btn btn-line" label="申请测试额度" title="申请测试额度" subtitle="供应商同意后，测试 Key 会发到你的站内信">
              <label className="block">
                <span className="text-[12px] text-ink-3">你的中转站（需已在平台收录）</span>
                <input className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-3 outline-none focus:border-ink" placeholder="例如：青柚 API" />
              </label>
              <label className="mt-3 block">
                <span className="text-[12px] text-ink-3">预计月用量</span>
                <input className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-3 outline-none focus:border-ink" placeholder="例如：约 5 亿 token" />
              </label>
            </ProtoModal>
          </div>
        </div>
        <div className="panel rise self-start rounded-md p-6" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="text-[12px] text-ink-3">报价 · 每 1 美元官方额度</p>
          <p className="num mt-2 text-[44px] font-semibold leading-none text-source">
            {yuan(item.cnyPerUsd)}
            <span className="ml-1 text-[15px] font-normal text-ink-3">/刀</span>
          </p>
          <p className="mt-2 text-[13px] text-ink-2">约官方 {discount(item.cnyPerUsd)}（按 1 美元 = {FX} 元）</p>
          <div className="mt-4">
            <VerifyStamp status={item.verification.status} size="lg" />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink bg-ink sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="结算方式" value={item.settlement} />
        <Kpi label="起购" value={item.minOrder} />
        <Kpi label="RPM / 并发" value={`${item.rpm.toLocaleString("en-US")} / ${item.concurrency}`} />
        <Kpi label="库存" value={item.stock} />
        <Kpi label="7 日可用率" value={pct(item.probe.d7)} />
        <Kpi label="首字 p50" value={ms(item.probe.p50)} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="border-b-2 border-ink pb-3 font-display text-[26px] font-black">货源说明</h2>
            <p className="mt-4 text-[15px] leading-[1.9] text-ink-2">{item.description}</p>
            <p className="mt-3 rounded-sm bg-source-soft/60 px-4 py-3 text-[13px] text-source">售后：{item.afterSales}</p>
          </section>

          <section>
            <h2 className="border-b-2 border-ink pb-3 font-display text-[26px] font-black">模型与折算单价</h2>
            <div className="panel scroll-x mt-4 rounded-md">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-ink text-left text-[11.5px] text-ink-3">
                    <th className="px-5 py-3 font-medium">模型</th>
                    <th className="px-3 py-3 text-right font-medium">官方 $ 入 / 出</th>
                    <th className="px-3 py-3 text-right font-medium">折算 ¥ 输入</th>
                    <th className="px-3 py-3 text-right font-medium">折算 ¥ 输出</th>
                    <th className="px-5 py-3 text-right font-medium">下游比价</th>
                  </tr>
                </thead>
                <tbody>
                  {item.models.map((id) => {
                    const m = getModel(id);
                    return (
                      <tr key={id} className="border-b border-rule/60 last:border-0">
                        <td className="num px-5 py-3 font-semibold">{id}</td>
                        <td className="num px-3 py-3 text-right text-ink-3">
                          ${m.input} / ${m.output}
                        </td>
                        <td className="num px-3 py-3 text-right">{yuan(m.input * item.cnyPerUsd)}</td>
                        <td className="num px-3 py-3 text-right font-semibold">{yuan(m.output * item.cnyPerUsd)}</td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/models/${id}`} className="text-[12.5px] font-semibold underline-offset-4 hover:underline">
                            看下游卖多少 →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="border-b-2 border-ink pb-3 font-display text-[26px] font-black">探测与验真</h2>
            <div className="panel mt-4 rounded-md p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px] text-ink-3">
                <span>用供应商提交的测试 Key 探测 · 24h 可用率 <b className="num text-ink">{pct(item.probe.h24)}</b></span>
                <span className="num">
                  p50 {ms(item.probe.p50)} · p95 {ms(item.probe.p95)} · {item.probe.tps} t/s
                </span>
              </div>
              <UptimeBars bars={encodeBars(item.probe.curve)} height={28} className="mt-3" />
              <div className="mt-4">
                <LatencyChart curve={item.probe.curve} />
              </div>
            </div>
            <div className="mt-4">
              <CheckGrid checks={item.verification.checks} />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
              <h2 className="font-display text-[26px] font-black">同源下游</h2>
              <p className="text-[12.5px] text-ink-3">响应指纹与这份货源一致的下游货；站长授权后才会公开标注货源</p>
            </div>
            {downstream.length === 0 ? (
              <p className="panel mt-4 rounded-md p-6 text-[13px] text-ink-3">暂未发现同源的下游货。</p>
            ) : (
              <ul className="panel mt-4 divide-y divide-rule/70 rounded-md">
                {downstream.map((o) => (
                  <li key={o.id}>
                    <Link href={`/channels/${o.channelSlug}#${o.id}`} className="flex flex-wrap items-center gap-4 px-5 py-3 text-[13px] hover:bg-paper/60">
                      <ScoreDial score={o.score} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{channelOf(o).name}</span>
                        <span className="ml-2 text-ink-3">{o.group}</span>
                      </span>
                      <span className="num text-ink-2">
                        下游刀价 <b className="text-ink">{yuan(o.daoPrice)}</b>
                      </span>
                      <span className="num w-28 text-right text-[12px] text-ink-3">置信 {o.cluster?.confidence}%{o.cluster?.disclosed ? " · 已公开" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-[116px] lg:self-start">
          <div className="panel rounded-md p-5">
            <div className="flex items-center gap-4">
              <ScoreDial score={supplier.reputation} size={64} label="信誉分" />
              <div>
                <p className="font-display text-[20px] font-black">{supplier.name}</p>
                <p className="text-[12px] text-ink-3">信誉分 · {supplier.kind}</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{supplier.bio}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-dashed border-rule pt-4 text-[12px]">
              <div>
                <dt className="text-ink-3">确认成交</dt>
                <dd className="num mt-0.5 text-[16px] font-semibold">{supplier.deals}</dd>
              </div>
              <div>
                <dt className="text-ink-3">入驻</dt>
                <dd className="num mt-0.5 text-[16px] font-semibold">{supplier.joinedDays} 天</dd>
              </div>
              <div>
                <dt className="text-ink-3">平均响应</dt>
                <dd className="num mt-0.5 text-[16px] font-semibold">{supplier.responseMins} 分</dd>
              </div>
            </dl>
          </div>

          {siblings.length > 0 && (
            <div className="panel rounded-md">
              <p className="border-b border-rule px-5 py-3 text-[13px] font-semibold">该供应商的其他货源</p>
              <ul className="divide-y divide-rule/70">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <Link href={`/supply/offers/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] hover:bg-paper/60">
                      <span className="min-w-0 truncate font-semibold">{s.title}</span>
                      <span className="num shrink-0 text-source">{yuan(s.cnyPerUsd)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {quotedIn.length > 0 && (
            <div className="panel rounded-md">
              <p className="border-b border-rule px-5 py-3 text-[13px] font-semibold">正在参与的求购</p>
              <ul className="divide-y divide-rule/70">
                {quotedIn.map((w) => (
                  <li key={w.id}>
                    <Link href={`/supply/wanted/${w.id}`} className="block px-5 py-3 text-[13px] hover:bg-paper/60">
                      <span className="font-semibold">{w.title}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {w.status} · {ago(w.postedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border-2 border-dashed border-ink p-5 text-[12.5px] leading-relaxed text-ink-2">
            <p className="font-display text-[16px] font-black text-ink">交易须知</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>平台只做信息撮合，不代收款、不做担保。</li>
              <li>建议先申请测试额度，小额试跑后再预付。</li>
              <li>成交后回到本页确认并评价，信誉分据此更新。</li>
              <li>发现盗刷、掺假、跑路，可一键举报并附证据。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-card px-5 py-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="num mt-1 truncate text-[17px] font-semibold">{value}</p>
    </div>
  );
}
