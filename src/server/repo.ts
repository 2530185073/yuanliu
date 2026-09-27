import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb, rawRows } from "@/db";
import * as t from "@/db/schema";
import { FX } from "@/lib/format";
import type { CatalogModel, Family } from "@/lib/catalog";
import { ERROR_LABEL } from "@/lib/probe";
import type { Channel, CurvePoint, ErrorClass, Incident, Offering, OfferingListItem, Review, SourceType, Verification } from "@/lib/types";
import type { ModelCompareRow } from "@/lib/views";

const DAY = 86_400_000;

export const getModels = cache(async (): Promise<CatalogModel[]> => {
  const db = await getDb();
  const rows = await db.select().from(t.models).orderBy(t.models.sortOrder);
  return rows.map((m) => ({ id: m.id, family: m.family, tier: m.tier, input: m.input, output: m.output, cacheRead: m.cacheRead, contextK: m.contextK }));
});

type ChannelRow = typeof t.channels.$inferSelect;
type OfferingRow = typeof t.offerings.$inferSelect;
type StatsRow = typeof t.offeringStats.$inferSelect;

interface Loaded {
  channels: ChannelRow[];
  offerings: OfferingRow[];
  stats: Map<string, StatsRow>;
  modelsOf: Map<string, { modelId: string; primary: boolean }[]>;
  verification: Map<string, typeof t.verificationRuns.$inferSelect>;
  reviewAgg: Map<string, { avg: number; n: number }>;
  welfareOf: Map<string, (typeof t.welfare.$inferSelect)[]>;
  catalog: Map<string, CatalogModel>;
}

/** 一次取回公开可见的全部渠道和货；同一请求内复用 */
const loadPublic = cache(async (): Promise<Loaded> => {
  const db = await getDb();
  const [channels, catalog] = await Promise.all([db.select().from(t.channels).where(eq(t.channels.status, "approved")), getModels()]);
  const channelIds = channels.map((c) => c.id);
  if (!channelIds.length) {
    return { channels, offerings: [], stats: new Map(), modelsOf: new Map(), verification: new Map(), reviewAgg: new Map(), welfareOf: new Map(), catalog: new Map() };
  }
  const offerings = await db.select().from(t.offerings).where(and(inArray(t.offerings.channelId, channelIds), eq(t.offerings.status, "active")));
  const ids = offerings.map((o) => o.id);
  const [stats, om, verify, reviewAgg, welfare] = await Promise.all([
    ids.length ? db.select().from(t.offeringStats).where(inArray(t.offeringStats.offeringId, ids)) : [],
    ids.length ? db.select().from(t.offeringModels).where(inArray(t.offeringModels.offeringId, ids)) : [],
    ids.length
      ? rawRows<{ id: number }>(db, sql`select distinct on (offering_id) id from ${t.verificationRuns} where offering_id in ${ids} order by offering_id, checked_at desc`)
      : [],
    db
      .select({ channelId: t.reviews.channelId, avg: sql<number>`avg(${t.reviews.rating})`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) })
      .from(t.reviews)
      .where(inArray(t.reviews.channelId, channelIds))
      .groupBy(t.reviews.channelId),
    db.select().from(t.welfare).where(inArray(t.welfare.channelId, channelIds)),
  ]);
  const runIds = verify.map((r) => Number(r.id));
  const runs = runIds.length ? await db.select().from(t.verificationRuns).where(inArray(t.verificationRuns.id, runIds)) : [];

  const modelsOf = new Map<string, { modelId: string; primary: boolean }[]>();
  for (const m of om) modelsOf.set(m.offeringId, [...(modelsOf.get(m.offeringId) ?? []), m].sort((a, b) => Number(b.primary) - Number(a.primary)));
  const welfareOf = new Map<string, (typeof t.welfare.$inferSelect)[]>();
  for (const w of welfare) welfareOf.set(w.channelId, [...(welfareOf.get(w.channelId) ?? []), w]);

  return {
    channels,
    offerings,
    stats: new Map(stats.map((s) => [s.offeringId, s])),
    modelsOf,
    verification: new Map(runs.map((r) => [r.offeringId, r])),
    reviewAgg: new Map(reviewAgg.map((r) => [r.channelId, r])),
    welfareOf,
    catalog: new Map(catalog.map((m) => [m.id, m])),
  };
});

