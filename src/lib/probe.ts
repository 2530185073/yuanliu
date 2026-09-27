import { between, chance, clamp, round, type Rng } from "./rand";
import type { Check, CheckStatus, CurvePoint, DailyUptime, ErrorClass, VerifyStatus } from "./types";

/** 原型的"当前时间"，与快照抓取时间对齐，保证服务端与客户端渲染一致 */
export const NOW = Date.parse("2026-09-27T12:00:00Z");
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const ERROR_LABEL: Record<ErrorClass, string> = {
  site: "站点故障",
  key: "探测密钥异常",
  config: "配置不匹配",
  ratelimit: "限流",
  content: "内容异常",
};

export function classifyError(message: string): ErrorClass {
  if (/scheduling|upstream|上游|HTTP 5\d\d|timeout|超时/i.test(message)) return "site";
  if (/HTTP 429/.test(message) && !/额度|quota/i.test(message)) return "ratelimit";
  if (/HTTP (401|403|429)|额度|余额|balance|令牌|token|api key|分组/i.test(message)) return "key";
  if (/HTTP (400|404)/.test(message)) return "config";
  return "site";
}

export function uptime(points: CurvePoint[]): number | null {
  const counted = points.filter((p) => p.state !== "excluded");
  if (!counted.length) return null;
  return round((counted.filter((p) => p.state !== "fail").length / counted.length) * 100, 1);
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.ceil((p / 100) * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[idx];
}

/** 列表条形图的紧凑编码：正数为首字毫秒，-1 为计入的失败，-2 为不计入的密钥/配置问题 */
export function encodeBars(points: CurvePoint[]): number[] {
  return points.map((p) => (p.state === "fail" ? -1 : p.state === "excluded" ? -2 : Math.round(p.ms ?? 0)));
}

export function synthCurve(r: Rng, opts: { base: number; jitter: number; failRate: number; slowRate?: number }): CurvePoint[] {
  const points: CurvePoint[] = [];
  const start = NOW - DAY;
  for (let i = 0; i < 72; i++) {
    const t = new Date(start + i * 20 * MINUTE + between(r, 0, 90_000)).toISOString();
    if (chance(r, opts.failRate)) {
      points.push({ t, ms: null, state: "fail" });
      continue;
    }
    const slow = chance(r, opts.slowRate ?? 0.01);
    const ms = slow ? between(r, 11_000, 24_000) : Math.max(300, opts.base + between(r, -opts.jitter, opts.jitter) * (1 + Math.sin(i / 6) * 0.3));
    points.push({ t, ms: Math.round(ms), state: slow ? "slow" : "ok" });
  }
  return points;
}

export function synthDaily(r: Rng, base: number, lastValue: number | null, excludedTail: number): DailyUptime[] {
  const days: DailyUptime[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(NOW - i * DAY).toISOString().slice(0, 10);
    if (i < excludedTail) {
      days.push({ date, value: null });
      continue;
    }
    if (i === 0 && lastValue !== null) {
      days.push({ date, value: lastValue });
      continue;
    }
    const dip = chance(r, 0.07) ? between(r, 84, 96.5) : null;
    days.push({ date, value: round(clamp(dip ?? base + between(r, -1.6, 1.1), 60, 100), 1) });
  }
  return days;
}

const CHECK_SCORE: Record<CheckStatus, number> = { pass: 100, warn: 60, fail: 10, skip: 0 };

export function summarizeChecks(checks: Check[]): { status: VerifyStatus; score: number } {
  const scored = checks.filter((c) => c.status !== "skip");
  const fails = scored.filter((c) => c.status === "fail").length;
  const warns = scored.filter((c) => c.status === "warn").length;
  const score = scored.length ? Math.round(scored.reduce((sum, c) => sum + CHECK_SCORE[c.status], 0) / scored.length) : 0;
  return { status: fails > 0 ? "fail" : warns >= 2 ? "warn" : "pass", score };
}
