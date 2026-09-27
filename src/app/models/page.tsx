import type { Metadata } from "next";
import Link from "next/link";
import { FAMILIES, MODELS } from "@/lib/catalog";
import { compareRows } from "@/lib/data";
import { FX, yuan } from "@/lib/format";
import { percentile } from "@/lib/probe";

export const metadata: Metadata = { title: "按模型比价" };

const VERIFY_COLOR = { pass: "var(--color-ok)", warn: "var(--color-warn)", fail: "var(--color-bad)" } as const;

/** 横轴：相当于官方价的几折，对数刻度 0.01 折 ~ 10 折 */
const foldToX = (fold: number) => ((Math.log10(Math.max(fold, 0.01)) + 2) / 3) * 100;

export default async function ModelsPage(props: PageProps<"/models">) {
  const { family } = await props.searchParams;
  const active = FAMILIES.find((f) => f.id === family)?.id ?? "all";
  const families = FAMILIES.filter((f) => active === "all" || f.id === active);

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-12">
      <p className="eyebrow">按模型比价</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[40px] font-black leading-tight md:text-[52px]">我要用这个模型，哪家最划算？</h1>
        <p className="max-w-md text-[14px] leading-relaxed text-ink-2">
          每个模型的所有在售货，按真实单价（人民币 / 百万 token）排序。横条上的每个点是一份货，越靠左越便宜，颜色代表验真结果。
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b-2 border-ink pb-4">
        <Link href="/models" className="chip" data-on={active === "all"}>
          全部
        </Link>
        {FAMILIES.map((f) => (
          <Link key={f.id} href={`/models?family=${f.id}`} className="chip" data-on={active === f.id}>
            {f.label}
          </Link>
        ))}
      </div>

      {families.map((f) => {
        const models = MODELS.filter((m) => m.family === f.id);
        return (
          <section key={f.id} className="mt-10">
            <h2 className="font-display text-[24px] font-black">{f.label}</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {models.map((model, i) => {
                const rows = compareRows(model.id);
                const live = rows.filter((r) => !r.excluded);
                const cheapest = [...live].sort((a, b) => a.output - b.output)[0];
                const mid = percentile(live.map((r) => r.output), 50);
                return (
                  <Link
                    key={model.id}
                    href={`/models/${model.id}`}
                    className="panel card-hover rise group flex flex-col rounded-md p-5"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between text-[12px] text-ink-3">
                      <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 font-semibold text-ink-2">{model.tier}</span>
                      <span className="num">{model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`} 上下文</span>
                    </div>
                    <h3 className="num mt-3 text-[24px] font-semibold tracking-tight group-hover:text-signal">{model.id}</h3>
                    <p className="num mt-1 text-[12.5px] text-ink-3">
                      官方 ${model.input} / ${model.output} 每百万 token（约 {yuan(model.output * FX)} 输出）
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-y border-dashed border-rule py-3">
                      <div>
                        <p className="text-[11.5px] text-ink-3">在售</p>
                        <p className="num mt-0.5 text-[18px] font-semibold">{rows.length} 份</p>
                      </div>
                      <div>
                        <p className="text-[11.5px] text-ink-3">最低输出价</p>
                        <p className="num mt-0.5 text-[18px] font-semibold text-signal">{cheapest ? yuan(cheapest.output) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11.5px] text-ink-3">中位输出价</p>
                        <p className="num mt-0.5 text-[18px] font-semibold">{mid !== null ? yuan(mid) : "—"}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="relative h-7">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                        {[0.1, 1].map((t) => (
                          <div key={t} className="absolute top-1 h-5 w-px bg-rule" style={{ left: `${foldToX(t)}%` }} />
                        ))}
                        <div className="absolute top-0 h-7 w-[2px] bg-ink" style={{ left: `calc(${foldToX(10)}% - 2px)` }} />
                        {rows.map((r) => (
                          <span
                            key={r.id}
                            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card"
                            style={{ left: `${foldToX(r.fold)}%`, background: r.excluded ? "var(--color-mute)" : VERIFY_COLOR[r.verify] }}
                          />
                        ))}
                      </div>
                      <div className="num mt-1 flex justify-between text-[10.5px] text-ink-3">
                        <span>0.01 折</span>
                        <span>0.1 折</span>
                        <span>1 折</span>
                        <span className="text-ink">官方价</span>
                      </div>
                    </div>

                    <p className="mt-4 text-[12.5px] text-ink-3">
                      {cheapest ? (
                        <>
                          最便宜：<span className="font-semibold text-ink-2">{cheapest.channelName}</span> · {cheapest.group}
                        </>
                      ) : (
                        "暂无可用的在售货"
                      )}
                      <span className="float-right font-semibold text-ink group-hover:text-signal">查看比价 →</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
