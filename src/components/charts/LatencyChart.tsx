import { clock } from "@/lib/format";
import type { CurvePoint } from "@/lib/types";

const W = 720;
const H = 150;
const M = { l: 44, r: 12, t: 12, b: 24 };
const LOG_MIN = Math.log(300);
const LOG_MAX = Math.log(60_000);

const y = (ms: number) => M.t + (1 - (Math.log(Math.min(Math.max(ms, 300), 60_000)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (H - M.t - M.b);

export function LatencyChart({ curve }: { curve: CurvePoint[] }) {
  if (!curve.length) return <p className="text-[13px] text-ink-3">暂无探测数据</p>;
  const x = (i: number) => M.l + (i / Math.max(curve.length - 1, 1)) * (W - M.l - M.r);
  const okPts = curve.map((p, i) => ({ i, p })).filter(({ p }) => p.ms !== null);
  const line = okPts.map(({ i, p }, idx) => `${idx ? "L" : "M"}${x(i).toFixed(1)},${y(p.ms as number).toFixed(1)}`).join(" ");
  const area = okPts.length ? `${line} L${x(okPts[okPts.length - 1].i).toFixed(1)},${H - M.b} L${x(okPts[0].i).toFixed(1)},${H - M.b} Z` : "";
  const labels = [0, 18, 36, 54, curve.length - 1].filter((i) => i < curve.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      {[1000, 3000, 10_000, 30_000].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--color-rule)" strokeDasharray={t === 10_000 ? "0" : "2 4"} />
          <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-3)" className="num">
            {t / 1000}s
          </text>
        </g>
      ))}
      {curve.map((p, i) =>
        p.state === "fail" || p.state === "excluded" ? (
          <rect
            key={i}
            x={x(i) - 3}
            y={M.t}
            width={6}
            height={H - M.t - M.b}
            fill={p.state === "fail" ? "var(--color-bad)" : "var(--color-mute)"}
            opacity={p.state === "fail" ? 0.55 : 0.22}
          />
        ) : null,
      )}
      <path d={area} fill="var(--color-ink)" opacity="0.06" />
      <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinejoin="round" />
      {curve.map((p, i) => (p.state === "slow" ? <circle key={i} cx={x(i)} cy={y(p.ms as number)} r="3" fill="var(--color-warn)" /> : null))}
      {labels.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-ink-3)" className="num">
          {clock(curve[i].t)}
        </text>
      ))}
    </svg>
  );
}
