import Link from "next/link";
import { MARKET, TICKER } from "@/lib/data";
import { signedPct, yuan } from "@/lib/format";

export function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="flex h-9 items-stretch bg-ink text-[12.5px] text-card">
      <div className="flex shrink-0 items-center gap-4 border-r border-white/15 px-4">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-white/60">
          <span className="live-dot" /> 刀价行情
        </span>
        {MARKET.map((m) => (
          <span key={m.family} className="hidden items-center gap-1.5 xl:flex">
            <span className="text-white/55">{m.short}</span>
            <span className="num">{yuan(m.median)}</span>
            <span className={`num text-[11px] ${m.change <= 0 ? "text-[#7fe3a4]" : "text-[#ff9b7a]"}`}>{signedPct(m.change)}</span>
          </span>
        ))}
      </div>
      <div className="ticker flex-1">
        <div className="ticker-track h-full items-center">
          {items.map((item, i) => (
            <Link key={`${item.id}-${i}`} href={`/channels/${item.slug}`} className="flex h-full items-center gap-2 border-r border-white/10 px-5 hover:bg-white/5">
              <span className="font-semibold">{item.channel}</span>
              <span className="max-w-40 truncate text-white/55">{item.group}</span>
              <span className="num">{yuan(item.price)}/刀</span>
              <span className={`num ${item.delta <= 0 ? "text-[#7fe3a4]" : "text-[#ff9b7a]"}`}>{signedPct(item.delta)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
