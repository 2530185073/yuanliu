import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";

async function main() {
  const started = Date.now();
  const db = await getDb();
  console.log(`ready in ${Date.now() - started}ms`);
  for (const [name, table] of Object.entries({ channels: t.channels, offerings: t.offerings, probes: t.probeResults, stats: t.offeringStats, clicks: t.clicks, supply: t.supplyItems })) {
    const [{ n }] = await db.select({ n: count() }).from(table);
    console.log(name.padEnd(10), n);
  }
  const top = await db
    .select({ id: t.offeringStats.offeringId, score: t.offeringStats.score, h24: t.offeringStats.h24, d7: t.offeringStats.d7, p50: t.offeringStats.p50, dao: t.offeringStats.daoPrice, excluded: t.offeringStats.excludedReason })
    .from(t.offeringStats)
    .orderBy(desc(t.offeringStats.score))
    .limit(5);
  console.table(top);
  const [one] = await db.select().from(t.offeringStats).where(eq(t.offeringStats.offeringId, top[0].id));
  console.log("bars", one.bars.length, "daily", one.daily.slice(-3), "modelTtft", one.modelTtft);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
