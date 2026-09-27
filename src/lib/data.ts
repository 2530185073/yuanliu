import snapshot from "../../data/relay-snapshot.json";
import { FAMILIES, familyFromType, getModel, hasModel, MODELS, type Family } from "./catalog";
import { FX, yuan } from "./format";
import { CHANNEL_NAMES } from "./names";
import { classifyError, DAY, encodeBars, ERROR_LABEL, HOUR, MINUTE, NOW, percentile, summarizeChecks, synthDaily, uptime } from "./probe";
import { between, chance, clamp, hash, int, pick, round, sample, seeded, type Rng } from "./rand";
import { SUPPLY_ITEMS } from "./supply";
import type {
  Channel,
  CurvePoint,
  ErrorClass,
  Incident,
  ModelQuote,
  Offering,
  OfferingListItem,
  PriceEvent,
  Review,
  ScorePart,
  SourceType,
  Welfare,
} from "./types";
import { buildChecks } from "./verify";
import type { ModelCompareRow } from "./views";

interface RawPoint {
  t: string;
  ok: boolean;
  ms: number | null;
}

/** 匿名化后的探测快照：host 为匿名编号，不含站点名与网址 */
interface RawSite {
  id: string;
  host: string;
  group: string;
  type: string;
  model: string;
  multiplier: string;
  invoiceSupported: boolean;
  lastMultiplierSyncOk: boolean;
  latestProbe: { ok: boolean; firstTokenMs: number | null; error: string; checkedAt: string } | null;
  curvePoints: RawPoint[];
  iq: string | null;
  promotionAvailable: boolean;
}

const RAW = (snapshot as unknown as { sites: RawSite[] }).sites;

const iso = (ms: number) => new Date(ms).toISOString();

const TAGLINES = ["注册送试用，邀请有返利", "接难民，老用户迁移送额度", "稳定优先，不玩倍率套路", "晚高峰不限流", "站内有轻量模型可用"];

function parseMultiplier(text: string): number | null {
  const match = text.match(/余额\s*(\d+(?:\.\d+)?)/) ?? text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(Number(match[1]).toPrecision(4));
  return value > 0 && value <= 5 ? value : null;
}

function parseRecharge(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*元\s*=\s*(\d+(?:\.\d+)?)\s*刀/);
  return m ? Number(m[1]) / Number(m[2]) : null;
}

const rechargeLabel = (rate: number) => (rate < 1 ? `1 元 = ${round(1 / rate, 2)} 刀` : `${round(rate, 2)} 元 = 1 刀`);

function inferSource(text: string, r: Rng): SourceType {
  const t = text.toLowerCase();
  if (/官方key|官key/.test(t)) return "官方Key";
  if (/官转|官方/.test(t)) return "官转";
  if (/kiro/.test(t)) return "Kiro";
  if (/aws|bedrock|azure|vertex/.test(t)) return "云厂商";
  if (/逆向/.test(t)) return "逆向";
  if (/号池|max|plus|pro|team|满血/.test(t)) return "号池";
  return pick(r, ["号池", "号池", "官转", "混合", "逆向"] as const);
}

function inferScenes(text: string, family: Family, r: Rng): string[] {
  const scenes: string[] = [];
  if (family === "anthropic" && chance(r, 0.8)) scenes.push("Claude Code");
  if (family === "openai" && (/codex/i.test(text) || chance(r, 0.7))) scenes.push("Codex CLI");
  if (/蒸馏/.test(text) && !/不蒸馏/.test(text)) scenes.push("可蒸馏");
  if (/图|视频|多模态/.test(text)) scenes.push("多模态");
  if (/缓存/.test(text) || chance(r, 0.25)) scenes.push("高缓存");
  if (chance(r, 0.2)) scenes.push("高并发");
  return scenes;
}

const TPS_RANGE: Record<Family, [number, number]> = {
  openai: [42, 115],
  anthropic: [36, 82],
  google: [95, 210],
  xai: [50, 125],
};

const MEASURE_RANGE: Record<Family, [number, number]> = {
  openai: [0.06, 0.3],
  anthropic: [0.25, 1.1],
  google: [0.06, 0.2],
  xai: [0.05, 0.25],
};

const INCIDENT_SUMMARY = ["HTTP 502 Bad Gateway", "流式响应中途断开", "连接超时（60 秒无首字）", "HTTP 503 上游不可用", "上游账号调度失败"];

