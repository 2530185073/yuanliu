import type { Family } from "./catalog";
import { CHANNEL_NAMES } from "./names";
import { HOUR, NOW, percentile, summarizeChecks, synthCurve, uptime } from "./probe";
import { between, round, seeded } from "./rand";
import type { Check, CurvePoint, SourceType, VerifyStatus } from "./types";
import { buildChecks } from "./verify";

export interface Supplier {
  id: string;
  name: string;
  kind: "云厂商代理" | "企业账户" | "号池" | "官方 Key 分销" | "中转批发";
  verified: boolean;
  reputation: number;
  deals: number;
  joinedDays: number;
  responseMins: number;
  bio: string;
  contact: string;
}

export interface SupplyItem {
  id: string;
  supplierId: string;
  title: string;
  family: Family;
  sourceType: SourceType;
  models: string[];
  /** 每 1 美元官方额度的人民币报价 */
  cnyPerUsd: number;
  settlement: "预付" | "按量后付" | "包月";
  minOrder: string;
  rpm: number;
  concurrency: number;
  features: string[];
  afterSales: string;
  stock: "充足" | "紧张" | "需预约";
  updatedAt: string;
  description: string;
  probe: { d7: number; h24: number | null; p50: number | null; p95: number | null; tps: number; curve: CurvePoint[] };
  verification: { status: VerifyStatus; score: number; checks: Check[] };
}

export interface WantedResponse {
  supplierId: string;
  supplyId?: string;
  offer: string;
  note: string;
  at: string;
}

export interface WantedPost {
  id: string;
  authorSlug: string;
  title: string;
  family: Family;
  models: string[];
  volume: string;
  target: string;
  settlement: string;
  requirements: string[];
  status: "开放报价" | "洽谈中" | "已成交";
  postedAt: string;
  views: number;
  detail: string;
  responses: WantedResponse[];
}

export const SUPPLIERS: Supplier[] = [
  { id: "beian", name: "北岸云", kind: "云厂商代理", verified: true, reputation: 94, deals: 186, joinedDays: 410, responseMins: 9, bio: "AWS 高级合作伙伴，专做 Bedrock 渠道，企业主体可签合同开票。", contact: "TG @beian_cloud · 企业微信" },
  { id: "xingcha", name: "星槎号池", kind: "号池", verified: false, reputation: 78, deals: 342, joinedDays: 150, responseMins: 4, bio: "Claude Max / Team 号池，自动轮换与补号，适合 Claude Code 场景。", contact: "TG @xingcha_pool" },
  { id: "xuanwu", name: "玄武算力", kind: "企业账户", verified: true, reputation: 91, deals: 64, joinedDays: 290, responseMins: 26, bio: "Azure OpenAI 企业额度分销，数据不留存，支持月结。", contact: "邮箱 biz@xuanwu.example" },
  { id: "chaosheng", name: "潮生科技", kind: "号池", verified: true, reputation: 86, deals: 512, joinedDays: 230, responseMins: 6, bio: "GPT Plus / Pro 号池规模化运营，Codex 场景专供。", contact: "TG @chaosheng_ai · QQ 群" },
  { id: "yuanfan", name: "远帆数据", kind: "云厂商代理", verified: true, reputation: 90, deals: 97, joinedDays: 330, responseMins: 15, bio: "Google Cloud 合作伙伴，Vertex AI 渠道，适合高并发批量任务。", contact: "TG @yuanfan_data" },
  { id: "qingtong", name: "青铜门", kind: "号池", verified: false, reputation: 69, deals: 121, joinedDays: 75, responseMins: 11, bio: "Kiro 渠道低价批发，价格敏感型中转首选。", contact: "TG @qingtong_gate" },
  { id: "daishan", name: "岱山", kind: "官方 Key 分销", verified: true, reputation: 88, deals: 58, joinedDays: 260, responseMins: 20, bio: "xAI 官方 Key 分销，提供官方账单截图。", contact: "TG @daishan_keys" },
  { id: "baita", name: "白塔批发", kind: "中转批发", verified: false, reputation: 81, deals: 233, joinedDays: 190, responseMins: 7, bio: "自营中转的批发分组，支持为下游开子分组、独立定价。", contact: "TG @baita_wholesale" },
];

