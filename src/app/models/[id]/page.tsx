import Link from "next/link";
import { notFound } from "next/navigation";
import { getModel, hasModel, MODELS } from "@/lib/catalog";
import { compareRows } from "@/lib/data";
import { FX, yuan } from "@/lib/format";
import { percentile } from "@/lib/probe";
import { Stat } from "@/components/ui/Badges";
import { CompareBoard } from "./CompareBoard";

export function generateStaticParams() {
  return MODELS.map((m) => ({ id: m.id }));
}

export async function generateMetadata(props: PageProps<"/models/[id]">) {
  const { id } = await props.params;
  return { title: id };
}

export default async function ModelPage(props: PageProps<"/models/[id]">) {
  const { id } = await props.params;
  if (!hasModel(id)) notFound();
  const model = getModel(id);
  const rows = compareRows(id);
  const live = rows.filter((r) => !r.excluded);
  const official = model.output * FX;

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-12">
      <Link href="/models" className="text-[13px] text-fg-3 hover:text-fg">
        ← 按模型比价
      </Link>
      <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em]">{model.id}</h1>
      <p className="tnum mt-1 text-fg-3">
        官方 ${model.input} / ${model.output} 每百万 token
      </p>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="在售" value={`${live.length} 份`} />
        <Stat label="最低输出价" value={live.length ? yuan(Math.min(...live.map((r) => r.output))) : "—"} />
        <Stat label="中位输出价" value={yuan(percentile(live.map((r) => r.output), 50) ?? 0)} />
        <Stat label="官方输出价" value={yuan(official)} />
      </div>

      {live.length ? <CompareBoard rows={rows} officialCny={official} /> : <p className="mt-10 text-fg-3">暂无在售的货</p>}
    </div>
  );
}
