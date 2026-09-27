import { channelOf } from "@/lib/data";
import { hash } from "@/lib/rand";
import type { Offering } from "@/lib/types";

const MARK = { pass: "✓", warn: "!", fail: "✕", skip: "…" } as const;

/** 首屏背后那张倾斜的验货单，只露出页眉和右侧印章，属于装饰性元素 */
export function InspectionSlip({ offering }: { offering: Offering }) {
  const ch = channelOf(offering);
  const serial = `0927-${String(hash(offering.id) % 10000).padStart(4, "0")}`;
  return (
    <div
      aria-hidden
      className="absolute -top-12 right-2 hidden w-[300px] rotate-[4deg] rounded-sm border border-rule bg-card pb-6 pl-5 pr-4 pt-4 shadow-[0_18px_40px_-24px_rgb(23_21_15/0.6)] lg:block"
      style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 23px, rgb(23 21 15 / 0.05) 23px 24px)" }}
    >
      <div className="flex items-baseline justify-between border-b-2 border-double border-ink pb-2">
        <p className="font-display text-[16px] font-black tracking-[0.3em]">验货单</p>
        <p className="num text-[10px] text-ink-3">No. {serial}</p>
      </div>
      <p className="mt-2 truncate text-[11.5px] text-ink-2">
        {ch.name} · {offering.group}
      </p>
      <ul className="mt-2 space-y-1 text-[11px]">
        {offering.verification.checks.slice(0, 7).map((c) => (
          <li key={c.key} className="flex items-baseline gap-1">
            <span className="w-3 font-bold text-ok">{MARK[c.status]}</span>
            <span className="text-ink-2">{c.label}</span>
            <span className="mx-1 flex-1 border-b border-dotted border-ink-3/60" />
            <span className="font-semibold text-ok">{c.status === "pass" ? "合格" : "复核"}</span>
          </li>
        ))}
      </ul>
      <span
        className="stamp absolute right-6 top-14 text-[17px]"
        style={{ "--stamp-color": "var(--color-bad)", transform: "rotate(-14deg)" } as React.CSSProperties}
      >
        验真通过
      </span>
    </div>
  );
}
