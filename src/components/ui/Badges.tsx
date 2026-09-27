import type { ReactNode } from "react";
import type { CheckStatus, VerifyStatus } from "@/lib/types";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-muted text-fg-2",
    ok: "bg-ok-bg text-ok",
    warn: "bg-warn-bg text-warn",
    bad: "bg-bad-bg text-bad",
  };
  return <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[12px] font-medium ${tones[tone]}`}>{children}</span>;
}

const VERIFY = {
  pass: { label: "已验真", color: "var(--color-ok)" },
  warn: { label: "存疑", color: "var(--color-warn)" },
  fail: { label: "未通过", color: "var(--color-bad)" },
} as const;

export function VerifyBadge({ status, stale }: { status: VerifyStatus; stale?: boolean }) {
  const v = VERIFY[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-fg-2" title={stale ? "密钥异常，沿用上次结果" : undefined}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: stale ? "var(--color-idle)" : v.color }} />
      {v.label}
    </span>
  );
}

export const CHECK_MARK: Record<CheckStatus, { icon: string; color: string }> = {
  pass: { icon: "✓", color: "var(--color-ok)" },
  warn: { icon: "!", color: "var(--color-warn)" },
  fail: { icon: "✕", color: "var(--color-bad)" },
  skip: { icon: "–", color: "var(--color-idle)" },
};

/** 只给不好的数值上色，正常值保持中性 */
export function availabilityTone(value: number | null) {
  if (value === null) return "var(--color-fg-3)";
  if (value >= 99) return undefined;
  if (value >= 95) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function latencyTone(value: number | null) {
  if (value === null) return "var(--color-fg-3)";
  if (value <= 3000) return undefined;
  if (value <= 10_000) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="tnum mt-1 truncate text-[22px] font-semibold tracking-tight" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
    </div>
  );
}
