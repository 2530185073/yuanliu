import Link from "next/link";
import { notFound } from "next/navigation";
import { ago, duration, ms, pct, stamp, yuan } from "@/lib/format";
import { ERROR_LABEL } from "@/lib/probe";
import { hash } from "@/lib/rand";
import { getChannelView } from "@/server/repo";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { UptimeHeatmap } from "@/components/charts/UptimeHeatmap";
import { CheckMatrix } from "@/components/offer/CheckMatrix";
import { availabilityTone, latencyTone, Stat } from "@/components/ui/Badges";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProtoButton, ProtoModal } from "@/components/ui/Proto";
import { Tabs } from "@/components/ui/Tabs";
import { OfferingBlock } from "./OfferingBlock";

export async function generateMetadata(props: PageProps<"/channels/[slug]">) {
  const { slug } = await props.params;
  return { title: (await getChannelView(slug))?.name ?? "渠道不存在" };
}

const TABS = [
  { key: "offers", label: "在售" },
  { key: "stability", label: "稳定性" },
  { key: "verify", label: "验真" },
  { key: "reviews", label: "评价" },
];

export default async function ChannelPage(props: PageProps<"/channels/[slug]">) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const ch = await getChannelView(slug);
  if (!ch || !ch.offerings.length) notFound();
  const initialTab = Math.max(0, TABS.findIndex((t) => t.key === sp.tab));

  const offerings = [...ch.offerings].sort((a, b) => b.score - a.score);
  const best = offerings.find((o) => !o.probe.excludedReason) ?? offerings[0];
  const passCount = offerings.filter((o) => o.verification.status === "pass").length;
  const incidents = offerings
    .flatMap((o) => o.probe.incidents.filter((i) => i.counted).map((i) => ({ ...i, group: o.group })))
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
    .slice(0, 6);
  const iqs = offerings.filter((o) => o.verification.iqHtml);
  const code = `YL-${slug.slice(0, 4).toUpperCase()}-${(hash(slug) % 1_000_000).toString(36).toUpperCase().padStart(4, "0")}`;

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-12">
      <Link href="/" className="text-[13px] text-fg-3 hover:text-fg">
        ← 下游货
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{ch.name}</h1>
          <p className="mt-1 text-fg-3">
            {ch.domain} · {ch.system} · 收录 {ch.ageDays} 天{ch.invoice && " · 可开发票"}
          </p>
        </div>
        <div className="flex gap-2">
          <ProtoModal className="btn btn-secondary" label="关注" title={`关注 ${ch.name}`}>
            <div className="space-y-2.5">
              {["宕机与恢复", "价格变动", "验真结果变化"].map((e) => (
                <label key={e} className="flex items-center gap-2.5">
                  <input type="checkbox" defaultChecked className="accent-fg" /> {e}
                </label>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-fg-3">通过邮件或 Telegram 通知</p>
          </ProtoModal>
          <a href={ch.siteUrl} target="_blank" rel="noreferrer nofollow" className="btn btn-primary">
            访问站点 ↗
          </a>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="最低刀价" value={yuan(Math.min(...offerings.map((o) => o.daoPrice)))} />
        <Stat label="24h 可用率" value={best.probe.excludedReason ? "—" : pct(best.probe.h24)} tone={availabilityTone(best.probe.h24)} />
        <Stat label="首字 p50" value={ms(best.probe.p50)} tone={latencyTone(best.probe.p50)} />
        <Stat label="验真通过" value={`${passCount} / ${offerings.length}`} />
      </div>

      {ch.welfare.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-subtle px-4 py-3 text-[13px]">
          <p className="text-fg-2">{ch.welfare.map((w) => w.title).join(" · ")}</p>
          {ch.welfare.some((w) => w.kind === "code") ? (
            <ProtoModal className="font-medium text-fg hover:underline" label="领取兑换码" title="兑换码">
              <div className="rounded-lg bg-subtle py-5 text-center">
                <p className="tnum text-[22px] font-semibold tracking-[0.08em] text-fg">{code}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <CopyButton text={code} label="复制" className="btn btn-secondary flex-1" />
                <a href={ch.siteUrl} target="_blank" rel="noreferrer nofollow" className="btn btn-primary flex-1">
                  去注册
                </a>
              </div>
            </ProtoModal>
          ) : (
            <ProtoButton className="font-medium text-fg hover:underline" message="将跳转到站点注册页。">
              去注册
            </ProtoButton>
          )}
        </div>
      )}

      <div className="mt-12">
        <Tabs tabs={TABS.map((t) => ({ ...t, count: t.key === "offers" ? offerings.length : t.key === "reviews" ? ch.reviewCount : undefined }))} initial={initialTab}>
          <div className="space-y-4">
            {offerings.map((o) => (
              <OfferingBlock key={o.id} offering={o} channel={ch} />
            ))}
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <p className="text-[13px] text-fg-3">30 天可用率</p>
              <div className="mt-4">
                <UptimeHeatmap rows={offerings.map((o) => ({ label: o.group, days: o.probe.daily, d30: o.probe.d30 }))} />
              </div>
            </div>
            <div className="card p-5">
              <p className="text-[13px] text-fg-3">24 小时首字 · {best.group}</p>
              <div className="mt-4">
                <LatencyChart curve={best.probe.curve} />
              </div>
            </div>
            {incidents.length > 0 && (
              <ul className="card divide-y divide-line">
                {incidents.map((inc) => (
                  <li key={inc.id} className="grid grid-cols-[96px_minmax(0,1fr)_auto] gap-4 px-5 py-3 text-[13px]">
                    <span className="tnum text-fg-3">{stamp(inc.start)}</span>
                    <span className="truncate text-fg-2">
                      {inc.group} · {inc.summary}
                    </span>
                    <span className="tnum text-fg-3">{inc.end ? duration(inc.minutes) : "进行中"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <CheckMatrix columns={offerings.map((o) => ({ label: o.group, checks: o.verification.checks }))} />
            {iqs.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {iqs.map((o) => (
                  <figure key={o.id} className="card overflow-hidden">
                    <iframe title={`${o.group} 智商检测`} src={o.verification.iqHtml!} sandbox="" loading="lazy" className="aspect-[16/9] w-full" />
                    <figcaption className="border-t border-line px-4 py-2.5 text-[12px] text-fg-3">
                      {o.group} · {o.quotes[0].modelId} 画的鹈鹕
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <p className="text-[12px] text-fg-3">
              {ERROR_LABEL.key}与{ERROR_LABEL.config}不计入可用率 · 最近检测 {ago(best.verification.checkedAt)}
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="tnum text-[32px] font-semibold tracking-tight">{ch.rating.toFixed(1)}</span>
              <span className="text-fg-3">{ch.reviewCount} 条评价</span>
            </div>
            <ul className="mt-6 divide-y divide-line border-t border-line">
              {ch.reviews.map((r) => (
                <li key={`${r.author}-${r.at}`} className="py-4">
                  <p className="flex items-center gap-3 text-[13px] text-fg-3">
                    <span className="text-fg-2">{r.author}</span>
                    <span className="tnum">{r.rating}.0</span>
                    <span>{ago(r.at)}</span>
                  </p>
                  <p className="mt-1.5 text-fg">{r.text}</p>
                  {r.reply && <p className="mt-2 text-[13px] text-fg-3">站长回复：{r.reply}</p>}
                </li>
              ))}
            </ul>
          </div>
        </Tabs>
      </div>

      <dl className="mt-16 grid grid-cols-2 gap-y-4 border-t border-line pt-6 text-[13px] md:grid-cols-4">
        {[
          ["充值比例", ch.rechargeText],
          ["最低充值", `¥${ch.minTopup}`],
          ["支付方式", ch.payMethods.join(" / ")],
          ["状态", ch.claimed ? "站长已认领" : "平台收录"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-fg-3">{k}</dt>
            <dd className="tnum mt-0.5 text-fg-2">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
