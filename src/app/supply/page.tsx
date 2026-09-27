import type { Metadata } from "next";
import { getChannel } from "@/lib/data";
import { getSupplier, SUPPLY_ITEMS, WANTED_POSTS } from "@/lib/supply";
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

export default function SupplyPage() {
  const supplies = SUPPLY_ITEMS.map((item) => ({ item, supplier: getSupplier(item.supplierId)! }));
  const wanted = WANTED_POSTS.map((post) => ({ post, authorName: getChannel(post.authorSlug)?.name ?? "某中转站" }));

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
      <SupplyBoard supplies={supplies} wanted={wanted} />
      <p className="mt-4 text-[13px] text-fg-3">平台只做撮合，不经手资金。</p>
    </div>
  );
}
