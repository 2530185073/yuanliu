import Link from "next/link";
import { getModel } from "@/lib/catalog";
import { channelOf, offeringsForSupply } from "@/lib/data";
import { FX, ms, pct, stamp, yuan } from "@/lib/format";
import { encodeBars, ERROR_LABEL } from "@/lib/probe";
import { getSupplier, getSupply } from "@/lib/supply";
import type { Channel, Offering } from "@/lib/types";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { PRICE_SOURCE_LABEL } from "@/components/offer/OfferingCard";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { MysteryStamp, VerifyStamp } from "@/components/ui/Stamp";
import { availabilityTone, latencyTone, Pill, RiskTag, SceneTag, SourceTag } from "@/components/ui/Tags";
import { UptimeBars } from "@/components/ui/UptimeBars";

export function OfferingBlock({ offering: o, channel }: { offering: Offering; channel: Channel }) {
  const latest = o.probe.latest;
  const supply = o.cluster ? getSupply(o.cluster.supplyId) : undefined;
  const peers = o.cluster ? offeringsForSupply(o.cluster.supplyId).filter((p) => p.id !== o.id) : [];

  return (
    <article id={o.id} className="panel scroll-mt-48 rounded-md md:scroll-mt-40">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {o.sponsored && <Pill tone="signal">赞助</Pill>}
            <h3 className="font-display text-[22px] font-black leading-tight">{o.group}</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SourceTag type={o.sourceType} />
            {o.scenes.map((s) => (
              <SceneTag key={s}>{s}</SceneTag>
            ))}
            {o.risks.map((r) => (
              <RiskTag key={r}>{r}</RiskTag>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="num text-[30px] font-semibold leading-none">
              {yuan(o.daoPrice)}
              <span className="ml-1 text-[13px] font-normal text-ink-3">/刀</span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-3">约官方 {((o.daoPrice / FX) * 10).toFixed(2)} 折</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreDial score={o.score} size={58} />
            <CompareToggle id={o.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-rule text-[12.5px] md:grid-cols-3">
        <div className="bg-card px-5 py-3">
          <p className="text-ink-3">站点宣称</p>
          <p className="mt-1 font-semibold text-ink-2">「{o.claimedText}」</p>
        </div>
        <div className="bg-card px-5 py-3">
          <p className="text-ink-3">生效倍率 · {PRICE_SOURCE_LABEL[o.multiplierSource]}</p>
          <p className="num mt-1 font-semibold">
            {o.effective}
            {o.measured !== null && o.claimed !== null && o.measured !== o.claimed && (
              <span className={o.measured > o.claimed * 1.08 ? "text-bad" : "text-ink-3"}>（宣称 {o.claimed}）</span>
            )}
          </p>
        </div>
        <div className="bg-card px-5 py-3">
          <p className="text-ink-3">充值比例</p>
          <p className="num mt-1 font-semibold">
            {channel.rechargeText} <span className="font-normal text-ink-3">→ 刀价 {yuan(o.daoPrice)}</span>
          </p>
        </div>
      </div>

      <div className="scroll-x">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-y border-rule text-left text-[11.5px] text-ink-3">
              <th className="px-5 py-2.5 font-medium">模型</th>
              <th className="px-3 py-2.5 text-right font-medium">官方 $ 入 / 出</th>
              <th className="px-3 py-2.5 text-right font-medium">真实 ¥ 输入</th>
              <th className="px-3 py-2.5 text-right font-medium">真实 ¥ 输出</th>
              <th className="px-3 py-2.5 text-right font-medium">缓存读</th>
              <th className="px-3 py-2.5 text-right font-medium">首字</th>
              <th className="px-5 py-2.5 text-right font-medium">吐字</th>
            </tr>
          </thead>
          <tbody>
            {o.quotes.map((q) => {
              const m = getModel(q.modelId);
              return (
                <tr key={q.modelId} className="border-b border-rule/60 last:border-0">
                  <td className="px-5 py-2.5">
                    <Link href={`/models/${q.modelId}`} className="num font-semibold hover:text-signal">
                      {q.modelId}
                    </Link>
                    {q.primary && <span className="ml-2 text-[11px] text-ink-3">主探测</span>}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-3">
                    ${m.input} / ${m.output}
                  </td>
                  <td className="num px-3 py-2.5 text-right">{yuan(q.realInput)}</td>
                  <td className="num px-3 py-2.5 text-right font-semibold">{yuan(q.realOutput)}</td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">{yuan(q.realCache)}</td>
                  <td className="num px-3 py-2.5 text-right" style={{ color: latencyTone(q.ttftMs) }}>
                    {ms(q.ttftMs)}
                  </td>
                  <td className="num px-5 py-2.5 text-right">{q.tps} t/s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-rule p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <p className="text-ink-3">
            最近 24 小时 · 每 20 分钟一格 · 24h{" "}
            <span className="num font-semibold" style={{ color: availabilityTone(o.probe.h24) }}>
              {o.probe.excludedReason ? "暂停计入" : pct(o.probe.h24)}
            </span>{" "}
            · 7 日 <span className="num font-semibold text-ink">{pct(o.probe.d7)}</span> · p95 首字 <span className="num text-ink">{ms(o.probe.p95)}</span>
          </p>
          <p className="num text-ink-3">
            最近检测 {stamp(latest.checkedAt)} ·{" "}
            {latest.ok ? (
              <span className="text-ok">成功 {ms(latest.ttftMs)}</span>
            ) : (
              <span className={latest.errorClass === "key" || latest.errorClass === "config" ? "text-mute" : "text-bad"}>
                {latest.errorClass ? ERROR_LABEL[latest.errorClass] : "失败"}
              </span>
            )}
          </p>
        </div>
        <UptimeBars bars={encodeBars(o.probe.curve)} height={30} className="mt-3" />
        {!latest.ok && latest.error && (
          <p className="num mt-3 rounded-sm bg-paper px-3 py-2 text-[12px] text-ink-2">
            <span className="text-ink-3">原始错误：</span>
            {latest.error}
            {o.probe.excludedReason && <span className="text-ink-3"> · 已通知站长修复探测密钥，恢复前不计入可用率</span>}
          </p>
        )}
      </div>

      <div className="grid gap-px border-t border-rule bg-rule md:grid-cols-[1.2fr_1fr]">
        <div className="bg-card p-5">
          <p className="text-[12px] text-ink-3">综合分构成</p>
          <div className="mt-3 space-y-2">
            {o.scoreParts.map((p) => (
              <div key={p.label} className="flex items-center gap-3 text-[12px]">
                <span className="w-20 shrink-0 text-ink-2">{p.label}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${(p.value / p.max) * 100}%` }} />
                </span>
                <span className="num w-16 shrink-0 text-right text-ink-3">
                  {p.value}/{p.max}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-card p-5 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-2">
            <VerifyStamp status={o.verification.status} stale={o.verification.stale} />
            {o.verification.mystery && <MysteryStamp />}
            <a href="#verify" className="ml-auto font-semibold text-ink underline-offset-4 hover:underline">
              验真报告 ↓
            </a>
          </div>
          <div className="rounded-sm border border-dashed border-rule p-3 leading-relaxed text-ink-2">
            <p className="font-semibold text-ink">货源追溯</p>
            {o.cluster && supply ? (
              o.cluster.disclosed ? (
                <p className="mt-1">
                  站长已公开货源：
                  <Link href={`/supply/offers/${supply.id}`} className="font-semibold text-source underline-offset-4 hover:underline">
                    {getSupplier(supply.supplierId)?.name} · {supply.title}
                  </Link>
                </p>
              ) : peers.length === 0 ? (
                <p className="mt-1">
                  同源推断：响应指纹与货源广场中的 1 份上游货一致（置信 <span className="num">{o.cluster.confidence}%</span>）。上游名称需站长授权后公开。
                </p>
              ) : (
                <p className="mt-1">
                  同源推断：响应指纹与另外 <b className="num">{peers.length}</b> 份下游货一致（置信 <span className="num">{o.cluster.confidence}%</span>）
                  {peers.length > 0 && (
                    <>
                      ，包括{" "}
                      {peers.slice(0, 3).map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && "、"}
                          <Link href={`/channels/${p.channelSlug}#${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                            {channelOf(p).name}
                          </Link>
                        </span>
                      ))}
                    </>
                  )}
                  。上游名称需站长授权后公开。
                </p>
              )
            ) : (
              <p className="mt-1 text-ink-3">暂未发现同源货，指纹比对每 6 小时更新一次。</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
