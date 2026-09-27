import type { DailyUptime } from "@/lib/types";

function cellColor(v: number | null) {
  if (v === null) return "var(--color-line)";
  if (v >= 99.5) return "#8fd6a1";
  if (v >= 99) return "#c3ebcd";
  if (v >= 97) return "#e3c565";
  return "#e5534b";
}

export function UptimeHeatmap({ rows }: { rows: { label: string; days: DailyUptime[]; d30: number | null }[] }) {
  return (
    <div className="scroll-x">
      <div className="min-w-[560px] space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4">
            <p className="w-36 shrink-0 truncate text-[13px] text-fg-2" title={row.label}>
              {row.label}
            </p>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${row.days.length}, minmax(0, 1fr))` }}>
              {row.days.map((d) => (
                <span key={d.date} className="h-5 rounded-[2px]" style={{ background: cellColor(d.value) }} title={`${d.date} · ${d.value === null ? "不计入" : `${d.value}%`}`} />
              ))}
            </div>
            <p className="tnum w-12 shrink-0 text-right text-[13px]">{row.d30 === null ? "—" : `${row.d30}%`}</p>
          </div>
        ))}
        <div className="flex justify-between pl-40 pr-16 text-[12px] text-fg-3">
          <span>30 天前</span>
          <span>今天</span>
        </div>
      </div>
    </div>
  );
}
