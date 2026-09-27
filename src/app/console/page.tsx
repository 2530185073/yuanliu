import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channels, notifications } from "@/db/schema";
import { ago } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { Badge } from "@/components/ui/Badges";

export const metadata: Metadata = { title: "后台" };

const STATUS = { pending: "审核中", approved: "已上架", rejected: "未通过", hidden: "已隐藏" } as const;

export default async function ConsolePage() {
  const user = await requireUser("/console");
  const db = await getDb();
  const [mine, inbox] = await Promise.all([
    db.select().from(channels).where(eq(channels.ownerId, user.id)).orderBy(desc(channels.createdAt)),
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(20),
  ]);

  return (
    <div className="mx-auto max-w-[880px] px-5 pt-16">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">后台</h1>
      <p className="mt-2 text-fg-2">{user.email}</p>

      <section className="mt-12">
        <h2 className="text-[13px] text-fg-3">我的渠道</h2>
        {mine.length ? (
          <ul className="card mt-3 divide-y divide-line overflow-hidden">
            {mine.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="min-w-0">
                  {c.status === "approved" ? (
                    <Link href={`/channels/${c.slug}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{c.name}</span>
                  )}
                  <span className="ml-2 text-[13px] text-fg-3">{c.domain}</span>
                </span>
                <Badge tone={c.status === "approved" ? "ok" : c.status === "rejected" ? "bad" : "neutral"}>{STATUS[c.status]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card mt-3 px-5 py-8 text-center">
            <p className="text-fg-2">还没有渠道</p>
            <p className="mt-1 text-[13px] text-fg-3">入驻向导即将开放，届时填网址和探测 Key 就能自动识别分组与价格。</p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[13px] text-fg-3">通知</h2>
        {inbox.length ? (
          <ul className="card mt-3 divide-y divide-line">
            {inbox.map((n) => (
              <li key={n.id} className="px-4 py-3.5">
                <p className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{n.title}</span>
                  <span className="shrink-0 text-[12px] text-fg-3">{ago(n.createdAt.toISOString())}</span>
                </p>
                <p className="mt-0.5 text-[13px] text-fg-2">
                  {n.body}
                  {n.link && (
                    <Link href={n.link} className="link ml-2">
                      查看
                    </Link>
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-fg-3">暂无通知。关注渠道后，宕机、恢复、价格变动和验真变化会出现在这里。</p>
        )}
      </section>
    </div>
  );
}
