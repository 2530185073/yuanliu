export function scoreColor(score: number) {
  if (score >= 80) return "var(--color-ok)";
  if (score >= 60) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function ScoreDial({ score, size = 54, label = "综合分" }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${label} ${score}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-2)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={4}
          strokeDasharray={`${(score / 100) * c} ${c}`}
          strokeLinecap="butt"
        />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center font-semibold" style={{ fontSize: size * 0.34 }}>
        {score}
      </span>
    </div>
  );
}
