import type { Metadata } from "next";
import { count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, channels, offerings, probeResults, users } from "@/db/schema";
import { stamp } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { Stat } from "@/components/ui/Badges";

export const metadata: Metadata = { title: "运营" };

async function loadOverview() {
  const db = await getDb();
  return Promise.all([
    db.select({ n: count() }).from(channels),
    db.select({ n: count() }).from(channels).where(eq(channels.status, "pending")),
    db.select({ n: count() }).from(offerings),
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(probeResults).where(gte(probeResults.checkedAt, new Date(Date.now() - 10 * 60_000))),
    db.select({ log: auditLogs, email: users.email }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).orderBy(desc(auditLogs.at)).limit(30),
  ]);
}

export default async function AdminPage() {
  await requireAdmin();
  const [[ch], [pending], [off], [us], [probes], logs] = await loadOverview();

  return (
    <div className="mx-auto max-w-[880px] px-5 pt-16">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">运营</h1>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-5">
        <Stat label="渠道" value={ch.n} />
        <Stat label="待审核" value={pending.n} />
        <Stat label="货" value={off.n} />
        <Stat label="用户" value={us.n} />
        <Stat label="近 10 分钟探测" value={probes.n} />
      </div>

      <section className="mt-12">
        <h2 className="text-[13px] text-fg-3">审计日志</h2>
        {logs.length ? (
          <ul className="card mt-3 divide-y divide-line">
            {logs.map(({ log, email }) => (
              <li key={log.id} className="grid grid-cols-[96px_minmax(0,1fr)_auto] gap-4 px-4 py-3 text-[13px]">
                <span className="tnum text-fg-3">{stamp(log.at.toISOString())}</span>
                <span className="truncate text-fg-2">
                  {log.action} · {log.target}
                </span>
                <span className="text-fg-3">{email ?? "系统"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-fg-3">暂无记录</p>
        )}
      </section>
    </div>
  );
}
