import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ms, pct, yuan } from "@/lib/format";
import type { Channel, Offering } from "@/lib/types";
import { getOfferingsWithChannel, getTopOfferingIds } from "@/server/repo";
import { CompareSync } from "@/components/compare/CompareSync";
import { VerifyBadge } from "@/components/ui/Badges";

export const metadata: Metadata = { title: "对比" };

interface Col {
  o: Offering;
  ch: Channel;
}

interface Row {
  label: string;
  render: (c: Col) => ReactNode;
  best?: { value: (c: Col) => number | null; prefer: "max" | "min" };
}

const ROWS: Row[] = [
  { label: "刀价", render: ({ o }) => yuan(o.daoPrice), best: { value: ({ o }) => o.daoPrice, prefer: "min" } },
  { label: "主模型", render: ({ o }) => o.quotes[0].modelId },
  { label: "输出 ¥/M", render: ({ o }) => yuan(o.quotes[0].realOutput), best: { value: ({ o }) => o.quotes[0].realOutput, prefer: "min" } },
  { label: "24h 可用率", render: ({ o }) => (o.probe.excludedReason ? "暂停计入" : pct(o.probe.h24)), best: { value: ({ o }) => (o.probe.excludedReason ? null : o.probe.h24), prefer: "max" } },
  { label: "7 日可用率", render: ({ o }) => pct(o.probe.d7), best: { value: ({ o }) => o.probe.d7, prefer: "max" } },
  { label: "首字 p50", render: ({ o }) => ms(o.probe.p50), best: { value: ({ o }) => o.probe.p50, prefer: "min" } },
  { label: "吐字速度", render: ({ o }) => `${o.probe.tps} t/s`, best: { value: ({ o }) => o.probe.tps, prefer: "max" } },
  { label: "验真", render: ({ o }) => <VerifyBadge status={o.verification.status} stale={o.verification.stale} /> },
  { label: "验真分", render: ({ o }) => o.verification.score, best: { value: ({ o }) => o.verification.score, prefer: "max" } },
  { label: "发票", render: ({ ch }) => (ch.invoice ? "支持" : "—") },
  { label: "支付方式", render: ({ ch }) => ch.payMethods.join(" / ") },
  { label: "最低充值", render: ({ ch }) => `¥${ch.minTopup}`, best: { value: ({ ch }) => ch.minTopup, prefer: "min" } },
  { label: "评分", render: ({ ch }) => ch.rating.toFixed(1), best: { value: ({ ch }) => ch.rating, prefer: "max" } },
];

function winners(cols: Col[], best: NonNullable<Row["best"]>) {
  const values = cols.map(best.value);
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2 || new Set(valid).size === 1) return new Set<number>();
  const target = best.prefer === "max" ? Math.max(...valid) : Math.min(...valid);
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}

export default async function ComparePage(props: PageProps<"/compare">) {
  const { ids } = await props.searchParams;
  const requested = (Array.isArray(ids) ? ids.join(",") : (ids ?? "")).split(",").filter(Boolean);
  const cols: Col[] = (await getOfferingsWithChannel([...new Set(requested)].slice(0, 4))).map(({ o, ch }) => ({ o, ch }));
  const entries = cols.map(({ o, ch }) => ({ id: o.id, channel: ch.name, group: o.group }));
  const without = (id: string) => `/compare?ids=${cols.filter((c) => c.o.id !== id).map((c) => c.o.id).join(",")}`;

  if (cols.length < 2) {
    const top = await getTopOfferingIds(3);
    return (
      <div className="mx-auto max-w-[560px] px-5 py-32 text-center">
        <CompareSync entries={entries} />
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">至少选择 2 份货</h1>
        <p className="mt-3 text-fg-2">在列表中点 + 加入对比，最多 4 份。</p>
        <div className="mt-8 flex justify-center gap-2">
          <Link href="/" className="btn btn-secondary">
            去挑选
          </Link>
          <Link href={`/compare?ids=${top.join(",")}`} className="btn btn-primary">
            对比前 3 名
          </Link>
        </div>
      </div>
    );
  }

  const grid = { gridTemplateColumns: `140px repeat(${cols.length}, minmax(180px, 1fr))` };

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-12">
      <CompareSync entries={entries} />
      <Link href="/" className="text-[13px] text-fg-3 hover:text-fg">
        ← 下游货
      </Link>
      <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em]">对比</h1>

      <div className="card scroll-x mt-8">
        <div className="min-w-max text-[14px]">
          <div className="grid border-b border-line" style={grid}>
            <div />
            {cols.map(({ o, ch }) => (
              <div key={o.id} className="px-4 py-4">
                <Link href={`/channels/${ch.slug}#${o.id}`} className="font-medium hover:underline">
                  {ch.name}
                </Link>
                <p className="mt-0.5 truncate text-[13px] text-fg-3">{o.group}</p>
                <Link href={without(o.id)} className="mt-2 inline-block text-[12px] text-fg-3 hover:text-fg">
                  移除
                </Link>
              </div>
            ))}
          </div>
          {ROWS.map((row) => {
            const win = row.best ? winners(cols, row.best) : new Set<number>();
            return (
              <div key={row.label} className="grid border-b border-line last:border-0" style={grid}>
                <div className="px-4 py-3 text-fg-3">{row.label}</div>
                {cols.map((c, i) => (
                  <div key={c.o.id} className={`tnum flex items-center gap-2 px-4 py-3 ${win.has(i) ? "font-semibold text-fg" : "text-fg-2"}`}>
                    {row.render(c)}
                    {win.has(i) && <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-label="最优" />}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-[13px] text-fg-3">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" /> 该项最优
      </p>
    </div>
  );
}
