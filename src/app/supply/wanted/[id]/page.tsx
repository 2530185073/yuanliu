import Link from "next/link";
import { notFound } from "next/navigation";
import { familyLabel } from "@/lib/catalog";
import { getChannel } from "@/lib/data";
import { ago, pct, yuan } from "@/lib/format";
import { getSupplier, getSupply, WANTED_POSTS } from "@/lib/supply";
import { ProtoModal } from "@/components/ui/Proto";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { VerifyStamp } from "@/components/ui/Stamp";
import { SceneTag } from "@/components/ui/Tags";

export function generateStaticParams() {
  return WANTED_POSTS.map((w) => ({ id: w.id }));
}

export async function generateMetadata(props: PageProps<"/supply/wanted/[id]">) {
  const { id } = await props.params;
  return { title: WANTED_POSTS.find((w) => w.id === id)?.title ?? "求购不存在" };
}

const STATUS_TONE = { 开放报价: "bg-signal text-card", 洽谈中: "bg-source text-card", 已成交: "bg-paper-2 text-ink-3" } as const;

export default async function WantedPage(props: PageProps<"/supply/wanted/[id]">) {
  const { id } = await props.params;
  const post = WANTED_POSTS.find((w) => w.id === id);
  if (!post) notFound();
  const author = getChannel(post.authorSlug);
  const others = WANTED_POSTS.filter((w) => w.id !== post.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1180px] px-6 pt-10">
      <nav className="text-[13px] text-ink-3">
        <Link href="/supply" className="link-underline hover:text-ink">
          货源广场
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">求购</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-3">
            <span className={`rounded-sm px-2 py-0.5 font-semibold ${STATUS_TONE[post.status]}`}>{post.status}</span>
            <span>{ago(post.postedAt)}发布</span>
            <span className="num">{post.views} 次浏览</span>
          </div>
          <h1 className="mt-3 font-display text-[34px] font-black leading-tight md:text-[44px]">{post.title}</h1>
          <p className="mt-4 text-[15px] leading-[1.9] text-ink-2">{post.detail}</p>

          <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-ink bg-ink sm:grid-cols-4">
            {[
              ["模型", post.models.join(" / ")],
              ["用量", post.volume],
              ["目标价", post.target],
              ["结算", post.settlement],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 bg-card px-5 py-4">
                <dt className="text-[12px] text-ink-3">{k}</dt>
                <dd className={`num mt-1 text-[15px] font-semibold ${k === "目标价" ? "text-signal" : ""}`}>{v}</dd>
              </div>
            ))}
          </dl>

          <div className="panel mt-6 rounded-md p-5">
            <p className="text-[13px] font-semibold">硬性要求</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {post.requirements.map((r) => (
                <li key={r} className="flex items-center gap-2 text-[13.5px] text-ink-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm border-2 border-ink text-[11px] font-bold">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
              <h2 className="font-display text-[26px] font-black">
                报价 <span className="num text-[16px] font-semibold text-ink-3">{post.responses.length}</span>
              </h2>
              {post.status !== "已成交" && (
                <ProtoModal className="btn btn-ink" label="我要报价" title="提交报价" subtitle="只能用已上架、已通过探测的货源报价">
                  <label className="block">
                    <span className="text-[12px] text-ink-3">选择你的货源</span>
                    <select className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-2 outline-none focus:border-ink">
                      <option>（登录后显示你的在架货源）</option>
                    </select>
                  </label>
                  <label className="mt-3 block">
                    <span className="text-[12px] text-ink-3">报价（元 / 刀）</span>
                    <input className="mt-1 h-9 w-full rounded-md border border-rule bg-paper px-3 outline-none focus:border-ink" />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-[12px] text-ink-3">补充说明</span>
                    <textarea className="mt-1 h-20 w-full rounded-md border border-rule bg-paper p-3 outline-none focus:border-ink" />
                  </label>
                </ProtoModal>
              )}
            </div>
            {post.responses.length === 0 ? (
              <p className="panel mt-4 rounded-md p-6 text-[13px] text-ink-3">还没有供应商报价。</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {post.responses.map((r) => {
                  const supplier = getSupplier(r.supplierId)!;
                  const supply = r.supplyId ? getSupply(r.supplyId) : undefined;
                  return (
                    <li key={`${r.supplierId}-${r.at}`} className="panel rounded-md p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="flex items-center gap-2 text-[14px]">
                            <span className="font-semibold">{supplier.name}</span>
                            {supplier.verified && <span className="text-[12px] text-source">◆ 已认证</span>}
                            <span className="text-[12px] text-ink-3">
                              信誉 <span className="num">{supplier.reputation}</span> · {ago(r.at)}
                            </span>
                          </p>
                          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{r.note}</p>
                        </div>
                        <p className="num text-[24px] font-semibold text-source">{r.offer}</p>
                      </div>
                      {supply && (
                        <Link
                          href={`/supply/offers/${supply.id}`}
                          className="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-dashed border-rule px-4 py-3 text-[12.5px] hover:border-ink"
                        >
                          <span className="min-w-0 flex-1 font-semibold">{supply.title}</span>
                          <span className="num text-ink-3">7 日 {pct(supply.probe.d7)}</span>
                          <span className="num text-ink-3">挂牌 {yuan(supply.cnyPerUsd)}/刀</span>
                          <VerifyStamp status={supply.verification.status} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-[116px] lg:self-start">
          {author && (
            <Link href={`/channels/${author.slug}`} className="panel card-hover block rounded-md p-5">
              <p className="text-[12px] text-ink-3">求购方 · 已收录中转站</p>
              <div className="mt-3 flex items-center gap-4">
                <ScoreDial score={author.score} size={54} />
                <div className="min-w-0">
                  <p className="font-display text-[19px] font-black">{author.name}</p>
                  <p className="num text-[12px] text-ink-3">
                    {author.domain} · {author.offerings.length} 份在售货
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-2">求购方的下游表现公开可查，供应商可以据此判断回款与合作风险。</p>
            </Link>
          )}
          <div className="panel rounded-md">
            <p className="border-b border-rule px-5 py-3 text-[13px] font-semibold">其他求购</p>
            <ul className="divide-y divide-rule/70">
              {others.map((w) => (
                <li key={w.id}>
                  <Link href={`/supply/wanted/${w.id}`} className="block px-5 py-3 text-[13px] hover:bg-paper/60">
                    <span className="font-semibold">{w.title}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <SceneTag>{familyLabel(w.family)}</SceneTag>
                      <SceneTag>{w.status}</SceneTag>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
