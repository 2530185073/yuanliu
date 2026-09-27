import { count, gte, max } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, probeResults } from "@/db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const [[latest], [recent], [total]] = await Promise.all([
      db.select({ at: max(probeResults.checkedAt) }).from(probeResults),
      db.select({ n: count() }).from(probeResults).where(gte(probeResults.checkedAt, new Date(Date.now() - 10 * 60_000))),
      db.select({ n: count() }).from(channels),
    ]);
    return Response.json({
      ok: true,
      database: process.env.DATABASE_URL ? "postgres" : "pglite",
      channels: total.n,
      latestProbeAt: latest.at,
      probesLast10Min: recent.n,
    });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
}