const REVIEW_POOL: Omit<Review, "author" | "at">[] = [
  { rating: 5, text: "晚高峰首字也能稳在 3 秒内，跑 Claude Code 一下午没断过。", tags: ["稳定", "速度快"] },
  { rating: 4, text: "价格确实便宜，但偶尔会遇到 429，需要自己做重试。", tags: ["便宜", "偶发限流"] },
  { rating: 5, text: "客服在 TG 群里回复很快，充值当天到账。", tags: ["客服好"] },
  { rating: 4, text: "上周有两次半夜挂了一个多小时，恢复后补偿了额度。", tags: ["有补偿", "偶发故障"] },
  { rating: 3, text: "感觉长上下文会被截断，超过 60K 后回答质量明显下降。", tags: ["疑似截断"] },
  { rating: 5, text: "缓存命中计费正常，账单和官方算法能对上。", tags: ["计费透明"] },
  { rating: 5, text: "分组说明写得很清楚，哪个分组能用 Codex 一目了然。", tags: ["信息透明"] },
  { rating: 3, text: "最近倍率涨了一次，没有提前公告，有点不爽。", tags: ["涨价未公告"] },
  { rating: 4, text: "注册送的试用额度够测完整个流程，适合先试再买。", tags: ["试用友好"] },
  { rating: 3, text: "高峰期吐字速度掉得厉害，适合不赶时间的批量任务。", tags: ["高峰变慢"] },
  { rating: 5, text: "开票流程顺利，公司报销没问题。", tags: ["可开票"] },
  { rating: 2, text: "偶尔返回内容风格和官方不太一样，怀疑混了别的模型。", tags: ["疑似掺水"] },
];

const REVIEWERS = ["linux.do · k***n", "linux.do · 阿*", "GitHub · m***o", "linux.do · 老*", "GitHub · z***y", "邮箱用户 · 1***8", "linux.do · s***t"];

const REPLIES = ["感谢反馈，晚高峰已扩容一批账号。", "已补偿额度，请查看钱包。", "倍率调整已补发公告，后续会提前 3 天通知。"];

interface ChannelContext {
  slug: string;
  rate: number;
  firstSeen: number;
  claimed: boolean;
}

