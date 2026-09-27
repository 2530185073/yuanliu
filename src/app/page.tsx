import { CHANNELS, LIST_ITEMS, OFFERINGS } from "@/lib/data";
import { HomeBoard } from "./HomeBoard";

export default function HomePage() {
  return <HomeBoard items={LIST_ITEMS} summary={`${CHANNELS.length} 家渠道 · ${OFFERINGS.length} 份货 · 每 5 分钟探测一次`} />;
}
