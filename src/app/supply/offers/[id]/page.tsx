import Link from "next/link";
import { notFound } from "next/navigation";
import { getModel } from "@/lib/catalog";
import { channelOf, offeringsForSupply } from "@/lib/data";
import { discount, ms, pct, yuan } from "@/lib/format";
import { encodeBars } from "@/lib/probe";
import { getSupplier, getSupply, SUPPLY_ITEMS } from "@/lib/supply";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { CheckMatrix } from "@/components/offer/CheckMatrix";
import { Stat } from "@/components/ui/Badges";
import { ProtoModal } from "@/components/ui/Proto";
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

  return (
    <div className="mx-auto max-w-[880px] px-5 pt-12">
      <Link href="/supply" className="text-[13px] text-fg-3 hover:text-fg">
        ← 货源广场
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{item.title}</h1>
          <p className="mt-1 text-fg-3">
            {supplier.name}
            {supplier.verified && " · 已认证"} · 信誉 {supplier.reputation} · 成交 {supplier.deals} 笔
          </p>
        </div>
        <ProtoModal className="btn btn-primary" label="联系供应商" title={`联系 ${supplier.name}`}>
          <p className="select-none rounded-lg bg-subtle px-4 py-3 blur-[4px]">{supplier.contact}</p>
          <p className="mt-3 text-[13px] text-fg-3">登录后可见。成交后请回来确认并评价。</p>
        </ProtoModal>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="报价" value={`${yuan(item.cnyPerUsd)}/刀`} />
        <Stat label="约官方" value={discount(item.cnyPerUsd)} />
        <Stat label="7 日可用率" value={pct(item.probe.d7)} />
        <Stat label="首字 p50" value={ms(item.probe.p50)} />
      </div>

      <p className="mt-10 leading-relaxed text-fg-2">{item.description}</p>
      <p className="tnum mt-3 text-[13px] text-fg-3">
        {item.settlement} · {item.minOrder} · RPM {item.rpm.toLocaleString("en-US")} · 并发 {item.concurrency} · {item.afterSales}
      </p>

      <div className="card mt-10 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-fg-3">
              <th className="px-4 py-3 font-normal">模型</th>
              <th className="px-4 py-3 text-right font-normal">输入 ¥/M</th>
              <th className="px-4 py-3 text-right font-normal">输出 ¥/M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {item.models.map((mid) => {
              const m = getModel(mid);
              return (
                <tr key={mid}>
                  <td className="px-4 py-3">
                    <Link href={`/models/${mid}`} className="hover:underline">
                      {mid}
                    </Link>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-fg-2">{yuan(m.input * item.cnyPerUsd)}</td>
                  <td className="tnum px-4 py-3 text-right font-medium">{yuan(m.output * item.cnyPerUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card mt-6 p-5">
        <UptimeBars bars={encodeBars(item.probe.curve)} height={20} />
        <div className="mt-5">
          <LatencyChart curve={item.probe.curve} />
        </div>
      </div>

      <div className="mt-6">
        <CheckMatrix columns={[{ label: item.title, checks: item.verification.checks }]} />
      </div>

      {downstream.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[13px] text-fg-3">疑似同源的下游货</h2>
          <ul className="card mt-3 divide-y divide-line overflow-hidden">
            {downstream.map((o) => (
              <li key={o.id}>
                <Link href={`/channels/${o.channelSlug}#${o.id}`} className="flex items-center justify-between gap-4 px-4 py-3 text-[14px] hover:bg-subtle">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{channelOf(o).name}</span>
                    <span className="ml-2 text-fg-3">{o.group}</span>
                  </span>
                  <span className="tnum shrink-0 text-fg-2">{yuan(o.daoPrice)}/刀</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
