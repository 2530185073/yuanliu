import type { DailyUptime } from "@/lib/types";

function cellColor(v: number | null) {
  if (v === null) return "repeating-linear-gradient(45deg, var(--color-mute-soft) 0 3px, var(--color-card) 3px 6px)";
  if (v >= 99.5) return "var(--color-ok)";
  if (v >= 99) return "#4f9d6c";
  if (v >= 97) return "#d8b24a";
  if (v >= 95) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function UptimeHeatmap({ rows }: { rows: { label: string; days: DailyUptime[]; d30: number | null }[] }) {
  const dates = rows[0]?.days ?? [];
  return (
    <div className="scroll-x">
      <div className="min-w-[640px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-1.5">
            <p className="w-40 shrink-0 truncate text-[12.5px] text-ink-2" title={row.label}>
              {row.label}
            </p>
            <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${row.days.length}, minmax(0, 1fr))` }}>
              {row.days.map((d) => (
                <span key={d.date} className="h-6 rounded-[2px]" style={{ background: cellColor(d.value) }} title={`${d.date} · ${d.value === null ? "密钥异常，不计入" : `${d.value}%`}`} />
              ))}
            </div>
            <p className="num w-14 shrink-0 text-right text-[12.5px] font-semibold">{row.d30 === null ? "—" : `${row.d30}%`}</p>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-3">
          <span className="w-40 shrink-0" />
          <div className="num flex flex-1 justify-between text-[10.5px] text-ink-3">
            <span>{dates[0]?.date.slice(5)}</span>
            <span>{dates[Math.floor(dates.length / 2)]?.date.slice(5)}</span>
            <span>今天</span>
          </div>
          <span className="w-14 shrink-0 text-right text-[10.5px] text-ink-3">30 日</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-3">
        {[
          ["≥ 99.5%", 99.6],
          ["≥ 99%", 99.2],
          ["≥ 97%", 98],
          ["≥ 95%", 96],
          ["< 95%", 90],
        ].map(([label, v]) => (
          <span key={label as string} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[2px]" style={{ background: cellColor(v as number) }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px]" style={{ background: cellColor(null) }} />
          密钥异常，不计入
        </span>
      </div>
    </div>
  );
}
