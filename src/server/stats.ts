import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { rawRows, type DB } from "@/db";
import { channels, offeringModels, offerings, offeringStats, probeResults, reviews, verificationRuns } from "@/db/schema";
import { ERROR_LABEL, percentile } from "@/lib/probe";
import { clamp, round } from "@/lib/rand";
import type { DailyUptime, ErrorClass, ScorePart } from "@/lib/types";

const HOUR = 3_600_000;
const BUCKET_MS = 20 * 60_000;
const BUCKETS = 72;

interface Row {
  modelId: string;
  checkedAt: Date;
  state: "ok" | "slow" | "fail" | "excluded";
  ttftMs: number | null;
  tps: number | null;
  errorClass: string | null;
  error: string | null;
}

const uptimeOf = (rows: Pick<Row, "state">[]) => {
  const counted = rows.filter((r) => r.state !== "excluded");
  return counted.length ? round((counted.filter((r) => r.state !== "fail").length / counted.length) * 100, 1) : null;
};

/** 24 小时 72 格探测条的编码：正数为首字毫秒，-1 为计入的失败，-2 为不计入或无数据 */
function buildBars(rows: Row[], now: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < BUCKETS; i++) {
    const start = now - (BUCKETS - i) * BUCKET_MS;
    const inBucket = rows.filter((r) => r.checkedAt.getTime() >= start && r.checkedAt.getTime() < start + BUCKET_MS);
    if (inBucket.some((r) => r.state === "fail")) bars.push(-1);
    else {
      const ok = inBucket.filter((r) => r.ttftMs !== null && (r.state === "ok" || r.state === "slow")).map((r) => r.ttftMs as number);
      bars.push(ok.length ? (percentile(ok, 50) ?? -2) : -2);
    }
  }
  return bars;
}

export async function recomputeOfferingStats(db: DB, ids?: string[]) {
  const now = Date.now();
  const list = await db
    .select({ id: offerings.id, claimed: offerings.claimedMultiplier, measured: offerings.measuredMultiplier, rate: channels.rechargeRate })
    .from(offerings)
    .innerJoin(channels, eq(channels.id, offerings.channelId))
    .where(ids?.length ? inArray(offerings.id, ids) : undefined);
  if (!list.length) return;
  const targetIds = list.map((o) => o.id);

  const primaries = await db.select().from(offeringModels).where(and(inArray(offeringModels.offeringId, targetIds), eq(offeringModels.primary, true)));
  const primaryOf = new Map(primaries.map((p) => [p.offeringId, p.modelId]));

  const rows24 = await db
    .select({
      offeringId: probeResults.offeringId,
      modelId: probeResults.modelId,
      checkedAt: probeResults.checkedAt,
      state: probeResults.state,
      ttftMs: probeResults.ttftMs,
      tps: probeResults.tps,
      errorClass: probeResults.errorClass,
      error: probeResults.error,
    })
    .from(probeResults)
    .where(and(inArray(probeResults.offeringId, targetIds), gte(probeResults.checkedAt, new Date(now - 24 * HOUR))))
    .orderBy(probeResults.checkedAt);

  const dailyRows = await db
    .select({
      offeringId: probeResults.offeringId,
      modelId: probeResults.modelId,
      day: sql<string>`to_char(${probeResults.checkedAt} at time zone 'Asia/Shanghai', 'YYYY-MM-DD')`,
      ok: sql<number>`count(*) filter (where ${probeResults.state} in ('ok','slow'))`.mapWith(Number),
      counted: sql<number>`count(*) filter (where ${probeResults.state} <> 'excluded')`.mapWith(Number),
    })
    .from(probeResults)
    .where(and(inArray(probeResults.offeringId, targetIds), gte(probeResults.checkedAt, new Date(now - 30 * 24 * HOUR))))
    .groupBy(probeResults.offeringId, probeResults.modelId, sql`3`);

  const dayKeys = Array.from({ length: 30 }, (_, i) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(now - (29 - i) * 24 * HOUR)),
  );

  for (const o of list) {
    const primary = primaryOf.get(o.id);
    const mine = rows24.filter((r) => r.offeringId === o.id) as (Row & { offeringId: string })[];
    const main = mine.filter((r) => r.modelId === primary);
    const latestRow = main[main.length - 1];
    const okMs = main.filter((r) => r.state !== "fail" && r.state !== "excluded" && r.ttftMs !== null).map((r) => r.ttftMs as number);
    const tpsVals = main.map((r) => r.tps).filter((v): v is number => typeof v === "number");

    const days = dailyRows.filter((d) => d.offeringId === o.id && d.modelId === primary);
    const daily: DailyUptime[] = dayKeys.map((date) => {
      const d = days.find((x) => x.day === date);
      return { date, value: d && d.counted ? round((d.ok / d.counted) * 100, 1) : null };
    });
    const sumDays = (n: number) => {
      const recent = days.filter((d) => dayKeys.slice(-n).includes(d.day));
      const counted = recent.reduce((s, d) => s + d.counted, 0);
      return counted ? round((recent.reduce((s, d) => s + d.ok, 0) / counted) * 100, 1) : null;
    };

    const modelTtft: Record<string, number | null> = {};
    for (const modelId of new Set(mine.map((r) => r.modelId))) {
      modelTtft[modelId] = percentile(
        mine.filter((r) => r.modelId === modelId && r.ttftMs !== null && r.state !== "fail").map((r) => r.ttftMs as number),
        50,
      );
    }

    const values = {
      updatedAt: new Date(now),
      latest: latestRow
        ? {
            ok: latestRow.state === "ok" || latestRow.state === "slow",
            ttftMs: latestRow.ttftMs,
            checkedAt: latestRow.checkedAt.toISOString(),
            errorClass: latestRow.errorClass,
            error: latestRow.error,
          }
        : null,
      excludedReason: latestRow?.state === "excluded" ? ERROR_LABEL[(latestRow.errorClass ?? "key") as ErrorClass] : null,
      h24: uptimeOf(main),
      d7: sumDays(7),
      d30: sumDays(30),
      p50: percentile(okMs, 50),
      p95: percentile(okMs, 95),
      tps: tpsVals.length ? Math.round(tpsVals.reduce((a, b) => a + b, 0) / tpsVals.length) : 0,
      bars: buildBars(main, now),
      daily,
      modelTtft,
      daoPrice: round((o.measured ?? o.claimed ?? 0.1) * o.rate, 4),
    };
    await db
      .insert(offeringStats)
      .values({ offeringId: o.id, ...values })
      .onConflictDoUpdate({ target: offeringStats.offeringId, set: values });
  }
}

