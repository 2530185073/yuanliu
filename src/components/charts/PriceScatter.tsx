"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ms, pct, yuan } from "@/lib/format";
import type { ModelCompareRow } from "@/lib/views";

const W = 960;
const H = 380;
const M = { l: 58, r: 24, t: 24, b: 48 };
const COLORS = { pass: "var(--color-ok)", warn: "var(--color-warn)", fail: "var(--color-bad)" } as const;
const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

export function PriceScatter({ rows, officialCny }: { rows: ModelCompareRow[]; officialCny: number }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const xs = rows.map((r) => r.output);
  const xMin = Math.min(...xs) * 0.7;
  const xMax = Math.max(Math.max(...xs), officialCny) * 1.3;
  const fix = (v: number) => Math.round(v * 100) / 100;
  const lx = (v: number) => fix(M.l + ((Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * (W - M.l - M.r));
  const avail = (r: ModelCompareRow) => r.h24 ?? r.d7 ?? 90;
  const yMin = Math.min(85, Math.floor(Math.min(...rows.map(avail)) - 1));
  const ly = (v: number) => fix(M.t + ((100 - v) / (100 - yMin)) * (H - M.t - M.b));
  const ticks = NICE.filter((t) => t >= xMin && t <= xMax);
  const yTicks = [yMin, ...[90, 95, 99, 100].filter((t) => t > yMin)];
  const cheapLine = [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const active = rows.find((r) => r.id === hover);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none">
        <rect x={M.l} y={ly(100)} width={Math.max(0, lx(cheapLine) - M.l)} height={ly(99) - ly(100)} fill="var(--color-ok-soft)" />
        <text x={M.l + 10} y={ly(100) + 16} fontSize="12" fill="var(--color-ok)" fontWeight="700">
          便宜且稳 ↖
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={lx(t)} x2={lx(t)} y1={M.t} y2={H - M.b} stroke="var(--color-rule)" strokeDasharray="2 4" />
            <text x={lx(t)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="var(--color-ink-3)" className="num">
              ¥{t}
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={ly(t)} y2={ly(t)} stroke="var(--color-rule)" />
            <text x={M.l - 8} y={ly(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-3)" className="num">
              {t}%
            </text>
          </g>
        ))}
        <line x1={lx(officialCny)} x2={lx(officialCny)} y1={M.t - 8} y2={H - M.b} stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x={lx(officialCny) - 6} y={M.t + 4} textAnchor="end" fontSize="12" fill="var(--color-ink)" fontWeight="700">
          官方价 {yuan(officialCny)}
        </text>
        <text x={(W + M.l) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-ink-2)">
          输出单价 · 人民币 / 百万 token（对数刻度）
        </text>
        <text x={16} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--color-ink-2)" transform={`rotate(-90 16 ${H / 2})`}>
          24h 可用率
        </text>
        {rows.map((r) => {
          const on = hover === r.id;
          const radius = 5 + (r.score / 100) * 7;
          return (
            <circle
              key={r.id}
              cx={lx(r.output)}
              cy={ly(avail(r))}
              r={on ? radius + 3 : radius}
              fill={r.excluded ? "var(--color-card)" : COLORS[r.verify]}
              fillOpacity={r.excluded ? 1 : 0.82}
              stroke={r.excluded ? "var(--color-mute)" : "var(--color-ink)"}
              strokeWidth={on ? 2 : 1}
              strokeDasharray={r.excluded ? "3 2" : undefined}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`/channels/${r.channelSlug}#${r.id}`)}
            />
          );
        })}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute z-10 w-60 rounded-md border border-ink bg-card p-3 text-[12px] shadow-[3px_3px_0_var(--color-ink)]"
          style={{
            left: `min(calc(${(lx(active.output) / W) * 100}% + 14px), calc(100% - 15rem))`,
            top: `calc(${(ly(avail(active)) / H) * 100}% - 12px)`,
          }}
        >
          <p className="font-semibold text-ink">{active.channelName}</p>
          <p className="truncate text-ink-3">{active.group}</p>
          <div className="num mt-2 grid grid-cols-2 gap-1 text-ink-2">
            <span>输出 {yuan(active.output)}</span>
            <span>输入 {yuan(active.input)}</span>
            <span>首字 {ms(active.ttft)}</span>
            <span>{active.excluded ? `24h ${active.excluded}` : `24h ${pct(active.h24)}`}</span>
          </div>
          <p className="mt-2 text-[11px] text-ink-3">点击查看渠道详情</p>
        </div>
      )}
    </div>
  );
}
