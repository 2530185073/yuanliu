import { count, gte, max } from "drizzle-orm";
import { getDb, type DB } from "@/db";
import { channels, probeResults } from "@/db/schema";

// Health probes have short timeouts; first boot migrates and seeds for a while, so report "initializing" instead of hanging.
const READY_WAIT_MS = 2_000;

export async function GET() {
  const database = process.env.DATABASE_URL ? "postgres" : "pglite";
  try {
    const db = await Promise.race([getDb(), new Promise<null>((r) => setTimeout(() => r(null), READY_WAIT_MS))]);
    if (!db) return Response.json({ ok: true, status: "initializing", database });
    return Response.json({ ok: true, status: "ready", database, ...(await summary(db)) });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
}

async function summary(db: DB) {
  const [[latest], [recent], [total]] = await Promise.all([
    db.select({ at: max(probeResults.checkedAt) }).from(probeResults),
    db.select({ n: count() }).from(probeResults).where(gte(probeResults.checkedAt, new Date(Date.now() - 10 * 60_000))),
    db.select({ n: count() }).from(channels),
  ]);
  return { channels: total.n, latestProbeAt: latest.at, probesLast10Min: recent.n };
}
