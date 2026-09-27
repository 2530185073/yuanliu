import Link from "next/link";
import { MARKET, STATS } from "@/lib/data";
import { signedPct, yuan } from "@/lib/format";

function Spark({ series, up }: { series: number[]; up: boolean }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => `${((i / (series.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / span) * 22).toFixed(1)}`);
  const color = up ? "#ff8a63" : "#6fdc98";
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
      <polyline points={`0,28 ${pts.join(" ")} 100,28`} fill={color} opacity="0.12" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketBoard() {
  const kpis = [
    { label: "在售货", value: STATS.offerings, sub: `${STATS.channels} 家渠道` },
    { label: "验真通过", value: `${STATS.verifiedRate}%`, sub: `${STATS.mystery} 份平台实测` },
    { label: "站点故障", value: STATS.siteDown, sub: "此刻计入可用率" },
    { label: "密钥异常", value: STATS.excluded, sub: "已通知站长 · 不计入" },
  ];
  return (
    <div className="relative overflow-hidden rounded-md bg-ink text-card shadow-[0_30px_60px_-30px_rgb(23_21_15/0.7)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-3">
        <p className="font-display text-[17px] font-black tracking-wide">今日盘面</p>
        <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] text-white/50">
          <span className="live-dot" /> LIVE · 20:00 CST
        </p>
      </div>
      <div className="relative grid grid-cols-2 border-b border-white/10 sm:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-5 py-4 ${i % 2 ? "border-l border-white/10" : ""} ${i >= 2 ? "border-t border-white/10 sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
            <p className="text-[11.5px] text-white/50">{k.label}</p>
            <p className="num mt-1 text-[26px] font-semibold leading-none">{k.value}</p>
            <p className="mt-1.5 truncate text-[10.5px] text-white/40">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="relative px-5 pb-4 pt-3">
        <div className="grid grid-cols-[64px_1fr_72px_64px] items-center gap-3 pb-1 font-mono text-[10px] tracking-[0.14em] text-white/40">
          <span>模型族</span>
          <span>7 日刀价走势</span>
          <span className="text-right">中位</span>
          <span className="text-right">7 日</span>
        </div>
        {MARKET.map((m) => (
          <Link
            key={m.family}
            href={`/models?family=${m.family}`}
            className="group grid grid-cols-[64px_1fr_72px_64px] items-center gap-3 border-t border-white/[0.07] py-2 text-[14px]"
          >
            <span className="font-semibold group-hover:text-signal">
              {m.short}
              <span className="num ml-1.5 text-[10.5px] font-normal text-white/35">{m.count}</span>
            </span>
            <Spark series={m.series} up={m.change > 0} />
            <span className="num text-right font-semibold">{yuan(m.median)}</span>
            <span className={`num text-right text-[12px] ${m.change > 0 ? "text-[#ff8a63]" : "text-[#6fdc98]"}`}>{signedPct(m.change)}</span>
          </Link>
        ))}
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">刀价 = 每消耗 1 美元官方额度要付的人民币。涨为红、跌为绿，降价对买家是好事。</p>
      </div>
    </div>
  );
}
