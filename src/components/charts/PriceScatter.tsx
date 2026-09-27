"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ms, pct, yuan } from "@/lib/format";
import type { ModelCompareRow } from "@/lib/views";

const W = 960;
const H = 320;
const M = { l: 48, r: 16, t: 16, b: 36 };
const COLORS = { pass: "#4ac26b", warn: "#d4a72c", fail: "#e5534b" } as const;
const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
/** Math.log10 在 Node 与浏览器之间末位精度可能不同，坐标需取整，否则会触发 hydration 不一致 */
const fix = (v: number) => Math.round(v * 100) / 100;

export function PriceScatter({ rows, officialCny }: { rows: ModelCompareRow[]; officialCny: number }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const xs = rows.map((r) => r.output);
  const xMin = Math.min(...xs) * 0.7;
  const xMax = Math.max(Math.max(...xs), officialCny) * 1.3;
  const lx = (v: number) => fix(M.l + ((Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * (W - M.l - M.r));
  const avail = (r: ModelCompareRow) => r.h24 ?? r.d7 ?? 90;
  const yMin = Math.min(90, Math.floor(Math.min(...rows.map(avail)) - 1));
  const ly = (v: number) => fix(M.t + ((100 - v) / (100 - yMin)) * (H - M.t - M.b));
  const active = rows.find((r) => r.id === hover);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none">
        {NICE.filter((t) => t >= xMin && t <= xMax).map((t) => (
          <text key={t} x={lx(t)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--color-fg-3)" className="tnum">
            ¥{t}
          </text>
        ))}
        {[yMin, 95, 99, 100]
          .filter((t, i, a) => t >= yMin && a.indexOf(t) === i)
          .map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={ly(t)} y2={ly(t)} stroke="var(--color-line)" />
              <text x={M.l - 8} y={ly(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-fg-3)" className="tnum">
                {t}%
              </text>
            </g>
          ))}
        <line x1={lx(officialCny)} x2={lx(officialCny)} y1={M.t} y2={H - M.b} stroke="var(--color-fg-3)" strokeDasharray="3 4" />
        <text x={lx(officialCny) - 6} y={M.t + 10} textAnchor="end" fontSize="11" fill="var(--color-fg-3)">
          官方价
        </text>
        {rows.map((r) => (
          <circle
            key={r.id}
            cx={lx(r.output)}
            cy={ly(avail(r))}
            r={hover === r.id ? 7 : 5}
            fill={r.excluded ? "#fff" : COLORS[r.verify]}
            stroke={r.excluded ? "var(--color-idle)" : "#fff"}
            strokeWidth={1.5}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => router.push(`/channels/${r.channelSlug}#${r.id}`)}
          />
        ))}
      </svg>
      {active && (
        <div
          className="card pointer-events-none absolute z-10 w-52 p-3 text-[12px] shadow-lg"
          style={{ left: `min(calc(${(lx(active.output) / W) * 100}% + 12px), calc(100% - 13rem))`, top: `calc(${(ly(avail(active)) / H) * 100}% - 8px)` }}
        >
          <p className="font-medium text-fg">{active.channelName}</p>
          <p className="truncate text-fg-3">{active.group}</p>
          <p className="tnum mt-2 text-fg-2">
            输出 {yuan(active.output)} · 首字 {ms(active.ttft)} · {active.excluded ? "暂停计入" : pct(active.h24)}
          </p>
        </div>
      )}
    </div>
  );
}
