import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { familyLabel } from "@/lib/catalog";
import { channelOf, OFFERINGS } from "@/lib/data";
import { ms, pct, yuan } from "@/lib/format";
import type { Channel, CheckStatus, Offering } from "@/lib/types";
import { CompareSync } from "@/components/compare/CompareSync";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { MysteryStamp, VerifyStamp } from "@/components/ui/Stamp";
import { RiskTag, SourceTag } from "@/components/ui/Tags";

export const metadata: Metadata = { title: "并排对比" };

interface Col {
  o: Offering;
  ch: Channel;
}

interface Row {
  label: string;
  hint?: string;
  render: (c: Col) => ReactNode;
  /** 数值越大越好传 "max"，越小越好传 "min"，用于高亮最优 */
  best?: { value: (c: Col) => number | null; prefer: "max" | "min" };
}

const CHECK_TONE: Record<CheckStatus, string> = { pass: "text-ok", warn: "text-warn", fail: "text-bad", skip: "text-mute" };
const CHECK_ICON: Record<CheckStatus, string> = { pass: "✓", warn: "!", fail: "✕", skip: "…" };

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "价格",
    rows: [
      { label: "刀价", hint: "每 1 美元官方额度", render: ({ o }) => <b className="num text-[18px]">{yuan(o.daoPrice)}</b>, best: { value: ({ o }) => o.daoPrice, prefer: "min" } },
      { label: "主模型", render: ({ o }) => <span className="num">{o.quotes[0].modelId}</span> },
      {
        label: "主模型 ¥/M",
        hint: "输入 · 输出",
        render: ({ o }) => (
          <span className="num">
            {yuan(o.quotes[0].realInput)} · <b>{yuan(o.quotes[0].realOutput)}</b>
          </span>
        ),
        best: { value: ({ o }) => o.quotes[0].realOutput, prefer: "min" },
      },
      { label: "倍率", render: ({ o }) => <span className="num">{o.effective}{o.measured !== null ? "（实测）" : ""}</span> },
      { label: "充值比例", render: ({ ch }) => <span className="num">{ch.rechargeText}</span> },
    ],
  },
  {
    title: "稳定与速度",
    rows: [
      { label: "24h 可用率", render: ({ o }) => (o.probe.excludedReason ? <span className="text-mute">暂停计入</span> : <span className="num">{pct(o.probe.h24)}</span>), best: { value: ({ o }) => (o.probe.excludedReason ? null : o.probe.h24), prefer: "max" } },
      { label: "7 日可用率", render: ({ o }) => <span className="num">{pct(o.probe.d7)}</span>, best: { value: ({ o }) => o.probe.d7, prefer: "max" } },
      { label: "30 日可用率", render: ({ o }) => <span className="num">{pct(o.probe.d30)}</span>, best: { value: ({ o }) => o.probe.d30, prefer: "max" } },
      { label: "首字 p50", render: ({ o }) => <span className="num">{ms(o.probe.p50)}</span>, best: { value: ({ o }) => o.probe.p50, prefer: "min" } },
      { label: "首字 p95", render: ({ o }) => <span className="num">{ms(o.probe.p95)}</span>, best: { value: ({ o }) => o.probe.p95, prefer: "min" } },
      { label: "吐字速度", render: ({ o }) => <span className="num">{o.probe.tps} t/s</span>, best: { value: ({ o }) => o.probe.tps, prefer: "max" } },
    ],
  },
  {
    title: "验真",
    rows: [
      {
        label: "结论",
        render: ({ o }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <VerifyStamp status={o.verification.status} stale={o.verification.stale} />
            {o.verification.mystery && <MysteryStamp />}
          </span>
        ),
      },
      { label: "验真分", render: ({ o }) => <span className="num">{o.verification.score}</span>, best: { value: ({ o }) => o.verification.score, prefer: "max" } },
      {
        label: "风险",
        render: ({ o }) =>
          o.risks.length ? (
            <span className="flex flex-wrap gap-1">
              {o.risks.map((r) => (
                <RiskTag key={r}>{r}</RiskTag>
              ))}
            </span>
          ) : (
            <span className="text-ink-3">无</span>
          ),
      },
    ],
  },
  {
    title: "渠道",
    rows: [
      { label: "支付方式", render: ({ ch }) => ch.payMethods.join(" / ") },
      { label: "发票", render: ({ ch }) => (ch.invoice ? <span className="font-semibold text-ok">支持</span> : <span className="text-ink-3">不支持</span>) },
      { label: "最低充值", render: ({ ch }) => <span className="num">¥{ch.minTopup}</span>, best: { value: ({ ch }) => ch.minTopup, prefer: "min" } },
      { label: "站龄", render: ({ ch }) => <span className="num">{ch.ageDays} 天</span>, best: { value: ({ ch }) => ch.ageDays, prefer: "max" } },
      { label: "用户评分", render: ({ ch }) => <span className="num">{ch.rating.toFixed(1)} · {ch.reviewCount} 条</span>, best: { value: ({ ch }) => ch.rating, prefer: "max" } },
      { label: "福利", render: ({ ch }) => (ch.welfare.length ? ch.welfare.map((w) => w.title).join("、") : <span className="text-ink-3">暂无</span>) },
    ],
  },
];