function buildOffering(raw: RawSite, ctx: ChannelContext): Offering {
  const r = seeded(`of:${raw.id}`);
  const family = familyFromType(raw.type);
  const text = `${raw.group} ${raw.multiplier}`;
  const latest = raw.latestProbe;
  const latestClass: ErrorClass | null = latest && !latest.ok ? classifyError(latest.error) : null;
  const excludedClass = latestClass === "key" || latestClass === "config" ? latestClass : null;
  const cleanError = latest?.error ? latest.error.replace(/\s*\(request id:.*$/, "").trim() : null;

  const curve: CurvePoint[] = raw.curvePoints.map((p) => ({
    t: p.t,
    ms: p.ok ? p.ms : null,
    state: !p.ok ? "fail" : (p.ms ?? 0) > 10_000 ? "slow" : "ok",
  }));
  if (excludedClass) {
    for (let i = curve.length - 1; i >= 0 && curve[i].state === "fail"; i--) curve[i].state = "excluded";
  }

  const h24 = uptime(curve);
  const okMs = curve.filter((p) => p.state === "ok" || p.state === "slow").map((p) => p.ms as number);
  const p50 = percentile(okMs, 50);
  const p95 = percentile(okMs, 95);
  const d7 = h24 === null ? round(between(r, 92, 99.5), 1) : round(clamp(h24 + between(r, -2.2, 0.6), 55, 100), 1);
  const d30 = round(clamp(d7 + between(r, -2.4, 0.5), 55, 100), 1);
  const daily = synthDaily(r, d30, h24, excludedClass ? int(r, 1, 3) : 0);

  const incidents: Incident[] = [];
  for (let i = 0; i < curve.length; ) {
    const state = curve[i].state;
    if (state !== "fail" && state !== "excluded") {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < curve.length && curve[j + 1].state === state) j++;
    const end = j + 1 < curve.length ? curve[j + 1].t : null;
    const minutes = Math.max(5, Math.round(((end ? Date.parse(end) : NOW) - Date.parse(curve[i].t)) / MINUTE));
    incidents.push({
      id: `${raw.id}-c${i}`,
      start: curve[i].t,
      end,
      minutes,
      kind: state === "fail" ? "site" : (excludedClass ?? "key"),
      summary: state === "fail" ? (j === i ? "单次探测失败，下一轮已恢复" : pick(r, INCIDENT_SUMMARY)) : `${cleanError ?? "探测密钥不可用"}。已通知站长，恢复前不计入可用率。`,
      counted: state === "fail",
    });
    i = j + 1;
  }
  daily.forEach((day, idx) => {
    if (idx === daily.length - 1 || day.value === null || day.value >= 97) return;
    const start = Date.parse(`${day.date}T00:00:00Z`) + between(r, 1, 20) * HOUR;
    const minutes = Math.round(((100 - day.value) / 100) * 1440);
    incidents.push({ id: `${raw.id}-d${idx}`, start: iso(start), end: iso(start + minutes * MINUTE), minutes, kind: "site", summary: pick(r, INCIDENT_SUMMARY), counted: true });
  });
  incidents.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));

  const claimed = parseMultiplier(raw.multiplier);
  const mystery = claimed === null || chance(r, 0.4);
  let measured: number | null = null;
  if (mystery) {
    if (claimed === null) measured = round(between(r, ...MEASURE_RANGE[family]), 3);
    else if (chance(r, 0.22)) measured = round(claimed * between(r, 1.12, 1.6), 3);
    else measured = round(claimed * between(r, 0.98, 1.04), 3);
  }
  const effective = measured ?? claimed ?? 0.1;
  const daoPrice = round(effective * ctx.rate, 4);

  const primary = hasModel(raw.model) ? raw.model : MODELS.find((m) => m.family === family)!.id;
  const others = MODELS.filter((m) => m.family === family && m.id !== primary).map((m) => m.id);
  const extra = sample(r, others, pick(r, [0, 1, 1, 2]));
  const baseTtft = p50 ?? latest?.firstTokenMs ?? null;
  const tpsBase = between(r, ...TPS_RANGE[family]);
  const quotes: ModelQuote[] = [primary, ...extra].map((modelId, idx) => {
    const model = getModel(modelId);
    return {
      modelId,
      realInput: model.input * daoPrice,
      realOutput: model.output * daoPrice,
      realCache: model.cacheRead * daoPrice,
      ttftMs: baseTtft === null ? null : Math.round(baseTtft * (idx === 0 ? 1 : between(r, 0.75, 1.35))),
      tps: Math.round(tpsBase * (idx === 0 ? 1 : between(r, 0.8, 1.25))),
      primary: idx === 0,
    };
  });

  let quality = between(r, 0.55, 0.98);
  if (/不降智|满血|官转/.test(text)) quality += 0.05;
  if (/注入/.test(text)) quality -= 0.1;
  quality = clamp(quality, 0.3, 0.99);
  const iqHtml = raw.iq ? `/demo-iq/${raw.iq}.html` : null;
  const checks = buildChecks(r, { family, text, quality, claimed, measured, mystery, iqHtml });
  const { status, score: verifyScore } = summarizeChecks(checks);

  const risks: string[] = [];
  if (excludedClass) risks.push(ERROR_LABEL[excludedClass]);
  if (checks.some((c) => c.key === "injection" && c.status === "fail")) risks.push("有提示词注入");
  if (checks.some((c) => c.key === "billing" && c.status === "fail")) risks.push("实测倍率高于宣称");
  if (d7 < 92) risks.push("近期不稳定");
  if (status === "fail" && risks.length === (excludedClass ? 1 : 0)) risks.push("验真未通过");

  const history: PriceEvent[] = [];
  if (chance(r, 0.65)) {
    const prev = daoPrice * (chance(r, 0.6) ? between(r, 1.06, 1.3) : between(r, 0.78, 0.94));
    history.push({ at: iso(NOW - between(r, 0.2, 9) * DAY), text: `刀价 ${yuan(prev)} → ${yuan(daoPrice)}`, delta: (daoPrice - prev) / prev });
  }
  if (extra.length && chance(r, 0.6)) history.push({ at: iso(NOW - between(r, 10, 40) * DAY), text: `上架新模型 ${extra[0]}`, delta: null });
  if (chance(r, 0.4)) history.push({ at: iso(NOW - between(r, 15, 60) * DAY), text: "分组说明更新", delta: null });
  history.push({ at: iso(Math.max(ctx.firstSeen, NOW - between(r, 60, 200) * DAY)), text: "首次收录", delta: null });

  const sourceType = inferSource(text, r);
  const candidates = SUPPLY_ITEMS.filter(
    (s) =>
      s.family === family &&
      (s.sourceType === sourceType ||
        sourceType === "混合" ||
        (s.sourceType === "混合" && sourceType === "号池") ||
        (["官转", "官方Key"].includes(sourceType) && ["云厂商", "官方Key"].includes(s.sourceType))),
  );
  const cluster =
    candidates.length && chance(r, 0.55)
      ? { supplyId: pick(r, candidates).id, confidence: int(r, 61, 94), disclosed: ctx.claimed && chance(r, 0.35) }
      : null;

  return {
    id: raw.id,
    channelSlug: ctx.slug,
    group: raw.group.trim(),
    family,
    sourceType,
    scenes: inferScenes(text, family, r),
    risks,
    claimedText: /^[\d.]+$/.test(raw.multiplier.trim()) ? String(claimed ?? raw.multiplier.trim()) : raw.multiplier.trim(),
    claimed,
    measured,
    multiplierSource: claimed === null ? "measured" : raw.lastMultiplierSyncOk ? "synced" : "manual",
    effective,
    daoPrice,
    quotes,
    probe: {
      latest: {
        ok: latest?.ok ?? false,
        ttftMs: latest?.ok ? latest.firstTokenMs : null,
        checkedAt: latest?.checkedAt ?? iso(NOW),
        errorClass: latestClass,
        error: cleanError,
      },
      excludedReason: excludedClass ? ERROR_LABEL[excludedClass] : null,
      h24,
      d7,
      d30,
      p50,
      p95,
      tps: quotes[0].tps,
      curve,
      daily,
      incidents,
    },
    verification: {
      status,
      score: verifyScore,
      checkedAt: iso(excludedClass ? NOW - int(r, 2, 4) * DAY : NOW - between(r, 0.3, 6) * HOUR),
      stale: Boolean(excludedClass),
      mystery,
      checks,
      iqHtml,
    },
    score: 0,
    scoreParts: [],
    history: history.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    cluster,
    sponsored: false,
  };
}