interface SupplySeed extends Omit<SupplyItem, "probe" | "verification" | "updatedAt"> {
  probeBase: number;
  failRate: number;
  quality: number;
  updatedAgoH: number;
  tps: number;
}

const SEEDS: SupplySeed[] = [
  {
    id: "beian-bedrock-claude", supplierId: "beian", title: "AWS Bedrock · Claude 全系官方渠道", family: "anthropic", sourceType: "云厂商",
    models: ["claude-opus-5", "claude-sonnet-5", "claude-fable-5"], cnyPerUsd: 3.2, settlement: "预付", minOrder: "$1,000 起",
    rpm: 4000, concurrency: 200, features: ["Claude Code", "Prompt 缓存", "1M 上下文", "可开票"], afterSales: "可用率低于 99% 的时段按比例返还额度", stock: "充足",
    description: "企业主体 Bedrock 账户直出，请求不经过第三方转发。支持按下游子账号拆分用量，提供每日账单明细。",
    probeBase: 1600, failRate: 0.004, quality: 0.95, updatedAgoH: 3, tps: 72,
  },
  {
    id: "xingcha-claude-max", supplierId: "xingcha", title: "Claude Max 满血号池 · Claude Code 专用", family: "anthropic", sourceType: "号池",
    models: ["claude-opus-5", "claude-sonnet-5"], cnyPerUsd: 0.22, settlement: "预付", minOrder: "¥2,000 起",
    rpm: 600, concurrency: 60, features: ["Claude Code", "无注入", "不蒸馏"], afterSales: "封号 2 小时内补号，补号期间按时长顺延", stock: "紧张",
    description: "Max 20x 账号池，按会话粘性调度，适合长对话和 Agent 场景。不适合蒸馏和高并发批量任务。",
    probeBase: 3200, failRate: 0.03, quality: 0.8, updatedAgoH: 1, tps: 48,
  },
  {
    id: "xuanwu-azure-gpt", supplierId: "xuanwu", title: "Azure OpenAI 企业额度 · GPT 全系", family: "openai", sourceType: "云厂商",
    models: ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra"], cnyPerUsd: 3.6, settlement: "按量后付", minOrder: "月结，需签合同",
    rpm: 10000, concurrency: 500, features: ["Responses API", "数据不留存", "可开票", "SLA 99.9%"], afterSales: "SLA 未达标按合同赔付", stock: "充足",
    description: "Azure 企业协议额度，多区域部署自动切换。适合对合规和稳定性要求高的中转站做官转分组。",
    probeBase: 1300, failRate: 0.002, quality: 0.97, updatedAgoH: 8, tps: 95,
  },
  {
    id: "chaosheng-gpt-plus", supplierId: "chaosheng", title: "GPT Plus / Pro 号池 · Codex 专供", family: "openai", sourceType: "号池",
    models: ["gpt-5.6-sol", "gpt-6-astra", "gpt-5.6-luna"], cnyPerUsd: 0.035, settlement: "预付", minOrder: "¥500 起",
    rpm: 1200, concurrency: 120, features: ["Codex CLI", "不降智", "自动剔除失效号"], afterSales: "失效号 10 分钟内剔除，额度按实际消耗结算", stock: "充足",
    description: "Plus / Pro 混合号池，按账号健康度调度。实测 Codex CLI 长任务稳定，晚高峰首字会有波动。",
    probeBase: 2800, failRate: 0.015, quality: 0.84, updatedAgoH: 2, tps: 64,
  },
  {
    id: "yuanfan-vertex-gemini", supplierId: "yuanfan", title: "Vertex AI · Gemini 3.x 企业渠道", family: "google", sourceType: "云厂商",
    models: ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"], cnyPerUsd: 2.9, settlement: "按量后付", minOrder: "$300 起",
    rpm: 8000, concurrency: 300, features: ["多模态", "1M 上下文", "可开票"], afterSales: "故障期间自动切换备用项目，按分钟补偿", stock: "充足",
    description: "多个 GCP 项目配额聚合，适合批量翻译、摘要、多模态理解等高吞吐任务。",
    probeBase: 900, failRate: 0.003, quality: 0.93, updatedAgoH: 5, tps: 180,
  },
  {
    id: "qingtong-kiro", supplierId: "qingtong", title: "Kiro 渠道 · Claude 低价批发", family: "anthropic", sourceType: "Kiro",
    models: ["claude-sonnet-5", "claude-opus-4-8"], cnyPerUsd: 0.08, settlement: "预付", minOrder: "¥300 起",
    rpm: 300, concurrency: 30, features: ["Claude Code", "低价"], afterSales: "不保证长上下文，故障无补偿", stock: "紧张",
    description: "Kiro 渠道转出，价格极低，但上下文和并发有限制，适合做低价分组引流。",
    probeBase: 4200, failRate: 0.05, quality: 0.62, updatedAgoH: 12, tps: 41,
  },
  {
    id: "daishan-grok", supplierId: "daishan", title: "xAI 官方 Key 分销 · Grok 4.x", family: "xai", sourceType: "官方Key",
    models: ["grok-4.6", "grok-4.5"], cnyPerUsd: 2.5, settlement: "预付", minOrder: "$200 起",
    rpm: 3000, concurrency: 150, features: ["图像生成", "官方账单", "可开票"], afterSales: "Key 失效 1 小时内换新", stock: "充足",
    description: "官方团队账户分发的独立 Key，可提供官方后台账单截图核对用量。",
    probeBase: 1500, failRate: 0.006, quality: 0.9, updatedAgoH: 20, tps: 88,
  },
  {
    id: "baita-gpt-mixed", supplierId: "baita", title: "GPT 混合分组批发 · 支持二级分销", family: "openai", sourceType: "混合",
    models: ["gpt-5.6-sol", "gpt-5.5", "gpt-5.4"], cnyPerUsd: 0.06, settlement: "预付", minOrder: "¥1,000 起",
    rpm: 2000, concurrency: 200, features: ["Codex CLI", "子分组定价", "独立后台"], afterSales: "按分组可用率周结补偿", stock: "充足",
    description: "官转与号池混合调度的批发分组。可为下游中转开独立子分组并自定义倍率。",
    probeBase: 2400, failRate: 0.012, quality: 0.78, updatedAgoH: 6, tps: 70,
  },
  {
    id: "beian-opus-cache", supplierId: "beian", title: "Bedrock Claude Opus · 高缓存专线", family: "anthropic", sourceType: "云厂商",
    models: ["claude-opus-5"], cnyPerUsd: 2.9, settlement: "预付", minOrder: "$3,000 起",
    rpm: 2000, concurrency: 100, features: ["Prompt 缓存", "Claude Code", "独享配额"], afterSales: "独享配额，缓存命中率低于 80% 时按差额补偿", stock: "需预约",
    description: "为缓存命中率敏感的 Agent 场景单独配置的配额，需提前 3 天预约开通。",
    probeBase: 1450, failRate: 0.003, quality: 0.96, updatedAgoH: 30, tps: 66,
  },
  {
    id: "xingcha-claude-team", supplierId: "xingcha", title: "Claude Team 号池 · 稳定优先", family: "anthropic", sourceType: "号池",
    models: ["claude-sonnet-5", "claude-opus-5"], cnyPerUsd: 0.35, settlement: "预付", minOrder: "¥1,000 起",
    rpm: 400, concurrency: 40, features: ["Claude Code", "会话粘性"], afterSales: "封号 4 小时内补号", stock: "充足",
    description: "Team 账号池，单价比 Max 池略高，但封号率低、晚高峰更稳。",
    probeBase: 2600, failRate: 0.012, quality: 0.86, updatedAgoH: 4, tps: 52,
  },
  {
    id: "chaosheng-luna", supplierId: "chaosheng", title: "GPT Luna / Terra 轻量批量渠道", family: "openai", sourceType: "号池",
    models: ["gpt-5.6-luna", "gpt-5.6-terra"], cnyPerUsd: 0.02, settlement: "预付", minOrder: "¥200 起",
    rpm: 3000, concurrency: 300, features: ["批量任务", "高并发"], afterSales: "额度按实际消耗结算", stock: "充足",
    description: "轻量模型专用池，适合分类、抽取、翻译等不需要旗舰模型的任务。",
    probeBase: 1100, failRate: 0.01, quality: 0.8, updatedAgoH: 9, tps: 150,
  },
  {
    id: "yuanfan-gemini-burst", supplierId: "yuanfan", title: "Gemini Flash 高并发专线 · 包月", family: "google", sourceType: "云厂商",
    models: ["gemini-3.7-flash"], cnyPerUsd: 2.6, settlement: "包月", minOrder: "¥5,000 / 月起",
    rpm: 20000, concurrency: 1000, features: ["独享配额", "多模态", "可开票"], afterSales: "包月期内配额不足按天退费", stock: "需预约",
    description: "按月包配额的独享专线，峰值吞吐高，适合日处理量稳定的批量业务。",
    probeBase: 800, failRate: 0.002, quality: 0.92, updatedAgoH: 48, tps: 210,
  },
];

