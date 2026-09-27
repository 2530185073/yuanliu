import { count, eq, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { MODELS } from "@/lib/catalog";
import { NOW } from "@/lib/probe";
import { between, chance, int, seeded } from "@/lib/rand";
import type { DB } from "./index";
import * as t from "./schema";

const HOUR = 3_600_000;

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

const SEEDED = "system.seeded";

/**
 * 首次启动时把演示数据写入数据库；已完成则跳过。
 * 整个过程在一个事务里并持有咨询锁：多实例同时启动只会写一次，中途被杀掉也不会留下半套数据。
 */
export async function ensureSeeded(db: DB) {
  const [done] = await db.select({ id: t.auditLogs.id }).from(t.auditLogs).where(eq(t.auditLogs.action, SEEDED)).limit(1);
  if (done) return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(724301)`);
    const [again] = await tx.select({ id: t.auditLogs.id }).from(t.auditLogs).where(eq(t.auditLogs.action, SEEDED)).limit(1);
    if (again) return;

    const [[{ models }], [{ stats }]] = await Promise.all([
      tx.select({ models: count() }).from(t.models),
      tx.select({ stats: count() }).from(t.offeringStats),
    ]);
    if (models === 0) await seed(tx as unknown as DB);
    else if (stats === 0) {
      const tables = (Object.values(t) as unknown[]).filter((v): v is PgTable => is(v, PgTable));
      await tx.execute(sql.raw(`truncate ${tables.map((v) => `"${getTableName(v)}"`).join(", ")} cascade`));
      await seed(tx as unknown as DB);
    }
    await tx.insert(t.auditLogs).values({ actorId: null, action: SEEDED, target: "demo", detail: {} });
  });
}

async function seed(db: DB) {
  const [{ CHANNELS }, { SUPPLIERS, SUPPLY_ITEMS, WANTED_POSTS }, { encodeBars }] = await Promise.all([
    import("@/lib/data"),
    import("@/lib/supply"),
    import("@/lib/probe"),
  ]);
  const shift = Date.now() - NOW;
  const at = (iso: string) => new Date(Date.parse(iso) + shift);

  await db.insert(t.models).values(MODELS.map((m, i) => ({ ...m, sortOrder: i })));

  const [owner] = await db.insert(t.users).values({ email: "demo-owner@yuanliu.example", name: "演示站长" }).returning();

  for (const ch of CHANNELS) {
    const [row] = await db
      .insert(t.channels)
      .values({
        slug: ch.slug,
        name: ch.name,
        domain: ch.domain,
        siteUrl: ch.siteUrl,
        baseUrl: ch.siteUrl,
        system: ch.system,
        ownerId: ch.claimed ? owner.id : null,
        status: "approved",
        invoice: ch.invoice,
        payMethods: ch.payMethods,
        minTopup: ch.minTopup,
        rechargeRate: ch.rechargeRate,
        contact: ch.contact,
        tagline: ch.tagline,
        isDemo: true,
        createdAt: at(ch.firstSeen),
        approvedAt: at(ch.firstSeen),
      })
      .returning({ id: t.channels.id });

    for (const o of ch.offerings) {
      await db.insert(t.offerings).values({
        id: o.id,
        channelId: row.id,
        groupName: o.group,
        sourceType: o.sourceType,
        scenes: o.scenes,
        claimedText: o.claimedText,
        claimedMultiplier: o.claimed,
        measuredMultiplier: o.measured,
        multiplierSource: o.multiplierSource,
        protocol: o.family === "anthropic" ? "anthropic" : "openai-chat",
        sponsored: o.sponsored,
        upstreamSupplyId: o.cluster?.supplyId ?? null,
        upstreamConfidence: o.cluster?.confidence ?? null,
        upstreamDisclosed: o.cluster?.disclosed ?? false,
        createdAt: at(o.history[o.history.length - 1]?.at ?? ch.firstSeen),
      });
      await db.insert(t.offeringModels).values(o.quotes.map((q) => ({ offeringId: o.id, modelId: q.modelId, primary: q.primary })));

      const primary = o.quotes[0];
      const r = seeded(`seed:${o.id}`);
      const base = o.probe.p50 ?? 2500;
      const probes: (typeof t.probeResults.$inferInsert)[] = o.probe.curve.map((p) => ({
        offeringId: o.id,
        modelId: primary.modelId,
        checkedAt: at(p.t),
        state: p.state,
        ttftMs: p.ms,
        totalMs: p.ms === null ? null : p.ms + int(r, 400, 2500),
        tps: p.ms === null ? null : Math.round(o.probe.tps * between(r, 0.85, 1.15)),
        errorClass: p.state === "fail" ? "site" : p.state === "excluded" ? (o.probe.latest.errorClass ?? "key") : null,
        error: p.state === "fail" ? "HTTP 502 Bad Gateway" : p.state === "excluded" ? o.probe.latest.error : null,
      }));
      for (let d = 1; d < 30; d++) {
        const value = o.probe.daily[29 - d]?.value;
        for (let h = 0; h < 24; h++) {
          const checkedAt = new Date(NOW + shift - d * 24 * HOUR - h * HOUR - int(r, 0, 1_800_000));
          const state = value === null ? "excluded" : chance(r, (100 - (value ?? 99)) / 100) ? "fail" : "ok";
          const ms = state === "ok" ? Math.round(base * between(r, 0.7, 1.4)) : null;
          probes.push({
            offeringId: o.id,
            modelId: primary.modelId,
            checkedAt,
            state,
            ttftMs: ms,
            totalMs: ms === null ? null : ms + int(r, 400, 2500),
            tps: ms === null ? null : Math.round(o.probe.tps * between(r, 0.85, 1.15)),
            errorClass: state === "fail" ? "site" : state === "excluded" ? "key" : null,
            error: state === "fail" ? "HTTP 503 上游不可用" : state === "excluded" ? "HTTP 401: Invalid API key" : null,
          });
        }
      }
      for (const q of o.quotes.slice(1)) {
        for (let h = 0; h < 24; h++) {
          const ms = q.ttftMs === null ? null : Math.round(q.ttftMs * between(r, 0.8, 1.25));
          probes.push({ offeringId: o.id, modelId: q.modelId, checkedAt: new Date(NOW + shift - h * HOUR), state: ms === null ? "excluded" : "ok", ttftMs: ms, tps: q.tps });
        }
      }
      await insertChunks(probes, (chunk) => db.insert(t.probeResults).values(chunk));

      const v = o.verification;
      await db.insert(t.verificationRuns).values({
        offeringId: o.id,
        checkedAt: at(v.checkedAt),
        status: v.status,
        score: v.score,
        mystery: v.mystery,
        checks: v.checks,
        iqHtml: v.iqHtml,
      });
      if (o.history.length) {
        await db.insert(t.priceEvents).values(o.history.map((h) => ({ offeringId: o.id, at: at(h.at), text: h.text, delta: h.delta })));
      }
    }

    if (ch.reviews.length) {
      await db.insert(t.reviews).values(
        ch.reviews.map((rv) => ({ channelId: row.id, authorName: rv.author, rating: rv.rating, text: rv.text, tags: rv.tags, reply: rv.reply ?? null, createdAt: at(rv.at) })),
      );
    }
    if (ch.welfare.length) {
      await db.insert(t.welfare).values(ch.welfare.map((w) => ({ channelId: row.id, kind: w.kind, title: w.title, detail: w.detail })));
      const codes = ch.welfare.find((w) => w.kind === "code");
      if (codes) {
        const rc = seeded(`codes:${ch.slug}`);
        await db.insert(t.promoCodes).values(
          Array.from({ length: Math.min(codes.remaining ?? 20, 40) }, (_, i) => ({
            channelId: row.id,
            code: `${ch.slug.slice(0, 3).toUpperCase()}-${Math.floor(rc() * 1e8).toString(36).toUpperCase()}${i}`,
          })),
        );
      }
    }

    const rc = seeded(`clicks:${ch.slug}`);
    const clickRows: (typeof t.clicks.$inferInsert)[] = [];
    for (let d = 0; d < 30; d++) {
      for (let i = int(rc, 1, 14); i > 0; i--) {
        clickRows.push({ channelId: row.id, visitor: `v${int(rc, 1, 400)}`, at: new Date(Date.now() - d * 24 * HOUR - int(rc, 0, 86_000_000)) });
      }
    }
    await insertChunks(clickRows, (chunk) => db.insert(t.clicks).values(chunk));
  }

  await db.insert(t.suppliers).values(SUPPLIERS.map((s) => ({ ...s, createdAt: new Date(Date.now() - s.joinedDays * 24 * HOUR) })));
  await db.insert(t.supplyItems).values(
    SUPPLY_ITEMS.map((s) => ({
      id: s.id,
      supplierId: s.supplierId,
      title: s.title,
      family: s.family,
      sourceType: s.sourceType,
      models: s.models,
      cnyPerUsd: s.cnyPerUsd,
      settlement: s.settlement,
      minOrder: s.minOrder,
      rpm: s.rpm,
      concurrency: s.concurrency,
      features: s.features,
      afterSales: s.afterSales,
      stock: s.stock,
      description: s.description,
      status: "approved" as const,
      probe: { ...s.probe, bars: encodeBars(s.probe.curve), curve: s.probe.curve.map((p) => ({ ...p, t: at(p.t).toISOString() })) },
      verification: s.verification,
      updatedAt: at(s.updatedAt),
    })),
  );
  for (const w of WANTED_POSTS) {
    await db.insert(t.wantedPosts).values({
      id: w.id,
      authorSlug: w.authorSlug,
      title: w.title,
      family: w.family,
      models: w.models,
      volume: w.volume,
      target: w.target,
      settlement: w.settlement,
      requirements: w.requirements,
      status: w.status,
      detail: w.detail,
      views: w.views,
      postedAt: at(w.postedAt),
    });
    if (w.responses.length) {
      await db
        .insert(t.wantedResponses)
        .values(w.responses.map((r) => ({ postId: w.id, supplierId: r.supplierId, supplyId: r.supplyId ?? null, offer: r.offer, note: r.note, at: at(r.at) })));
    }
  }

  const { recomputeOfferingStats, recomputeScores } = await import("@/server/stats");
  await recomputeOfferingStats(db);
  await recomputeScores(db);
}