/** 综合分依赖同族价格排名，必须在所有统计更新后整体重算 */
export async function recomputeScores(db: DB) {
  const rows = await db
    .select({
      id: offerings.id,
      family: sql<string>`(select m.family from offering_models om join models m on m.id = om.model_id where om.offering_id = ${offerings.id} and om."primary" limit 1)`,
      dao: offeringStats.daoPrice,
      h24: offeringStats.h24,
      d7: offeringStats.d7,
      p50: offeringStats.p50,
      excluded: offeringStats.excludedReason,
      channelId: offerings.channelId,
      createdAt: channels.createdAt,
    })
    .from(offerings)
    .innerJoin(offeringStats, eq(offeringStats.offeringId, offerings.id))
    .innerJoin(channels, eq(channels.id, offerings.channelId));

  const verify = await rawRows<{ offering_id: string; score: number; checked_at: string }>(
    db,
    sql`select distinct on (offering_id) offering_id, score, checked_at from ${verificationRuns} order by offering_id, checked_at desc`,
  );
  const verifyOf = new Map(verify.map((v) => [v.offering_id, v]));
  const ratings = await db
    .select({ channelId: reviews.channelId, avg: sql<number>`avg(${reviews.rating})`.mapWith(Number) })
    .from(reviews)
    .groupBy(reviews.channelId);
  const ratingOf = new Map(ratings.map((r) => [r.channelId, r.avg]));
  const now = Date.now();

  const byFamily = new Map<string, typeof rows>();
  for (const r of rows) byFamily.set(r.family, [...(byFamily.get(r.family) ?? []), r]);

  for (const group of byFamily.values()) {
    const sorted = [...group].sort((a, b) => a.dao - b.dao);
    for (const [idx, r] of sorted.entries()) {
      const pricePct = sorted.length > 1 ? idx / (sorted.length - 1) : 0.5;
      const av = r.excluded ? null : (r.d7 ?? r.h24);
      const latency = r.p50 === null ? 0 : clamp((Math.log(20_000) - Math.log(r.p50)) / (Math.log(20_000) - Math.log(800)), 0, 1);
      const v = verifyOf.get(r.id);
      const stale = v ? now - Date.parse(v.checked_at) > 2 * 24 * HOUR : true;
      const ageDays = (now - r.createdAt.getTime()) / (24 * HOUR);
      const parts: ScorePart[] = [
        { label: "可用率", value: av === null ? 8 : 30 * clamp((av - 85) / 15, 0, 1), max: 30 },
        { label: "验真", value: 25 * ((v?.score ?? 50) / 100) * (stale ? 0.8 : 1), max: 25 },
        { label: "真实单价", value: 15 * (1 - pricePct), max: 15 },
        { label: "延迟与速度", value: 15 * latency, max: 15 },
        { label: "口碑", value: 10 * ((ratingOf.get(r.channelId) ?? 3.5) / 5), max: 10 },
        { label: "站龄", value: 5 * Math.min(ageDays / 365, 1), max: 5 },
      ].map((p) => ({ ...p, value: round(p.value, 1) }));
      const score = Math.round(parts.reduce((s, p) => s + p.value, 0) * (r.excluded ? 0.75 : 1));
      await db.update(offeringStats).set({ score, scoreParts: parts }).where(eq(offeringStats.offeringId, r.id));
    }
  }
}
