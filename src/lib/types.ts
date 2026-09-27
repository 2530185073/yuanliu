import type { Family } from "./catalog";

export type SourceType = "官转" | "号池" | "官方Key" | "云厂商" | "Kiro" | "逆向" | "混合";

/** 探测失败原因：只有 site / ratelimit / content 计入可用率 */
export type ErrorClass = "site" | "key" | "config" | "ratelimit" | "content";

/** excluded = 探测密钥或配置问题，不计入可用率 */
export type PointState = "ok" | "slow" | "fail" | "excluded";

export type CheckStatus = "pass" | "warn" | "fail" | "skip";
export type VerifyStatus = "pass" | "warn" | "fail";

export interface CurvePoint {
  t: string;
  ms: number | null;
  state: PointState;
}

export interface Incident {
  id: string;
  start: string;
  end: string | null;
  minutes: number;
  kind: ErrorClass;
  summary: string;
  counted: boolean;
}

export interface DailyUptime {
  date: string;
  value: number | null;
}

export interface ProbeSummary {
  latest: {
    ok: boolean;
    ttftMs: number | null;
    checkedAt: string;
    errorClass: ErrorClass | null;
    error: string | null;
  };
  excludedReason: string | null;
  h24: number | null;
  d7: number | null;
  d30: number | null;
  p50: number | null;
  p95: number | null;
  tps: number;
  curve: CurvePoint[];
  /** 24 小时 72 格探测条，编码见 lib/probe.ts 的 encodeBars */
  bars?: number[];
  daily: DailyUptime[];
  incidents: Incident[];
}

export interface Check {
  key: string;
  label: string;
  status: CheckStatus;
  value: string;
  detail: string;
}

export interface Verification {
  status: VerifyStatus;
  score: number;
  checkedAt: string;
  stale: boolean;
  mystery: boolean;
  checks: Check[];
  iqHtml: string | null;
}

export interface ModelQuote {
  modelId: string;
  /** 人民币 / 百万 token */
  realInput: number;
  realOutput: number;
  realCache: number;
  ttftMs: number | null;
  tps: number;
  primary: boolean;
}

export interface PriceEvent {
  at: string;
  text: string;
  delta: number | null;
}

export interface ScorePart {
  label: string;
  value: number;
  max: number;
}

export interface Offering {
  id: string;
  channelSlug: string;
  group: string;
  family: Family;
  sourceType: SourceType;
  scenes: string[];
  risks: string[];
  claimedText: string;
  claimed: number | null;
  measured: number | null;
  multiplierSource: "synced" | "manual" | "measured";
  effective: number;
  /** 每消耗 1 美元官方额度的人民币成本 */
  daoPrice: number;
  quotes: ModelQuote[];
  probe: ProbeSummary;
  verification: Verification;
  score: number;
  scoreParts: ScorePart[];
  history: PriceEvent[];
  cluster: { supplyId: string; confidence: number; disclosed: boolean } | null;
  sponsored: boolean;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  tags: string[];
  at: string;
  reply?: string;
}

export interface Welfare {
  kind: "code" | "trial" | "invite";
  title: string;
  detail: string;
  remaining?: number;
}

export interface Channel {
  slug: string;
  name: string;
  tagline: string | null;
  domain: string;
  siteUrl: string;
  system: "new-api" | "sub2api" | "one-api" | "未识别";
  firstSeen: string;
  ageDays: number;
  claimed: boolean;
  invoice: boolean;
  payMethods: string[];
  minTopup: number;
  rechargeRate: number;
  rechargeText: string;
  contact: string;
  welfare: Welfare[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  ratingTags: { tag: string; count: number }[];
  offerings: Offering[];
  score: number;
  families: Family[];
}

/** 列表页用的精简视图，避免把整份探测明细下发到客户端 */
export interface OfferingListItem {
  id: string;
  channelSlug: string;
  channelName: string;
  domain: string;
  claimed: boolean;
  invoice: boolean;
  payMethods: string[];
  welfare: boolean;
  group: string;
  family: Family;
  sourceType: SourceType;
  scenes: string[];
  risks: string[];
  primaryModel: string;
  modelCount: number;
  daoPrice: number;
  priceSource: Offering["multiplierSource"];
  primaryInput: number;
  primaryOutput: number;
  ttft: number | null;
  ttft95: number | null;
  tps: number;
  h24: number | null;
  d7: number | null;
  excludedReason: string | null;
  bars: number[];
  verify: VerifyStatus;
  verifyScore: number;
  mystery: boolean;
  score: number;
  sponsored: boolean;
  ageDays: number;
}
