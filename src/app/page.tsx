import { FAMILIES } from "@/lib/catalog";
import { CHANNELS, LIST_ITEMS, OFFERINGS } from "@/lib/data";
import type { SourceType } from "@/lib/types";
import { HomeBoard, type BoardState, type SortKey } from "./HomeBoard";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);

export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const family = FAMILIES.find((f) => f.id === one(sp.family))?.id ?? "all";
  const sort = (["score", "dao", "ttft", "avail"] as const).find((k) => k === one(sp.sort)) ?? "score";
  const initial: BoardState = {
    family,
    q: one(sp.q),
    sort: sort as SortKey,
    verified: one(sp.verified) === "1",
    sources: list(sp.source) as SourceType[],
    scenes: list(sp.scene),
    invoice: one(sp.invoice) === "1",
  };
  return <HomeBoard items={LIST_ITEMS} initial={initial} summary={`${CHANNELS.length} 家渠道 · ${OFFERINGS.length} 份货 · 每 5 分钟探测一次`} />;
}