function verificationOf(run: typeof t.verificationRuns.$inferSelect | undefined, excluded: boolean): Verification {
  if (!run) return { status: "warn", score: 0, checkedAt: new Date(0).toISOString(), stale: true, mystery: false, checks: [], iqHtml: null };
  return {
    status: run.status,
    score: run.score,
    checkedAt: run.checkedAt.toISOString(),
    stale: excluded || Date.now() - run.checkedAt.getTime() > 2 * DAY,
    mystery: run.mystery,
    checks: run.checks,
    iqHtml: run.iqHtml ? (run.iqHtml.startsWith("/") ? run.iqHtml : `/api/iq/${run.id}`) : null,
  };
}

function risksOf(stats: StatsRow | undefined, v: Verification): string[] {
  const risks: string[] = [];
  if (stats?.excludedReason) risks.push(stats.excludedReason);
  if (v.checks.some((c) => c.key === "injection" && c.status === "fail")) risks.push("有提示词注入");
  if (v.checks.some((c) => c.key === "billing" && c.status === "fail")) risks.push("实测倍率高于宣称");
  if ((stats?.d7 ?? 100) < 92) risks.push("近期不稳定");
  if (v.status === "fail" && risks.length === (stats?.excludedReason ? 1 : 0)) risks.push("验真未通过");
  return risks;
}

function buildOffering(o: OfferingRow, ch: ChannelRow, L: Loaded, extra?: { curve: CurvePoint[]; incidents: Incident[]; history: Offering["history"] }): Offering {
  const s = L.stats.get(o.id);
  const models = L.modelsOf.get(o.id) ?? [];
  const primary = L.catalog.get(models[0]?.modelId ?? "");
  const verification = verificationOf(L.verification.get(o.id), Boolean(s?.excludedReason));
  const dao = s?.daoPrice ?? (o.measuredMultiplier ?? o.claimedMultiplier ?? 0.1) * ch.rechargeRate;
  return {
    id: o.id,
    channelSlug: ch.slug,
    group: o.groupName,
    family: (primary?.family ?? "openai") as Family,
    sourceType: o.sourceType as SourceType,
    scenes: o.scenes,
    risks: risksOf(s, verification),
    claimedText: o.claimedText,
    claimed: o.claimedMultiplier,
    measured: o.measuredMultiplier,
    multiplierSource: o.multiplierSource,
    effective: o.measuredMultiplier ?? o.claimedMultiplier ?? 0.1,
    daoPrice: dao,
    quotes: models.flatMap(({ modelId, primary: isPrimary }) => {
      const m = L.catalog.get(modelId);
      if (!m) return [];
      return [{ modelId, realInput: m.input * dao, realOutput: m.output * dao, realCache: m.cacheRead * dao, ttftMs: s?.modelTtft[modelId] ?? (isPrimary ? (s?.p50 ?? null) : null), tps: s?.tps ?? 0, primary: isPrimary }];
    }),
    probe: {
      latest: {
        ok: s?.latest?.ok ?? false,
        ttftMs: s?.latest?.ttftMs ?? null,
        checkedAt: s?.latest?.checkedAt ?? new Date(0).toISOString(),
        errorClass: (s?.latest?.errorClass ?? null) as ErrorClass | null,
        error: s?.latest?.error ?? null,
      },
      excludedReason: s?.excludedReason ?? null,
      h24: s?.h24 ?? null,
      d7: s?.d7 ?? null,
      d30: s?.d30 ?? null,
      p50: s?.p50 ?? null,
      p95: s?.p95 ?? null,
      tps: s?.tps ?? 0,
      curve: extra?.curve ?? [],
      bars: s?.bars ?? [],
      daily: s?.daily ?? [],
      incidents: extra?.incidents ?? [],
    },
    verification,
    score: s?.score ?? 0,
    scoreParts: s?.scoreParts ?? [],
    history: extra?.history ?? [],
    cluster: o.upstreamSupplyId ? { supplyId: o.upstreamSupplyId, confidence: o.upstreamConfidence ?? 0, disclosed: o.upstreamDisclosed } : null,
    sponsored: o.sponsored,
  };
}

