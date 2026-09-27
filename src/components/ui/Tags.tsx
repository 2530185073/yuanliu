import type { ReactNode } from "react";
import type { SourceType } from "@/lib/types";

const SOURCE_TONE: Record<SourceType, string> = {
  官转: "bg-source-soft text-source",
  官方Key: "bg-source-soft text-source",
  云厂商: "bg-source-soft text-source",
  号池: "bg-paper-2 text-ink-2",
  Kiro: "bg-paper-2 text-ink-2",
  混合: "bg-paper-2 text-ink-2",
  逆向: "bg-warn-soft text-warn",
};

export function SourceTag({ type }: { type: SourceType }) {
  return <span className={`inline-flex h-[22px] items-center rounded-sm px-1.5 text-[12px] font-semibold ${SOURCE_TONE[type]}`}>{type}</span>;
}

export function SceneTag({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-[22px] items-center rounded-sm border border-rule px-1.5 text-[12px] text-ink-2">{children}</span>;
}

export function RiskTag({ children }: { children: ReactNode }) {
  const neutral = typeof children === "string" && /密钥|配置/.test(children);
  return (
    <span className={`inline-flex h-[22px] items-center gap-1 rounded-sm px-1.5 text-[12px] font-semibold ${neutral ? "bg-mute-soft text-mute" : "bg-bad-soft text-bad"}`}>
      {neutral ? "◌" : "⚠"} {children}
    </span>
  );
}

export function Pill({ children, tone = "ink" }: { children: ReactNode; tone?: "ink" | "signal" | "ok" | "source" }) {
  const tones = {
    ink: "border-ink text-ink",
    signal: "border-signal bg-signal text-card",
    ok: "border-ok text-ok",
    source: "border-source text-source",
  };
  return <span className={`inline-flex h-[20px] items-center rounded-full border px-2 font-mono text-[10.5px] tracking-wider ${tones[tone]}`}>{children}</span>;
}

export function Metric({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] text-ink-3">{label}</p>
      <p className="num mt-0.5 truncate text-[15px] font-semibold" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      {sub && <p className="num mt-0.5 truncate text-[11px] text-ink-3">{sub}</p>}
    </div>
  );
}

export function availabilityTone(value: number | null) {
  if (value === null) return "var(--color-mute)";
  if (value >= 99) return "var(--color-ok)";
  if (value >= 95) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function latencyTone(value: number | null) {
  if (value === null) return "var(--color-mute)";
  if (value <= 3000) return "var(--color-ok)";
  if (value <= 10_000) return "var(--color-warn)";
  return "var(--color-bad)";
}
