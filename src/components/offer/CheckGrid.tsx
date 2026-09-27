import type { Check, CheckStatus } from "@/lib/types";

const TONE: Record<CheckStatus, { icon: string; color: string; bg: string }> = {
  pass: { icon: "✓", color: "var(--color-ok)", bg: "var(--color-ok-soft)" },
  warn: { icon: "!", color: "var(--color-warn)", bg: "var(--color-warn-soft)" },
  fail: { icon: "✕", color: "var(--color-bad)", bg: "var(--color-bad-soft)" },
  skip: { icon: "…", color: "var(--color-mute)", bg: "var(--color-mute-soft)" },
};

export function CheckGrid({ checks }: { checks: Check[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-3">
      {checks.map((c) => {
        const tone = TONE[c.status];
        return (
          <div key={c.key} className="flex gap-3 bg-card p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ color: tone.color, background: tone.bg }}>
              {tone.icon}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="font-semibold">{c.label}</span>
                <span className="num text-[12px]" style={{ color: tone.color }}>
                  {c.value}
                </span>
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{c.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