function toListItem(off: Offering, ch: ChannelRow, L: Loaded): OfferingListItem {
  const s = L.stats.get(off.id);
  const primary = off.quotes[0];
  return {
    id: off.id,
    channelSlug: ch.slug,
    channelName: ch.name,
    domain: ch.domain,
    claimed: Boolean(ch.ownerId),
    invoice: ch.invoice,
    payMethods: ch.payMethods,
    welfare: (L.welfareOf.get(ch.id)?.length ?? 0) > 0,
    group: off.group,
    family: off.family,
    sourceType: off.sourceType,
    scenes: off.scenes,
    risks: off.risks,
    primaryModel: primary?.modelId ?? "—",
    modelCount: off.quotes.length,
    daoPrice: off.daoPrice,
    priceSource: off.multiplierSource,
    primaryInput: primary?.realInput ?? 0,
    primaryOutput: primary?.realOutput ?? 0,
    ttft: off.probe.p50,
    ttft95: off.probe.p95,
    tps: off.probe.tps,
    h24: off.probe.h24,
    d7: off.probe.d7,
    excludedReason: off.probe.excludedReason,
    bars: s?.bars ?? [],
    verify: off.verification.status,
    verifyScore: off.verification.score,
    mystery: off.verification.mystery,
    score: off.score,
    sponsored: off.sponsored,
    ageDays: Math.round((Date.now() - ch.createdAt.getTime()) / DAY),
  };
}

export const getListItems = cache(async (): Promise<OfferingListItem[]> => {
  const L = await loadPublic();
  const byId = new Map(L.channels.map((c) => [c.id, c]));
  return L.offerings.map((o) => {
    const ch = byId.get(o.channelId)!;
    return toListItem(buildOffering(o, ch, L), ch, L);
  });
});

export async function getHomeSummary() {
  const L = await loadPublic();
  return { channels: L.channels.length, offerings: L.offerings.length };
}

function channelShell(ch: ChannelRow, L: Loaded, offerings: Offering[], reviews: Review[]): Channel {
  const agg = L.reviewAgg.get(ch.id);
  return {
    slug: ch.slug,
    name: ch.name,
    tagline: ch.tagline,
    domain: ch.domain,
    siteUrl: ch.siteUrl,
    system: (ch.system as Channel["system"]) ?? "未识别",
    firstSeen: ch.createdAt.toISOString(),
    ageDays: Math.round((Date.now() - ch.createdAt.getTime()) / DAY),
    claimed: Boolean(ch.ownerId),
    invoice: ch.invoice,
    payMethods: ch.payMethods,
    minTopup: ch.minTopup,
    rechargeRate: ch.rechargeRate,
    rechargeText: ch.rechargeRate < 1 ? `1 元 = ${Number((1 / ch.rechargeRate).toFixed(2))} 刀` : `${Number(ch.rechargeRate.toFixed(2))} 元 = 1 刀`,
    contact: ch.contact ?? "",
    welfare: (L.welfareOf.get(ch.id) ?? []).map((w) => ({ kind: w.kind, title: w.title, detail: w.detail })),
    rating: agg ? Number(agg.avg.toFixed(1)) : 0,
    reviewCount: agg?.n ?? 0,
    reviews,
    ratingTags: [],
    offerings,
    score: Math.max(0, ...offerings.map((o) => o.score)),
    families: [...new Set(offerings.map((o) => o.family))],
  };
}

function incidentsFrom(rows: { checkedAt: Date; state: string; errorClass: string | null; error: string | null }[], offeringId: string): Incident[] {
  const out: Incident[] = [];
  for (let i = 0; i < rows.length; ) {
    const state = rows[i].state;
    if (state !== "fail" && state !== "excluded") {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].state === state) j++;
    const end = j + 1 < rows.length ? rows[j + 1].checkedAt : null;
    const kind = (state === "fail" ? (rows[i].errorClass ?? "site") : (rows[i].errorClass ?? "key")) as ErrorClass;
    out.push({
      id: `${offeringId}-${rows[i].checkedAt.getTime()}`,
      start: rows[i].checkedAt.toISOString(),
      end: end?.toISOString() ?? null,
      minutes: Math.max(5, Math.round(((end?.getTime() ?? Date.now()) - rows[i].checkedAt.getTime()) / 60_000)),
      kind,
      summary: rows[i].error?.replace(/\s*\(request id:.*$/, "") || ERROR_LABEL[kind],
      counted: state === "fail",
    });
    i = j + 1;
  }
  return out.reverse();
}

