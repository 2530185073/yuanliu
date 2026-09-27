import Link from "next/link";
import { notFound } from "next/navigation";
import { familyLabel } from "@/lib/catalog";
import { CHANNELS, getChannel } from "@/lib/data";
import { ago, duration, ms, pct, stamp, yuan } from "@/lib/format";
import { ERROR_LABEL } from "@/lib/probe";
import { hash } from "@/lib/rand";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { UptimeHeatmap } from "@/components/charts/UptimeHeatmap";
import { CheckGrid } from "@/components/offer/CheckGrid";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProtoButton, ProtoModal } from "@/components/ui/Proto";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { SectionNav } from "@/components/ui/SectionNav";
import { MysteryStamp, VerifyStamp } from "@/components/ui/Stamp";
import { availabilityTone, latencyTone } from "@/components/ui/Tags";
import { OfferingBlock } from "./OfferingBlock";

export function generateStaticParams() {
  return CHANNELS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/channels/[slug]">) {
  const { slug } = await props.params;
  const ch = getChannel(slug);
  return { title: ch ? `${ch.name} · 渠道详情` : "渠道不存在" };
}

export default async function ChannelPage(props: PageProps<"/channels/[slug]">) {
  const { slug } = await props.params;
  const ch = getChannel(slug);
  if (!ch) notFound();

  const offerings = [...ch.offerings].sort((a, b) => b.score - a.score);
  const live = offerings.filter((o) => !o.probe.excludedReason);
  const best = live[0] ?? offerings[0];
  const cheapest = [...offerings].sort((a, b) => a.daoPrice - b.daoPrice)[0];
  const passCount = offerings.filter((o) => o.verification.status === "pass").length;
  const hasMystery = offerings.some((o) => o.verification.mystery);
  const incidents = offerings
    .flatMap((o) => o.probe.incidents.map((i) => ({ ...i, group: o.group })))
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
    .slice(0, 10);
  const events = offerings
    .flatMap((o) => o.history.map((h) => ({ ...h, group: o.group, key: `${o.id}-${h.at}` })))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const code = `YL-${slug.slice(0, 4).toUpperCase()}-${(hash(slug) % 1_000_000).toString(36).toUpperCase().padStart(4, "0")}`;
  const badgeUptime = best.probe.d7 ?? best.probe.h24;
  const badgeSnippet = `<a href="https://yuanliu.example/channels/${slug}"><img src="https://yuanliu.example/badge/${slug}.svg" alt="源流监控"></a>`;

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-10">
      <nav className="text-[13px] text-ink-3">
        <Link href="/" className="link-underline hover:text-ink">
          下游货
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{ch.name}</span>
      </nav>

      <header className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="rise">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            {ch.claimed ? (
              <span className="rounded-sm bg-ok-soft px-2 py-0.5 font-semibold text-ok">● 站长已认领</span>
            ) : (
              <span className="rounded-sm bg-paper-2 px-2 py-0.5 font-semibold text-ink-3">○ 平台收录 · 未认领</span>
            )}
            <span className="rounded-sm border border-rule px-2 py-0.5 text-ink-2">系统 {ch.system}</span>
            <span className="rounded-sm border border-rule px-2 py-0.5 text-ink-2">收录 {ch.ageDays} 天</span>
            {ch.invoice && <span className="rounded-sm border border-ok px-2 py-0.5 font-semibold text-ok">支持发票</span>}
            {ch.families.map((f) => (
              <span key={f} className="rounded-sm border border-rule px-2 py-0.5 text-ink-2">
                {familyLabel(f)}
              </span>
            ))}
          </div>
          <h1 className="mt-4 font-display text-[44px] font-black leading-none md:text-[60px]">{ch.name}</h1>
          <p className="num mt-3 text-[14px] text-ink-3">
            <a href={ch.siteUrl} target="_blank" rel="noreferrer nofollow" className="link-underline text-ink-2 hover:text-ink">
              {ch.domain} ↗
            </a>
            {ch.tagline && <span className="ml-3 font-sans text-ink-2">「{ch.tagline}」</span>}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ProtoModal className="btn btn-ink" label="关注提醒" title={`关注 ${ch.name}`} subtitle="选择要接收的事件和通知方式">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {["宕机 / 恢复", "涨价 / 降价", "验真结果变化", "疑似跑路预警", "新福利上架", "新分组上架"].map((e, i) => (
                    <label key={e} className="flex items-center gap-2 rounded-md border border-rule px-3 py-2">
                      <input type="checkbox" defaultChecked={i < 4} /> {e}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["邮件", "Telegram", "飞书", "企业微信", "Webhook"].map((c, i) => (
                    <span key={c} className="chip" data-on={i < 2}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </ProtoModal>
            {offerings.length > 1 && (
              <Link href={`/compare?ids=${offerings.slice(0, 4).map((o) => o.id).join(",")}`} className="btn btn-line">
                对比本站 {Math.min(offerings.length, 4)} 份货
              </Link>
            )}
            <a href={ch.siteUrl} target="_blank" rel="noreferrer nofollow" className="btn btn-line">
              访问站点 ↗
            </a>
            <ProtoModal className="btn btn-ghost" label="举报" title="举报这个渠道" subtitle="查实后会公开标注，并通知关注者">
              <div className="grid grid-cols-2 gap-2">
                {["跑路 / 无法使用", "降智 / 掺假", "倍率与宣称不符", "扣费异常", "盗刷 / 违规货源", "其他"].map((e) => (
                  <label key={e} className="flex items-center gap-2 rounded-md border border-rule px-3 py-2">
                    <input type="radio" name="report" /> {e}
                  </label>
                ))}
              </div>
            </ProtoModal>
          </div>
        </div>
        <div className="panel rise flex items-center gap-5 self-start rounded-md p-5" style={{ "--i": 2 } as React.CSSProperties}>
          <ScoreDial score={ch.score} size={96} />
          <div>
            <p className="text-[12px] text-ink-3">综合分 · 取在售货最高分</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <VerifyStamp status={best.verification.status} size="lg" stale={best.verification.stale} />
              {hasMystery && <MysteryStamp />}
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="在售货" value={`${offerings.length} 份`} sub={`${offerings.reduce((s, o) => s + o.quotes.length, 0)} 个模型报价`} />
        <Kpi label="最低刀价" value={yuan(cheapest.daoPrice)} sub={cheapest.group} accent />
        <Kpi label="最佳 24h 可用率" value={best.probe.excludedReason ? "暂停计入" : pct(best.probe.h24)} sub={best.group} color={availabilityTone(best.probe.h24)} />
        <Kpi label="最佳首字 p50" value={ms(best.probe.p50)} sub={`p95 ${ms(best.probe.p95)}`} color={latencyTone(best.probe.p50)} />
        <Kpi label="验真通过" value={`${passCount} / ${offerings.length}`} sub={hasMystery ? "含平台自购实测" : "仅站长探测 Key"} />
      </div>

      <SectionNav
        items={[
          { id: "offerings", label: "在售的货", count: offerings.length },
          { id: "stability", label: "稳定性" },
          { id: "verify", label: "验真报告" },
          { id: "changelog", label: "价格变动", count: events.length },
          { id: "reviews", label: "用户评价", count: ch.reviewCount },
        ]}
      />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          <section id="offerings" className="scroll-mt-48 md:scroll-mt-40">
            <SectionTitle eyebrow="OFFERINGS" title="在售的货" hint="每个分组单独探测、单独报价；价格已按充值比例折算" />
            <div className="mt-5 space-y-6">
              {offerings.map((o) => (
                <OfferingBlock key={o.id} offering={o} channel={ch} />
              ))}
            </div>
          </section>

          <section id="stability" className="scroll-mt-48 md:scroll-mt-40">
            <SectionTitle eyebrow="STABILITY" title="稳定性" hint="只有站点自身的故障计入可用率；探测密钥或配置问题单独标注" />
            <div className="panel mt-5 rounded-md p-5">
              <p className="text-[13px] font-semibold">30 日可用率</p>
              <div className="mt-4">
                <UptimeHeatmap rows={offerings.map((o) => ({ label: o.group, days: o.probe.daily, d30: o.probe.d30 }))} />
              </div>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {offerings.map((o) => (
                <div key={o.id} className="panel rounded-md p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] font-semibold">{o.group}</p>
                    <p className="num shrink-0 text-[12px] text-ink-3">
                      p50 {ms(o.probe.p50)} · p95 {ms(o.probe.p95)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">24h 首字延迟（对数刻度），红色为站点故障，灰色为不计入的密钥问题</p>
                  <div className="mt-3">
                    <LatencyChart curve={o.probe.curve} />
                  </div>
                </div>
              ))}
            </div>
            <div className="panel mt-5 rounded-md">
              <p className="border-b border-rule px-5 py-3 text-[13px] font-semibold">故障时间线</p>
              {incidents.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-ink-3">最近 30 天没有记录到故障。</p>
              ) : (
                <ol className="divide-y divide-rule/70">
                  {incidents.map((inc) => (
                    <li key={inc.id} className="grid gap-2 px-5 py-3 text-[13px] md:grid-cols-[130px_120px_1fr_auto] md:items-center">
                      <span className="num text-ink-3">{stamp(inc.start)}</span>
                      <span>
                        <span className={`rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${inc.counted ? "bg-bad-soft text-bad" : "bg-mute-soft text-mute"}`}>{ERROR_LABEL[inc.kind]}</span>
                      </span>
                      <span className="min-w-0 text-ink-2">
                        <span className="font-semibold text-ink">{inc.group}</span> · {inc.summary}
                      </span>
                      <span className="num text-right text-[12px] text-ink-3">
                        {inc.end ? duration(inc.minutes) : `进行中 · 已 ${duration(inc.minutes)}`}
                        {!inc.counted && " · 不计入"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section id="verify" className="scroll-mt-48 md:scroll-mt-40">
            <SectionTitle eyebrow="VERIFICATION" title="验真报告" hint="9 项检查；原始样本只追加不删改，任何人工剔除都会在这里留痕" />
            <div className="mt-5 space-y-4">
              {offerings.map((o, idx) => (
                <details key={o.id} className="panel group rounded-md" open={idx === 0 || Boolean(o.verification.iqHtml)}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4">
                    <span className="text-[12px] text-ink-3 transition-transform group-open:rotate-90">▶</span>
                    <span className="font-semibold">{o.group}</span>
                    <VerifyStamp status={o.verification.status} stale={o.verification.stale} />
                    {o.verification.mystery && <MysteryStamp />}
                    <span className="num ml-auto text-[12px] text-ink-3">
                      验真分 {o.verification.score} · {o.verification.stale ? "密钥异常，沿用" : ""}
                      {ago(o.verification.checkedAt)}检测
                    </span>
                  </summary>
                  <div className="border-t border-rule p-5">
                    <CheckGrid checks={o.verification.checks} />
                    {o.verification.iqHtml && (
                      <div className="mt-5">
                        <p className="text-[13px] font-semibold">可视化智商检测 · 鹈鹕骑自行车</p>
                        <p className="mt-0.5 text-[12px] text-ink-3">模型 {o.quotes[0].modelId} 的原始输出，在隔离的沙盒中渲染（禁止脚本）。</p>
                        <iframe
                          title={`${o.group} 智商检测`}
                          src={o.verification.iqHtml}
                          sandbox=""
                          loading="lazy"
                          className="mt-3 aspect-[16/9] w-full rounded-md border border-rule bg-card"
                        />
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section id="changelog" className="scroll-mt-48 md:scroll-mt-40">
            <SectionTitle eyebrow="CHANGELOG" title="价格与公告变动" hint="倍率、充值比例、分组说明的每一次变化都会记录" />
            <ol className="panel mt-5 divide-y divide-rule/70 rounded-md">
              {events.map((e) => (
                <li key={e.key} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                  <span className="num w-28 text-ink-3">{stamp(e.at)}</span>
                  <span className="font-semibold">{e.group}</span>
                  <span className="num text-ink-2">{e.text}</span>
                  {e.delta !== null && (
                    <span className={`num ml-auto rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${e.delta <= 0 ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
                      {e.delta <= 0 ? "降价" : "涨价"} {Math.abs(e.delta * 100).toFixed(1)}%
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section id="reviews" className="scroll-mt-48 md:scroll-mt-40">
            <SectionTitle eyebrow="REVIEWS" title="用户评价" hint="仅登录用户可评价，同一账号每月 1 次；站长可公开回复" />
            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
              <div className="panel rounded-md p-5">
                <p className="num text-[44px] font-semibold leading-none">{ch.rating.toFixed(1)}</p>
                <p className="mt-2 text-[16px] tracking-widest text-signal">{"★★★★★".slice(0, Math.round(ch.rating))}<span className="text-rule">{"★★★★★".slice(Math.round(ch.rating))}</span></p>
                <p className="mt-1 text-[12px] text-ink-3">{ch.reviewCount} 条评价</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ch.ratingTags.slice(0, 8).map((t) => (
                    <span key={t.tag} className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[12px] text-ink-2">
                      {t.tag} <span className="num text-ink-3">{t.count}</span>
                    </span>
                  ))}
                </div>
                <ProtoModal className="btn btn-line mt-5 w-full" label="写评价" title={`评价 ${ch.name}`} subtitle="评价需要登录，且会显示你在该站的使用时长">
                  <textarea className="h-28 w-full rounded-md border border-rule bg-paper p-3 outline-none focus:border-ink" placeholder="说说稳定性、速度、客服和计费……" />
                </ProtoModal>
              </div>
              <ul className="space-y-4">
                {ch.reviews.map((r) => (
                  <li key={`${r.author}-${r.at}`} className="panel rounded-md p-5">
                    <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                      <span className="font-semibold">{r.author}</span>
                      <span className="text-signal">{"★".repeat(r.rating)}</span>
                      {r.tags.map((t) => (
                        <span key={t} className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-ink-2">
                          {t}
                        </span>
                      ))}
                      <span className="ml-auto text-ink-3">{ago(r.at)}</span>
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{r.text}</p>
                    {r.reply && (
                      <p className="mt-3 border-l-2 border-ink pl-3 text-[13px] text-ink-2">
                        <span className="font-semibold text-ink">站长回复：</span>
                        {r.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-[164px] lg:self-start">
          <div className="panel rounded-md">
            <p className="border-b border-rule px-5 py-3 text-[13px] font-semibold">站点信息</p>
            <dl className="divide-y divide-rule/70 text-[13px]">
              <Info label="站点地址" value={ch.domain} mono />
              <Info label="系统" value={ch.system} />
              <Info label="充值比例" value={ch.rechargeText} mono />
              <Info label="最低充值" value={`¥${ch.minTopup}`} mono />
              <Info label="支付方式" value={ch.payMethods.join(" / ")} />
              <Info label="发票" value={ch.invoice ? "支持" : "不支持"} />
              <Info label="首次收录" value={ch.firstSeen.slice(0, 10)} mono />
              <div className="flex items-center justify-between gap-3 px-5 py-2.5">
                <dt className="text-ink-3">联系方式</dt>
                <dd className="relative">
                  <span className="select-none blur-[5px]">{ch.contact}</span>
                  <ProtoButton className="absolute inset-0 text-[12px] font-semibold text-ink" message="登录后可查看站长联系方式，查看记录会同步给站长。">
                    登录后可见
                  </ProtoButton>
                </dd>
              </div>
            </dl>
          </div>

          {ch.welfare.length > 0 && (
            <div className="panel overflow-hidden rounded-md">
              <p className="flex items-center justify-between bg-signal px-5 py-3 text-[13px] font-semibold text-card">
                福利 <span className="font-mono text-[11px] tracking-widest">PERKS</span>
              </p>
              <ul className="divide-y divide-rule/70">
                {ch.welfare.map((w) => (
                  <li key={w.kind} className="px-5 py-4">
                    <p className="text-[14px] font-semibold">{w.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{w.detail}</p>
                    {w.kind === "code" ? (
                      <ProtoModal className="btn btn-ink mt-3 h-9 w-full" label={`领取兑换码 · 剩余 ${w.remaining}`} title="兑换码领取成功" subtitle="请到站点注册后，在钱包页兑换">
                        <div className="rounded-md border-2 border-dashed border-ink bg-paper p-4 text-center">
                          <p className="num text-[24px] font-semibold tracking-[0.12em]">{code}</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <CopyButton text={code} label="复制兑换码" className="btn btn-line flex-1" />
                          <a href={ch.siteUrl} target="_blank" rel="noreferrer nofollow" className="btn btn-ink flex-1">
                            前往注册 ↗
                          </a>
                        </div>
                        <p className="mt-3 text-[12px] text-ink-3">每个账号、每台设备限领 1 次；兑换码 7 天内有效。领取记录会同步给站长，用于核销统计。</p>
                      </ProtoModal>
                    ) : (
                      <ProtoButton className="btn btn-line mt-3 h-9 w-full" message="将带推广参数跳转到站点注册页，推广链接会在页面上明确标注。">
                        去注册 ↗
                      </ProtoButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel rounded-md p-5">
            <p className="text-[13px] font-semibold">状态徽章</p>
            <p className="mt-1 text-[12px] text-ink-3">站长可挂在自己站点上，实时显示 7 日可用率。</p>
            <div className="mt-3 inline-flex overflow-hidden rounded-sm font-mono text-[11px] leading-5">
              <span className="bg-ink px-2 text-card">源流监控</span>
              <span className="px-2 text-card" style={{ background: availabilityTone(badgeUptime) }}>
                {badgeUptime === null ? "—" : `${badgeUptime}%`}
              </span>
            </div>
            <pre className="num mt-3 overflow-x-auto rounded-sm bg-paper p-2 text-[10.5px] leading-relaxed text-ink-2">{badgeSnippet}</pre>
            <CopyButton text={badgeSnippet} label="复制嵌入代码" className="mt-2 text-[12px] font-semibold text-ink underline-offset-4 hover:underline" />
          </div>

          {!ch.claimed && (
            <div className="rounded-md border-2 border-dashed border-ink p-5">
              <p className="font-display text-[17px] font-black">这是你的站？</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">认领后可以补充分组说明、设置探测 Key、回复评价、上传福利码，还能看到曝光与点击数据。</p>
              <ProtoModal className="btn btn-ink mt-4 w-full" label="认领这个渠道" title={`认领 ${ch.name}`} subtitle="任选一种方式证明你是站点所有者">
                <ol className="space-y-3">
                  <li className="rounded-md border border-rule p-3">
                    <p className="font-semibold">方式一：DNS TXT 记录</p>
                    <p className="num mt-1 text-[12px] text-ink-3">_yuanliu.{ch.domain} TXT &quot;yl-verify={code.toLowerCase()}&quot;</p>
                  </li>
                  <li className="rounded-md border border-rule p-3">
                    <p className="font-semibold">方式二：站点公告</p>
                    <p className="mt-1 text-[12px] text-ink-3">在站点首页公告中临时放入验证码 {code}，验证通过后即可删除。</p>
                  </li>
                </ol>
              </ProtoModal>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, hint }: { eyebrow: string; title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 font-display text-[28px] font-black leading-none">{title}</h2>
      </div>
      <p className="text-[12.5px] text-ink-3">{hint}</p>
    </div>
  );
}

function Kpi({ label, value, sub, accent, color }: { label: string; value: string; sub: string; accent?: boolean; color?: string }) {
  return (
    <div className="min-w-0 bg-card px-5 py-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={`num mt-1 text-[24px] font-semibold leading-none ${accent ? "text-signal" : ""}`} style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11.5px] text-ink-3">{sub}</p>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className={`text-right font-semibold ${mono ? "num" : ""}`}>{value}</dd>
    </div>
  );
}
