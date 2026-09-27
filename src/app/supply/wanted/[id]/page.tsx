import Link from "next/link";
import { notFound } from "next/navigation";
import { getChannel } from "@/lib/data";
import { ago } from "@/lib/format";
import { getSupplier, getSupply, WANTED_POSTS } from "@/lib/supply";
import { Badge, Stat, VerifyBadge } from "@/components/ui/Badges";
import { ProtoModal } from "@/components/ui/Proto";

export function generateStaticParams() {
  return WANTED_POSTS.map((w) => ({ id: w.id }));
}

export async function generateMetadata(props: PageProps<"/supply/wanted/[id]">) {
  const { id } = await props.params;
  return { title: WANTED_POSTS.find((w) => w.id === id)?.title ?? "求购不存在" };
}

export default async function WantedPage(props: PageProps<"/supply/wanted/[id]">) {
  const { id } = await props.params;
  const post = WANTED_POSTS.find((w) => w.id === id);
  if (!post) notFound();
  const author = getChannel(post.authorSlug);

  return (
    <div className="mx-auto max-w-[880px] px-5 pt-12">
      <Link href="/supply" className="text-[13px] text-fg-3 hover:text-fg">
        ← 货源广场
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{post.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-fg-3">
            <Badge tone={post.status === "开放报价" ? "ok" : "neutral"}>{post.status}</Badge>
            {author ? (
              <Link href={`/channels/${author.slug}`} className="hover:text-fg">
                {author.name}
              </Link>
            ) : (
              "某中转站"
            )}
            · {ago(post.postedAt)}
          </p>
        </div>
        {post.status !== "已成交" && (
          <ProtoModal className="btn btn-primary" label="报价" title="提交报价">
            <label className="block">
              <span className="text-[13px] text-fg-3">报价（元 / 刀）</span>
              <input className="input mt-1" />
            </label>
            <p className="mt-3 text-[13px] text-fg-3">需要用已上架的货源报价。</p>
          </ProtoModal>
        )}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3">
        <Stat label="用量" value={post.volume} />
        <Stat label="目标价" value={post.target} />
        <Stat label="结算" value={post.settlement} />
      </div>
      <p className="mt-10 leading-relaxed text-fg-2">{post.detail}</p>
      <p className="mt-3 text-[13px] text-fg-3">要求：{post.requirements.join(" · ")}</p>

      <h2 className="mt-12 text-[13px] text-fg-3">{post.responses.length} 个报价</h2>
      {post.responses.length > 0 && (
        <ul className="card mt-3 divide-y divide-line">
          {post.responses.map((r) => {
            const supplier = getSupplier(r.supplierId)!;
            const supply = r.supplyId ? getSupply(r.supplyId) : undefined;
            return (
              <li key={`${r.supplierId}-${r.at}`} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium">
                    {supplier.name}
                    <span className="ml-2 text-[13px] font-normal text-fg-3">{ago(r.at)}</span>
                  </p>
                  <p className="tnum shrink-0 font-semibold">{r.offer}</p>
                </div>
                <p className="mt-1 text-fg-2">{r.note}</p>
                {supply && (
                  <Link href={`/supply/offers/${supply.id}`} className="mt-2 flex items-center gap-3 text-[13px] text-fg-3 hover:text-fg">
                    {supply.title}
                    <VerifyBadge status={supply.verification.status} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
