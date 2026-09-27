import type { Metadata } from "next";
import { connection } from "next/server";
import { familyLabel } from "@/lib/catalog";
import { ago } from "@/lib/format";
import { listSupply, listWanted } from "@/server/supply-repo";
import { ProtoModal } from "@/components/ui/Proto";
import { SupplyBoard } from "./SupplyBoard";

export const metadata: Metadata = { title: "货源广场" };

function FormFields({ fields }: { fields: string[] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <label key={f} className="block">
          <span className="text-[13px] text-fg-3">{f}</span>
          <input className="input mt-1" />
        </label>
      ))}
    </div>
  );
}

export default async function SupplyPage() {
  await connection();
  const [supplies, wanted] = await Promise.all([listSupply(), listWanted()]);

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">货源广场</h1>
          <p className="mt-2 text-fg-2">给中转站找上游。每份货源都用测试 Key 探测过。</p>
        </div>
        <div className="flex gap-2">
          <ProtoModal className="btn btn-secondary" label="发布求购" title="发布求购">
            <FormFields fields={["需要的模型", "预计用量", "目标刀价"]} />
          </ProtoModal>
          <ProtoModal className="btn btn-primary" label="发布货源" title="发布货源">
            <FormFields fields={["标题", "可用模型", "刀价报价", "测试 Key"]} />
          </ProtoModal>
        </div>
      </div>
      <SupplyBoard
        supplies={supplies.map(({ item, supplier }) => ({
          id: item.id,
          title: item.title,
          family: item.family,
          supplierName: supplier.name,
          verified: supplier.verified,
          sourceType: item.sourceType,
          cnyPerUsd: item.cnyPerUsd,
          terms: `${item.settlement} · ${item.minOrder}`,
          d7: item.probe?.d7 ?? null,
          verify: item.verification?.status ?? null,
        }))}
        wanted={wanted.map(({ post, authorName, responses }) => ({
          id: post.id,
          title: post.title,
          family: post.family,
          meta: `${authorName} · ${familyLabel(post.family)} · ${ago(post.postedAt.toISOString())}`,
          target: post.target,
          responses,
          status: post.status,
        }))}
      />
      <p className="mt-4 text-[13px] text-fg-3">平台只做撮合，不经手资金。</p>
    </div>
  );
}
