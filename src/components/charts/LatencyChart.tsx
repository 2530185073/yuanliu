import { clock } from "@/lib/format";
import type { CurvePoint } from "@/lib/types";

const W = 720;
const H = 140;
const M = { l: 36, r: 8, t: 8, b: 22 };
const LOG_MIN = Math.log(300);
const LOG_MAX = Math.log(30_000);

const y = (ms: number) => M.t + (1 - (Math.log(Math.min(Math.max(ms, 300), 30_000)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (H - M.t - M.b);

export function LatencyChart({ curve }: { curve: CurvePoint[] }) {
  if (!curve.length) return null;
  const x = (i: number) => M.l + (i / Math.max(curve.length - 1, 1)) * (W - M.l - M.r);
  const pts = curve.map((p, i) => ({ i, p })).filter(({ p }) => p.ms !== null);
  const line = pts.map(({ i, p }, idx) => `${idx ? "L" : "M"}${x(i).toFixed(1)},${y(p.ms as number).toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${x(pts[pts.length - 1].i).toFixed(1)},${H - M.b} L${x(pts[0].i).toFixed(1)},${H - M.b} Z` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <defs>
        <linearGradient id="lat-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#171717" stopOpacity="0.08" />
          <stop offset="1" stopColor="#171717" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1000, 3000, 10_000].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
          <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-fg-3)">
            {t / 1000}s
          </text>
        </g>
      ))}
      {curve.map((p, i) => (p.state === "fail" ? <rect key={i} x={x(i) - 2} y={M.t} width={4} height={H - M.t - M.b} rx={1} fill="#e5534b" opacity={0.35} /> : null))}
      <path d={area} fill="url(#lat-fill)" />
      <path d={line} fill="none" stroke="var(--color-fg)" strokeWidth="1.25" strokeLinejoin="round" />
      {[0, Math.floor(curve.length / 2), curve.length - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--color-fg-3)">
          {clock(curve[i].t)}
        </text>
      ))}
    </svg>
  );
}