function bestIndex(cols: Col[], best: NonNullable<Row["best"]>) {
  const values = cols.map(best.value);
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2 || new Set(valid).size === 1) return new Set<number>();
  const target = best.prefer === "max" ? Math.max(...valid) : Math.min(...valid);
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}

export default async function ComparePage(props: PageProps<"/compare">) {
  const { ids } = await props.searchParams;
  const requested = (Array.isArray(ids) ? ids.join(",") : (ids ?? "")).split(",").filter(Boolean);
  const cols: Col[] = requested
    .map((id) => OFFERINGS.find((o) => o.id === id))
    .filter((o): o is Offering => Boolean(o))
    .slice(0, 4)
    .map((o) => ({ o, ch: channelOf(o) }));
  const without = (id: string) => `/compare?ids=${cols.filter((c) => c.o.id !== id).map((c) => c.o.id).join(",")}`;
  const suggestion = [...OFFERINGS].filter((o) => !o.probe.excludedReason).sort((a, b) => b.score - a.score).slice(0, 4);

  if (cols.length < 2) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-20">
        <CompareSync ids={cols.map((c) => c.o.id)} />
        <p className="eyebrow">并排对比</p>
        <h1 className="mt-4 font-display text-[40px] font-black leading-tight">至少选 2 份货再来比。</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">在榜单、比价页或渠道详情里点「对比」，最多可以同时比 4 份。页面底部会出现对比栏。</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/compare?ids=${suggestion.map((o) => o.id).join(",")}`} className="btn btn-ink h-11 px-5">
            直接对比综合分前 4 名 →
          </Link>
          <Link href="/#board" className="btn btn-line h-11 px-5">
            回榜单挑选
          </Link>
        </div>
      </div>
    );
  }

  const pick = (fn: (c: Col) => number | null, prefer: "max" | "min") => {
    const idx = [...bestIndex(cols, { value: fn, prefer })][0];
    return idx === undefined ? null : cols[idx];
  };
  const verdicts = [
    { label: "综合最优", col: pick(({ o }) => o.score, "max") },
    { label: "最便宜", col: pick(({ o }) => o.daoPrice, "min") },
    { label: "首字最快", col: pick(({ o }) => o.probe.p50, "min") },
    { label: "最稳", col: pick(({ o }) => o.probe.d7, "max") },
  ];
  const families = new Set(cols.map((c) => c.o.family));
  const checkKeys = cols[0].o.verification.checks.map((c) => ({ key: c.key, label: c.label }));
  const grid = { gridTemplateColumns: `180px repeat(${cols.length}, minmax(200px, 1fr))` };

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-10">
      <CompareSync ids={cols.map((c) => c.o.id)} />
      <nav className="text-[13px] text-ink-3">
        <Link href="/" className="link-underline hover:text-ink">
          下游货
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">并排对比</span>
      </nav>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[40px] font-black leading-tight md:text-[52px]">
          {cols.length} 份货，<span className="text-signal">一张表</span>看完。
        </h1>
        <p className="max-w-md text-[13.5px] leading-relaxed text-ink-2">
          每一行的最优值会高亮。{families.size > 1 ? `这几份货属于不同模型族（${[...families].map(familyLabel).join("、")}），刀价仍可比较，但单价请结合具体模型看。` : "同一模型族内的比较最有参考价值。"}
        </p>
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        {verdicts.map((v) => (
          <div key={v.label} className="bg-card px-5 py-4">
            <p className="text-[12px] text-ink-3">{v.label}</p>
            <p className="mt-1 truncate font-display text-[19px] font-black">{v.col ? v.col.ch.name : "不相上下"}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">{v.col?.o.group ?? "各项差距不明显"}</p>
          </div>
        ))}
      </div>

      <div className="panel scroll-x mt-8 rounded-md">
        <div className="min-w-max">
          <div className="grid border-b-2 border-ink bg-card" style={grid}>
            <div className="p-4 text-[12px] text-ink-3">对比项</div>
            {cols.map(({ o, ch }) => (
              <div key={o.id} className="border-l border-rule p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/channels/${ch.slug}#${o.id}`} className="font-display text-[18px] font-black hover:text-signal">
                      {ch.name}
                    </Link>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{o.group}</p>
                  </div>
                  <ScoreDial score={o.score} size={44} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <SourceTag type={o.sourceType} />
                  <Link href={without(o.id)} className="text-[12px] text-ink-3 hover:text-bad">
                    移出 ×
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="border-b border-rule bg-paper/70 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-ink-3">{section.title}</div>
              {section.rows.map((row) => {
                const winners = row.best ? bestIndex(cols, row.best) : new Set<number>();
                return (
                  <div key={row.label} className="grid border-b border-rule/70 text-[13px]" style={grid}>
                    <div className="px-4 py-3">
                      <p className="font-semibold text-ink-2">{row.label}</p>
                      {row.hint && <p className="text-[11px] text-ink-3">{row.hint}</p>}
                    </div>
                    {cols.map((c, i) => (
                      <div key={c.o.id} className={`relative border-l border-rule px-4 py-3 ${winners.has(i) ? "bg-ok-soft/70" : ""}`}>
                        {row.render(c)}
                        {winners.has(i) && <span className="absolute right-3 top-3 font-mono text-[10px] tracking-wider text-ok">最优</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
              {section.title === "验真" &&
                checkKeys.map(({ key, label }) => (
                  <div key={key} className="grid border-b border-rule/70 text-[12.5px]" style={grid}>
                    <div className="px-4 py-2.5 pl-7 text-ink-3">{label}</div>
                    {cols.map(({ o }) => {
                      const check = o.verification.checks.find((c) => c.key === key);
                      return (
                        <div key={o.id} className="border-l border-rule px-4 py-2.5">
                          {check ? (
                            <span className={CHECK_TONE[check.status]}>
                              <span className="mr-1.5 font-bold">{CHECK_ICON[check.status]}</span>
                              <span className="num">{check.value}</span>
                            </span>
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {cols.length < 4 && (
        <p className="mt-5 text-[13px] text-ink-3">
          还能再加 {4 - cols.length} 份：回到{" "}
          <Link href="/#board" className="font-semibold text-ink underline-offset-4 hover:underline">
            榜单
          </Link>{" "}
          或{" "}
          <Link href="/models" className="font-semibold text-ink underline-offset-4 hover:underline">
            按模型比价
          </Link>{" "}
          点「对比」。
        </p>
      )}
    </div>
  );
}
