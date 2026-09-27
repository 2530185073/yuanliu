import { and, eq, inArray, lt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, models, offeringModels, offerings, offeringStats, priceEvents, probeResults, verificationRuns } from "@/db/schema";
import type { Family } from "@/lib/catalog";
import { between, chance, clamp } from "@/lib/rand";
import { detectSite } from "./adapter";
import { detectEvents, dispatchNotifications, snapshotStats } from "./notify";
import { runProbe, type Protocol } from "./probe/stream";
import { runVerification } from "./probe/verify-run";
import { decrypt } from "./secret";
import { recomputeOfferingStats, recomputeScores } from "./stats";

const INTERVAL_MS = Number(process.env.PROBE_INTERVAL_SEC ?? 300) * 1000;
const VERIFY_EVERY_MS = 6 * 3_600_000;
const SYNC_EVERY_MS = 6 * 3_600_000;
const BATCH = 24;
const CONCURRENCY = 6;

type ProbeRow = typeof probeResults.$inferInsert;

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]).catch((e) => console.error("[scheduler]", e));
  }));
}

/** 演示渠道没有真实 Key，按其历史特征生成模拟探测，保证演示环境数据不过期 */
function simulate(offeringId: string, modelId: string, stats: typeof offeringStats.$inferSelect | undefined): ProbeRow {
  const now = new Date();
  if (stats?.excludedReason) {
    return { offeringId, modelId, checkedAt: now, state: "excluded", errorClass: (stats.latest?.errorClass as ProbeRow["errorClass"]) ?? "key", error: stats.latest?.error ?? "探测密钥不可用", region: "demo" };
  }
  const failRate = clamp((100 - (stats?.d30 ?? 99)) / 100, 0.002, 0.08);
  if (chance(Math.random, failRate)) return { offeringId, modelId, checkedAt: now, state: "fail", errorClass: "site", error: "HTTP 502 Bad Gateway", region: "demo" };
  const ms = Math.round((stats?.p50 ?? 2500) * between(Math.random, 0.7, 1.4));
  return { offeringId, modelId, checkedAt: now, state: ms > 10_000 ? "slow" : "ok", ttftMs: ms, totalMs: ms + Math.round(between(Math.random, 400, 2500)), tps: stats?.tps || null, region: "demo" };
}

export async function tick() {
  const db = await getDb();
  const now = new Date();
  const due = await db
    .select({ o: offerings, ch: channels })
    .from(offerings)
    .innerJoin(channels, eq(channels.id, offerings.channelId))
    .where(and(eq(offerings.status, "active"), eq(channels.status, "approved"), lte(offerings.nextProbeAt, now)))
    .orderBy(offerings.nextProbeAt)
    .limit(BATCH);
  if (!due.length) return { probed: 0, verified: 0 };

  const ids = due.map((d) => d.o.id);
  const [om, stats, catalog] = await Promise.all([
    db.select().from(offeringModels).where(inArray(offeringModels.offeringId, ids)),
    db.select().from(offeringStats).where(inArray(offeringStats.offeringId, ids)),
    db.select({ id: models.id, family: models.family }).from(models),
  ]);
  const before = await snapshotStats(db, ids);
  let verified = 0;

  await pool(due, CONCURRENCY, async ({ o, ch }) => {
    const mine = om.filter((m) => m.offeringId === o.id).sort((a, b) => Number(b.primary) - Number(a.primary));
    const targets = mine.filter((m, i) => i === 0 || Math.random() < 1 / 6);
    const key = o.probeKeyEnc ? decrypt(o.probeKeyEnc) : null;
    const rows: ProbeRow[] = [];

    for (const m of targets) {
      if (key) {
        const r = await runProbe({ baseUrl: ch.baseUrl, apiKey: key, protocol: o.protocol as Protocol, model: m.modelId });
        rows.push({ offeringId: o.id, modelId: m.modelId, checkedAt: new Date(), state: r.state, ttftMs: r.ttftMs, totalMs: r.totalMs, tps: r.tps, httpStatus: r.httpStatus, errorClass: r.errorClass, error: r.error });
      } else if (ch.isDemo && process.env.DEMO_SIMULATION !== "off") {
        rows.push(simulate(o.id, m.modelId, stats.find((s) => s.offeringId === o.id)));
      } else {
        rows.push({ offeringId: o.id, modelId: m.modelId, checkedAt: new Date(), state: "excluded", errorClass: "key", error: "未配置探测 Key" });
      }
    }
    if (rows.length) await db.insert(probeResults).values(rows);

    const jitter = between(Math.random, -0.1, 0.1) * INTERVAL_MS;
    const patch: Partial<typeof offerings.$inferInsert> = { nextProbeAt: new Date(Date.now() + INTERVAL_MS + jitter) };

    if (key && o.nextVerifyAt <= now && mine[0]) {
      const family = (catalog.find((c) => c.id === mine[0].modelId)?.family ?? "openai") as Family;
      const v = await runVerification({ baseUrl: ch.baseUrl, apiKey: key, protocol: o.protocol as Protocol, model: mine[0].modelId }, family);
      if (v.reachable) {
        await db.insert(verificationRuns).values({ offeringId: o.id, checkedAt: new Date(), status: v.status, score: v.score, mystery: false, checks: v.checks });
        verified++;
      }
      patch.nextVerifyAt = new Date(Date.now() + (v.reachable ? VERIFY_EVERY_MS : 3_600_000));
    }
    await db.update(offerings).set(patch).where(eq(offerings.id, o.id));
  });

  await recomputeOfferingStats(db, ids);
  await recomputeScores(db);
  await detectEvents(db, before);
  return { probed: due.length, verified };
}

