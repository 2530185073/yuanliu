import type { VerifyStatus } from "@/lib/types";

const STAMP: Record<VerifyStatus, { label: string; color: string }> = {
  pass: { label: "验真通过", color: "var(--color-ok)" },
  warn: { label: "部分存疑", color: "var(--color-warn)" },
  fail: { label: "验真未过", color: "var(--color-bad)" },
};

export function VerifyStamp({ status, size = "sm", stale }: { status: VerifyStatus; size?: "sm" | "lg"; stale?: boolean }) {
  const s = STAMP[status];
  return (
    <span
      className={`stamp ${size === "sm" ? "stamp-sm" : "text-[15px]"}`}
      style={{ "--stamp-color": stale ? "var(--color-mute)" : s.color } as React.CSSProperties}
      title={stale ? "密钥异常期间无法复检，沿用上次结果" : undefined}
    >
      {s.label}
    </span>
  );
}

export function MysteryStamp() {
  return (
    <span className="stamp stamp-sm" style={{ "--stamp-color": "var(--color-source)", transform: "rotate(3deg)" } as React.CSSProperties} title="平台以普通用户身份自购账号交叉验证">
      平台实测
    </span>
  );
}
