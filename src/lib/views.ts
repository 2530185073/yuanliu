import type { Family } from "./catalog";
import type { SourceType, VerifyStatus } from "./types";

/** 单模型比价页的行数据 */
export interface ModelCompareRow {
  id: string;
  channelSlug: string;
  channelName: string;
  group: string;
  family: Family;
  sourceType: SourceType;
  input: number;
  output: number;
  cache: number;
  fold: number;
  ttft: number | null;
  tps: number;
  h24: number | null;
  d7: number | null;
  excluded: string | null;
  verify: VerifyStatus;
  stale: boolean;
  mystery: boolean;
  score: number;
  risks: string[];
}