function buildChannels(): Channel[] {
  const hosts = [...new Set(RAW.map((s) => s.host))].sort();
  return hosts.map((host, index) => {
    const r = seeded(`ch:${host}`);
    const { name, slug } = CHANNEL_NAMES[index];
    const raws = RAW.filter((s) => s.host === host);
    const allText = raws.map((s) => `${s.group} ${s.multiplier}`).join(" ");
    const tagline = chance(r, 0.35) ? pick(r, TAGLINES) : null;
    const rate = raws.map((s) => parseRecharge(`${s.group} ${s.multiplier}`)).find((v) => v !== null) ?? pick(r, [1, 1, 1, 1, 1, 0.8, 0.5, 2]);
    const firstSeen = NOW - between(r, 25, 520) * DAY;
    const claimed = chance(r, 0.55);

    const offerings = raws.map((raw) => buildOffering(raw, { slug, rate, firstSeen, claimed }));

    const reviews: Review[] = sample(r, REVIEW_POOL, 3)
      .map((review, i) => ({
        ...review,
        author: pick(r, REVIEWERS),
        at: iso(NOW - between(r, 0.5, 40) * DAY),
        reply: claimed && i === 0 && review.rating <= 4 ? pick(r, REPLIES) : undefined,
      }))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const tagCounts = new Map<string, number>();
    for (const tag of sample(r, REVIEW_POOL.flatMap((p) => p.tags), 5)) tagCounts.set(tag, int(r, 3, 60));
    for (const review of reviews) for (const tag of review.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + int(r, 5, 40));

    const welfare: Welfare[] = [];
    if (raws.some((s) => s.promotionAvailable)) {
      welfare.push({ kind: "code", title: "平台专属兑换码", detail: "领取后到站点注册，在钱包页兑换 $2 额度。每个账号、每台设备限领 1 次。", remaining: int(r, 6, 180) });
    }
    if (/送|试用/.test(tagline ?? "") || chance(r, 0.45)) {
      welfare.push({ kind: "trial", title: `注册送 $${pick(r, [0.5, 1, 2, 5])} 试用额度`, detail: "新用户注册即到账，可用于全部分组。" });
    }
    if (/邀请|返利/.test(allText) || chance(r, 0.35)) {
      welfare.push({ kind: "invite", title: `邀请返利 ${pick(r, [5, 8, 10, 15])}%`, detail: "被邀请人每次充值，邀请人获得对应比例的额度。" });
    }

    const order = ["支付宝", "微信支付", "USDT", "银行卡"];
    return {
      slug,
      name,
      tagline,
      domain: `${slug}.example`,
      siteUrl: `https://${slug}.example`,
      system: raws.some((s) => s.lastMultiplierSyncOk)
        ? pick(r, ["new-api", "sub2api"] as const)
        : pick(r, ["new-api", "new-api", "sub2api", "one-api", "未识别"] as const),
      firstSeen: iso(firstSeen),
      ageDays: Math.round((NOW - firstSeen) / DAY),
      claimed,
      invoice: raws.some((s) => s.invoiceSupported),
      payMethods: sample(r, order, int(r, 1, 3)).sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      minTopup: pick(r, [1, 5, 10, 20, 50]),
      rechargeRate: rate,
      rechargeText: rechargeLabel(rate),
      contact: `TG 群 @${slug}_api`,
      welfare,
      rating: round(between(r, 3.3, 4.9), 1),
      reviewCount: int(r, 3, 260),
      reviews,
      ratingTags: [...tagCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
      offerings,
      score: 0,
      families: [...new Set(offerings.map((o) => o.family))],
    };
  });
}

function scoreParts(o: Offering, ch: Channel, pricePct: number): ScorePart[] {
  const av = o.probe.h24 === null ? null : o.probe.d7;
  const latency = o.probe.p50 === null ? 0 : clamp((Math.log(20_000) - Math.log(o.probe.p50)) / (Math.log(20_000) - Math.log(800)), 0, 1);
  return [
    { label: "可用率", value: av === null ? 8 : 30 * clamp((av - 85) / 15, 0, 1), max: 30 },
    { label: "验真", value: 25 * (o.verification.score / 100) * (o.verification.stale ? 0.8 : 1), max: 25 },
    { label: "真实单价", value: 15 * (1 - pricePct), max: 15 },
    { label: "延迟与速度", value: 15 * latency, max: 15 },
    { label: "口碑", value: 10 * (ch.rating / 5), max: 10 },
    { label: "站龄", value: 5 * Math.min(ch.ageDays / 365, 1), max: 5 },
  ].map((p) => ({ ...p, value: round(p.value, 1) }));
}

export const CHANNELS: Channel[] = buildChannels();
export const OFFERINGS: Offering[] = CHANNELS.flatMap((c) => c.offerings);

const channelMap = new Map(CHANNELS.map((c) => [c.slug, c]));
export const getChannel = (slug: string) => channelMap.get(slug);
export const channelOf = (o: Offering) => channelMap.get(o.channelSlug)!;

for (const { id: family } of FAMILIES) {
  const list = OFFERINGS.filter((o) => o.family === family).sort((a, b) => a.daoPrice - b.daoPrice);
  list.forEach((o, idx) => {
    const parts = scoreParts(o, channelOf(o), list.length > 1 ? idx / (list.length - 1) : 0.5);
    o.scoreParts = parts;
    o.score = Math.round(parts.reduce((sum, p) => sum + p.value, 0) * (o.probe.excludedReason ? 0.75 : 1));
  });
}
for (const ch of CHANNELS) ch.score = Math.max(...ch.offerings.map((o) => o.score));

OFFERINGS.filter((o) => o.verification.status === "pass" && !o.probe.excludedReason && (o.probe.d7 ?? 0) >= 97)
  .sort((a, b) => hash(a.id) - hash(b.id))
  .slice(0, 2)
  .forEach((o) => {
    o.sponsored = true;
  });

export function toListItem(o: Offering): OfferingListItem {
  const ch = channelOf(o);
  const primary = o.quotes[0];
  return {
    id: o.id,
    channelSlug: ch.slug,
    channelName: ch.name,
    domain: ch.domain,
    claimed: ch.claimed,
    invoice: ch.invoice,
    payMethods: ch.payMethods,
    welfare: ch.welfare.length > 0,
    group: o.group,
    family: o.family,
    sourceType: o.sourceType,
    scenes: o.scenes,
    risks: o.risks,
    primaryModel: primary.modelId,
    modelCount: o.quotes.length,
    daoPrice: o.daoPrice,
    priceSource: o.multiplierSource,
    primaryInput: primary.realInput,
    primaryOutput: primary.realOutput,
    ttft: o.probe.p50,
    ttft95: o.probe.p95,
    tps: o.probe.tps,
    h24: o.probe.h24,
    d7: o.probe.d7,
    excludedReason: o.probe.excludedReason,
    bars: encodeBars(o.probe.curve),
    verify: o.verification.status,
    verifyScore: o.verification.score,
    mystery: o.verification.mystery,
    score: o.score,
    sponsored: o.sponsored,
    ageDays: ch.ageDays,
  };
}

export const LIST_ITEMS: OfferingListItem[] = OFFERINGS.map(toListItem);

export interface ModelRow {
  offering: Offering;
  channel: Channel;
  quote: ModelQuote;
}

export function rowsForModel(modelId: string): ModelRow[] {
  return OFFERINGS.flatMap((offering) => {
    const quote = offering.quotes.find((q) => q.modelId === modelId);
    return quote ? [{ offering, channel: channelOf(offering), quote }] : [];
  });
}

export const offeringsForSupply = (supplyId: string) => OFFERINGS.filter((o) => o.cluster?.supplyId === supplyId);

export function compareRows(modelId: string): ModelCompareRow[] {
  const official = getModel(modelId);
  return rowsForModel(modelId).map(({ offering: o, channel, quote }) => ({
    id: o.id,
    channelSlug: channel.slug,
    channelName: channel.name,
    group: o.group,
    family: o.family,
    sourceType: o.sourceType,
    input: quote.realInput,
    output: quote.realOutput,
    cache: quote.realCache,
    fold: (quote.realOutput / (official.output * FX)) * 10,
    ttft: quote.ttftMs,
    tps: quote.tps,
    h24: o.probe.h24,
    d7: o.probe.d7,
    excluded: o.probe.excludedReason,
    verify: o.verification.status,
    stale: o.verification.stale,
    mystery: o.verification.mystery,
    score: o.score,
    risks: o.risks,
  }));
}

const median = (values: number[]) => percentile(values, 50) ?? 0;

export const MARKET = FAMILIES.map(({ id, short }) => {
  const list = OFFERINGS.filter((o) => o.family === id && !o.probe.excludedReason);
  const changes = list.flatMap((o) => o.history.filter((h) => h.delta !== null && NOW - Date.parse(h.at) < 7 * DAY).map((h) => h.delta as number));
  const mid = median(list.map((o) => o.daoPrice));
  const change = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const r = seeded(`market:${id}`);
  const start = mid / (1 + change);
  const series = Array.from({ length: 7 }, (_, i) => (i === 6 ? mid : (start + ((mid - start) * i) / 6) * between(r, 0.97, 1.03)));
  return { family: id, short, count: list.length, median: mid, change, series };
});

export const TICKER = OFFERINGS.flatMap((o) => {
  const event = o.history.find((h) => h.delta !== null && NOW - Date.parse(h.at) < 7 * DAY);
  return event ? [{ id: o.id, channel: channelOf(o).name, slug: o.channelSlug, group: o.group, price: o.daoPrice, delta: event.delta as number }] : [];
})
  .sort((a, b) => hash(a.id) - hash(b.id))
  .slice(0, 18);

export const STATS = {
  offerings: OFFERINGS.length,
  channels: CHANNELS.length,
  verifiedRate: Math.round((OFFERINGS.filter((o) => o.verification.status === "pass").length / OFFERINGS.length) * 100),
  mystery: OFFERINGS.filter((o) => o.verification.mystery).length,
  siteDown: OFFERINGS.filter((o) => !o.probe.latest.ok && !o.probe.excludedReason).length,
  excluded: OFFERINGS.filter((o) => o.probe.excludedReason).length,
  probesPerDay: OFFERINGS.reduce((sum, o) => sum + o.quotes.length, 0) * 288,
};