export const SUPPLY_ITEMS: SupplyItem[] = SEEDS.map((seed) => {
  const { probeBase, failRate, quality, updatedAgoH, tps, ...rest } = seed;
  const r = seeded(`supply:${seed.id}`);
  const curve = synthCurve(r, { base: probeBase, jitter: probeBase * 0.35, failRate });
  const okMs = curve.filter((p) => p.ms !== null).map((p) => p.ms as number);
  const h24 = uptime(curve);
  const checks = buildChecks(r, {
    family: seed.family,
    text: seed.features.join(" "),
    quality,
    claimed: null,
    measured: null,
    mystery: false,
    iqHtml: null,
  }).filter((c) => !["billing", "iq"].includes(c.key));
  checks.push({
    key: "billing",
    label: "报价核对",
    status: quality > 0.75 ? "pass" : "warn",
    value: quality > 0.75 ? "与报价一致" : "略高于报价",
    detail: quality > 0.75 ? "测试 Key 按报价扣费，与官方计价口径一致。" : "测试 Key 扣费比报价高约 6%，可能存在隐藏的模型倍率。",
  });
  const { status, score } = summarizeChecks(checks);
  return {
    ...rest,
    updatedAt: new Date(NOW - updatedAgoH * HOUR).toISOString(),
    probe: {
      h24,
      d7: round(Math.min(100, (h24 ?? 99) - between(r, 0, 0.8)), 1),
      p50: percentile(okMs, 50),
      p95: percentile(okMs, 95),
      tps,
      curve,
    },
    verification: { status, score, checks },
  };
});

