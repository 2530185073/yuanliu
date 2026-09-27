import { DAY, HOUR, MINUTE, NOW } from "./probe";

/** 官方美元价折算人民币时使用的参考汇率 */
export const FX = 7.2;

export function yuan(value: number): string {
  const abs = Math.abs(value);
  const digits = abs < 0.01 ? 4 : abs < 0.1 ? 3 : abs < 10 ? 2 : abs < 100 ? 1 : 0;
  return `¥${value.toFixed(digits)}`;
}

export const pct = (value: number | null, digits = 1) => (value === null ? "—" : `${value.toFixed(digits)}%`);

export function ms(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}s`;
}

export const signedPct = (delta: number) => `${delta > 0 ? "▲" : "▼"}${Math.abs(delta * 100).toFixed(1)}%`;

export function discount(cnyPerUsd: number): string {
  const fold = (cnyPerUsd / FX) * 10;
  return `${fold < 0.1 ? fold.toFixed(2) : fold < 1 ? fold.toFixed(2) : fold.toFixed(1)} 折`;
}

export function ago(iso: string): string {
  const diff = NOW - Date.parse(iso);
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))} 分钟前`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} 小时前`;
  if (diff < 30 * DAY) return `${Math.round(diff / DAY)} 天前`;
  return `${Math.round(diff / (30 * DAY))} 个月前`;
}

const stampFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const clockFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const stamp = (iso: string) => stampFormat.format(new Date(iso));
export const clock = (iso: string) => clockFormat.format(new Date(iso));

export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}