/** 自动同步倍率：只对站长选择了「自动同步」的分组生效 */
export async function syncMultipliers() {
  const db = await getDb();
  const rows = await db
    .select({ o: offerings, ch: channels })
    .from(offerings)
    .innerJoin(channels, eq(channels.id, offerings.channelId))
    .where(and(eq(offerings.multiplierSource, "synced"), eq(channels.status, "approved"), eq(channels.isDemo, false)));
  const catalogIds = (await db.select({ id: models.id }).from(models)).map((m) => m.id);
  const bySite = new Map<string, typeof rows>();
  for (const r of rows) bySite.set(r.ch.siteUrl, [...(bySite.get(r.ch.siteUrl) ?? []), r]);

  for (const [site, list] of bySite) {
    const info = await detectSite(site, catalogIds).catch(() => null);
    if (!info) continue;
    for (const { o } of list) {
      const group = info.groups.find((g) => g.name === o.groupName);
      if (!group || group.ratio === o.claimedMultiplier) continue;
      const prev = o.claimedMultiplier;
      await db.update(offerings).set({ claimedMultiplier: group.ratio, claimedText: String(group.ratio) }).where(eq(offerings.id, o.id));
      await db.insert(priceEvents).values({ offeringId: o.id, at: new Date(), text: `倍率 ${prev ?? "—"} → ${group.ratio}`, delta: prev ? (group.ratio - prev) / prev : null });
    }
  }
}

export async function pruneOldData() {
  const db = await getDb();
  await db.delete(probeResults).where(lt(probeResults.checkedAt, new Date(Date.now() - 35 * 86_400_000)));
}

const g = globalThis as unknown as { __ylScheduler?: boolean };

export function startScheduler() {
  if (g.__ylScheduler) return;
  g.__ylScheduler = true;
  let running = false;
  let lastSync = 0;
  let lastPrune = 0;
  const loop = async () => {
    if (running) return;
    running = true;
    try {
      await tick();
      await dispatchNotifications();
      if (Date.now() - lastSync > SYNC_EVERY_MS) {
        lastSync = Date.now();
        await syncMultipliers();
      }
      if (Date.now() - lastPrune > 3_600_000) {
        lastPrune = Date.now();
        await pruneOldData();
      }
    } catch (e) {
      console.error("[scheduler] tick failed", e);
    } finally {
      running = false;
    }
  };
  setTimeout(loop, 5_000);
  setInterval(loop, 30_000);
  console.info(`[scheduler] started, probe interval ${INTERVAL_MS / 1000}s`);
}