export async function getChannelView(slug: string): Promise<(Channel & { id: string; ownerId: string | null }) | null> {
  const L = await loadPublic();
  const ch = L.channels.find((c) => c.slug === slug);
  if (!ch) return null;
  const db = await getDb();
  const mine = L.offerings.filter((o) => o.channelId === ch.id);
  const ids = mine.map((o) => o.id);
  const [probes, events, reviewRows] = await Promise.all([
    ids.length
      ? db
          .select({ offeringId: t.probeResults.offeringId, modelId: t.probeResults.modelId, checkedAt: t.probeResults.checkedAt, state: t.probeResults.state, ttftMs: t.probeResults.ttftMs, errorClass: t.probeResults.errorClass, error: t.probeResults.error })
          .from(t.probeResults)
          .where(and(inArray(t.probeResults.offeringId, ids), gte(t.probeResults.checkedAt, new Date(Date.now() - 7 * DAY))))
          .orderBy(t.probeResults.checkedAt)
      : [],
    ids.length ? db.select().from(t.priceEvents).where(inArray(t.priceEvents.offeringId, ids)).orderBy(desc(t.priceEvents.at)) : [],
    db.select().from(t.reviews).where(eq(t.reviews.channelId, ch.id)).orderBy(desc(t.reviews.createdAt)).limit(30),
  ]);
  const offerings = mine.map((o) => {
    const primary = L.modelsOf.get(o.id)?.[0]?.modelId;
    const rows = probes.filter((p) => p.offeringId === o.id && p.modelId === primary);
    const day = rows.filter((r) => r.checkedAt.getTime() >= Date.now() - DAY);
    return buildOffering(o, ch, L, {
      curve: day.map((r) => ({ t: r.checkedAt.toISOString(), ms: r.ttftMs, state: r.state })),
      incidents: incidentsFrom(rows, o.id),
      history: events.filter((e) => e.offeringId === o.id).map((e) => ({ at: e.at.toISOString(), text: e.text, delta: e.delta })),
    });
  });
  const reviews: Review[] = reviewRows.map((r) => ({ author: r.authorName, rating: r.rating, text: r.text, tags: r.tags, at: r.createdAt.toISOString(), reply: r.reply ?? undefined }));
  return { ...channelShell(ch, L, offerings, reviews), id: ch.id, ownerId: ch.ownerId };
}

/** 对比页、首页推荐等需要多份货的完整信息 */
export async function getOfferingsWithChannel(ids: string[]) {
  const L = await loadPublic();
  const byId = new Map(L.channels.map((c) => [c.id, c]));
  return ids.flatMap((id) => {
    const o = L.offerings.find((x) => x.id === id);
    if (!o) return [];
    const ch = byId.get(o.channelId)!;
    const offering = buildOffering(o, ch, L);
    return [{ o: offering, ch: channelShell(ch, L, [offering], []) }];
  });
}

export async function getTopOfferingIds(n: number) {
  const items = await getListItems();
  return items.filter((i) => !i.excludedReason).sort((a, b) => b.score - a.score).slice(0, n).map((i) => i.id);
}

export async function getCompareRows(modelId: string): Promise<ModelCompareRow[]> {
  const L = await loadPublic();
  const official = L.catalog.get(modelId);
  if (!official) return [];
  const byId = new Map(L.channels.map((c) => [c.id, c]));
  return L.offerings.flatMap((o) => {
    if (!L.modelsOf.get(o.id)?.some((m) => m.modelId === modelId)) return [];
    const ch = byId.get(o.channelId)!;
    const off = buildOffering(o, ch, L);
    const q = off.quotes.find((x) => x.modelId === modelId)!;
    return [
      {
        id: off.id,
        channelSlug: ch.slug,
        channelName: ch.name,
        group: off.group,
        family: off.family,
        sourceType: off.sourceType,
        input: q.realInput,
        output: q.realOutput,
        cache: q.realCache,
        fold: (q.realOutput / (official.output * FX)) * 10,
        ttft: q.ttftMs,
        tps: q.tps,
        h24: off.probe.h24,
        d7: off.probe.d7,
        excluded: off.probe.excludedReason,
        verify: off.verification.status,
        stale: off.verification.stale,
        mystery: off.verification.mystery,
        score: off.score,
        risks: off.risks,
      },
    ];
  });
}

export async function getOfferingsForSupply(supplyId: string) {
  const L = await loadPublic();
  const byId = new Map(L.channels.map((c) => [c.id, c]));
  return L.offerings
    .filter((o) => o.upstreamSupplyId === supplyId)
    .map((o) => {
      const ch = byId.get(o.channelId)!;
      return { id: o.id, channelSlug: ch.slug, channelName: ch.name, group: o.groupName, daoPrice: L.stats.get(o.id)?.daoPrice ?? 0 };
    });
}

export async function getPeerOfferings(offeringId: string, supplyId: string) {
  return (await getOfferingsForSupply(supplyId)).filter((p) => p.id !== offeringId);
}