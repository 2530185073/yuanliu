import { FAMILIES } from "@/lib/catalog";
import type { SourceType } from "@/lib/types";
import { getHomeSummary, getListItems } from "@/server/repo";
import { HomeBoard, type BoardState, type SortKey } from "./HomeBoard";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);

export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const [items, summary] = await Promise.all([getListItems(), getHomeSummary()]);
  const initial: BoardState = {
    family: FAMILIES.find((f) => f.id === one(sp.family))?.id ?? "all",
    q: one(sp.q),
    sort: ((["score", "dao", "ttft", "avail"] as const).find((k) => k === one(sp.sort)) ?? "score") as SortKey,
    verified: one(sp.verified) === "1",
    sources: list(sp.source) as SourceType[],
    scenes: list(sp.scene),
    invoice: one(sp.invoice) === "1",
  };
  return <HomeBoard items={items} initial={initial} summary={`${summary.channels} 家渠道 · ${summary.offerings} 份货 · 每 5 分钟探测一次`} />;
}