const slugAt = (i: number) => CHANNEL_NAMES[i].slug;

export const WANTED_POSTS: WantedPost[] = [
  {
    id: "w-opus-official", authorSlug: slugAt(2), title: "求 Claude Opus 官转渠道，月量约 30 亿 token", family: "anthropic", models: ["claude-opus-5"],
    volume: "约 30 亿 token / 月", target: "≤ ¥3.0 / 刀", settlement: "可预付 1 个月", status: "洽谈中",
    requirements: ["支持 Prompt 缓存", "首字 p50 < 3 秒", "可用率 ≥ 99.5%", "可开票优先"],
    postedAt: new Date(NOW - 20 * HOUR).toISOString(), views: 412,
    detail: "现有官转分组的上游最近两周故障较多，想找一家稳定的备份渠道，先小量接入跑一周，再谈长期价格。",
    responses: [
      { supplierId: "beian", supplyId: "beian-bedrock-claude", offer: "¥2.95 / 刀", note: "预付 $10,000 以上给到这个价，可先开 $200 测试 Key。", at: new Date(NOW - 18 * HOUR).toISOString() },
      { supplierId: "beian", supplyId: "beian-opus-cache", offer: "¥2.80 / 刀", note: "高缓存专线更适合 Agent 场景，需要提前预约配额。", at: new Date(NOW - 17 * HOUR).toISOString() },
      { supplierId: "xingcha", supplyId: "xingcha-claude-max", offer: "¥0.25 / 刀", note: "号池不是官转，但 Claude Code 场景体验接近，可以作为低价分组。", at: new Date(NOW - 12 * HOUR).toISOString() },
    ],
  },
  {
    id: "w-gpt-plus-pool", authorSlug: slugAt(11), title: "长期收 GPT Plus 号池货，Codex 专用", family: "openai", models: ["gpt-5.6-sol", "gpt-6-astra"],
    volume: "日均 5,000 万 token", target: "≤ ¥0.04 / 刀", settlement: "周结或预付均可", status: "开放报价",
    requirements: ["Codex CLI 长任务不断流", "不降智（能力题库 ≥ 17/20）", "失效号自动剔除"],
    postedAt: new Date(NOW - 6 * HOUR).toISOString(), views: 198,
    detail: "下游主要是 Codex 用户，对降智非常敏感，报价时请附上平台验真报告链接。",
    responses: [
      { supplierId: "chaosheng", supplyId: "chaosheng-gpt-plus", offer: "¥0.035 / 刀", note: "平台验真报告见货源详情页，可先开 ¥100 测试额度。", at: new Date(NOW - 5 * HOUR).toISOString() },
      { supplierId: "baita", supplyId: "baita-gpt-mixed", offer: "¥0.055 / 刀", note: "混合分组更稳，但价格高一点，可以开独立子分组。", at: new Date(NOW - 3 * HOUR).toISOString() },
    ],
  },
  {
    id: "w-gemini-batch", authorSlug: slugAt(24), title: "找 Gemini Flash 高并发渠道做批量翻译", family: "google", models: ["gemini-3.7-flash"],
    volume: "峰值 ≥ 5,000 RPM", target: "≤ ¥3.0 / 刀", settlement: "按量后付", status: "已成交",
    requirements: ["RPM ≥ 5,000", "多模态输入", "可开票"],
    postedAt: new Date(NOW - 5 * 24 * HOUR).toISOString(), views: 655,
    detail: "企业客户的文档翻译项目，需要稳定高吞吐，价格可以谈。",
    responses: [
      { supplierId: "yuanfan", supplyId: "yuanfan-gemini-burst", offer: "¥2.6 / 刀（包月）", note: "已按包月专线成交，双方已确认交易。", at: new Date(NOW - 4 * 24 * HOUR).toISOString() },
    ],
  },
  {
    id: "w-grok-image", authorSlug: slugAt(33), title: "Grok 图像生成渠道，需要官方账单", family: "xai", models: ["grok-4.6"],
    volume: "每月约 20 万张图", target: "官方价 4 折以内", settlement: "预付", status: "开放报价",
    requirements: ["官方账单可核对", "图像接口兼容", "Key 失效快速更换"],
    postedAt: new Date(NOW - 30 * HOUR).toISOString(), views: 143,
    detail: "新开 Grok 图像分组，需要能提供官方账单截图的上游，避免被下游质疑来源。",
    responses: [
      { supplierId: "daishan", supplyId: "daishan-grok", offer: "¥2.5 / 刀", note: "官方团队账户，账单截图每周提供一次。", at: new Date(NOW - 26 * HOUR).toISOString() },
    ],
  },
  {
    id: "w-claude-code-pool", authorSlug: slugAt(41), title: "收稳定的 Claude Code 号池，接受 Kiro", family: "anthropic", models: ["claude-sonnet-5", "claude-opus-5"],
    volume: "日均 2 亿 token", target: "≤ ¥0.3 / 刀", settlement: "预付", status: "洽谈中",
    requirements: ["Claude Code 兼容性验真通过", "无提示词注入", "晚高峰首字 < 6 秒"],
    postedAt: new Date(NOW - 50 * HOUR).toISOString(), views: 367,
    detail: "下游主要是个人开发者，价格敏感，但不能接受注入和降智。",
    responses: [
      { supplierId: "xingcha", supplyId: "xingcha-claude-team", offer: "¥0.30 / 刀", note: "Team 池封号率低，晚高峰更稳。", at: new Date(NOW - 46 * HOUR).toISOString() },
      { supplierId: "qingtong", supplyId: "qingtong-kiro", offer: "¥0.09 / 刀", note: "Kiro 渠道价格最低，但上下文有限制。", at: new Date(NOW - 40 * HOUR).toISOString() },
    ],
  },
  {
    id: "w-azure-contract", authorSlug: slugAt(52), title: "寻 Azure OpenAI 企业额度，需签合同开票", family: "openai", models: ["gpt-6-astra", "gpt-5.6-sol"],
    volume: "每月约 $20,000", target: "官方价 5 折以内", settlement: "月结", status: "开放报价",
    requirements: ["企业主体签约", "增值税专票", "数据不留存承诺"],
    postedAt: new Date(NOW - 3 * HOUR).toISOString(), views: 61,
    detail: "面向企业客户的官转分组，需要完整的合同和发票流程。",
    responses: [],
  },
];

export const getSupplier = (id: string) => SUPPLIERS.find((s) => s.id === id);
export const getSupply = (id: string) => SUPPLY_ITEMS.find((s) => s.id === id);
export const getWanted = (id: string) => WANTED_POSTS.find((w) => w.id === id);
