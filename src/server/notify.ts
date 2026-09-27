import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { rawRows, type DB } from "@/db";
import { channels, notifications, offerings, offeringStats, subscriptions, users } from "@/db/schema";
import { getDb } from "@/db";
import { sendMail } from "./mail";

interface Snap {
  down: boolean;
  excluded: boolean;
  dao: number;
  verify: string | null;
}

/** 最近 3 次主模型探测都失败才算宕机，避免单次抖动误报 */
export async function snapshotStats(db: DB, ids: string[]): Promise<Map<string, Snap>> {
  if (!ids.length) return new Map();
  const [stats, recent, verify] = await Promise.all([
    db.select().from(offeringStats).where(inArray(offeringStats.offeringId, ids)),
    rawRows<{ offering_id: string; fails: number }>(
      db,
      sql`select offering_id, count(*) filter (where state = 'fail')::int as fails from (
            select offering_id, state, row_number() over (partition by offering_id order by checked_at desc) as rn
            from probe_results where offering_id in ${ids}
          ) t where rn <= 3 group by offering_id`,
    ),
    rawRows<{ offering_id: string; status: string }>(
      db,
      sql`select distinct on (offering_id) offering_id, status from verification_runs where offering_id in ${ids} order by offering_id, checked_at desc`,
    ),
  ]);
  return new Map(
    ids.map((id) => {
      const s = stats.find((x) => x.offeringId === id);
      return [id, { down: (recent.find((r) => r.offering_id === id)?.fails ?? 0) >= 3, excluded: Boolean(s?.excludedReason), dao: s?.daoPrice ?? 0, verify: verify.find((v) => v.offering_id === id)?.status ?? null }];
    }),
  );
}

type Kind = "down" | "recover" | "key" | "price" | "verify";

export async function detectEvents(db: DB, before: Map<string, Snap>) {
  const ids = [...before.keys()];
  const after = await snapshotStats(db, ids);
  const events: { offeringId: string; kind: Kind; body: string }[] = [];
  for (const id of ids) {
    const a = before.get(id)!;
    const b = after.get(id)!;
    if (!a.down && b.down) events.push({ offeringId: id, kind: "down", body: "连续 3 次探测失败。" });
    if (a.down && !b.down) events.push({ offeringId: id, kind: "recover", body: "探测已恢复正常。" });
    if (!a.excluded && b.excluded) events.push({ offeringId: id, kind: "key", body: "探测 Key 失效或额度不足，恢复前不计入可用率。" });
    if (a.dao > 0 && Math.abs(b.dao - a.dao) / a.dao > 0.01) {
      events.push({ offeringId: id, kind: "price", body: `刀价 ¥${a.dao.toFixed(3)} → ¥${b.dao.toFixed(3)}（${b.dao > a.dao ? "涨价" : "降价"}）` });
    }
    if (a.verify && b.verify && a.verify !== b.verify) events.push({ offeringId: id, kind: "verify", body: `验真结果变为「${{ pass: "已验真", warn: "存疑", fail: "未通过" }[b.verify] ?? b.verify}」。` });
  }
  if (!events.length) return 0;

  const info = await db
    .select({ id: offerings.id, group: offerings.groupName, channelId: channels.id, name: channels.name, slug: channels.slug, ownerId: channels.ownerId })
    .from(offerings)
    .innerJoin(channels, eq(channels.id, offerings.channelId))
    .where(inArray(offerings.id, [...new Set(events.map((e) => e.offeringId))]));
  const subs = await db.select().from(subscriptions).where(inArray(subscriptions.channelId, [...new Set(info.map((i) => i.channelId))]));
  const topic: Record<Kind, string> = { down: "down", recover: "down", key: "down", price: "price", verify: "verify" };
  const title: Record<Kind, string> = { down: "宕机", recover: "已恢复", key: "探测 Key 异常", price: "价格变动", verify: "验真变化" };

  const rows: (typeof notifications.$inferInsert)[] = [];
  for (const e of events) {
    const o = info.find((i) => i.id === e.offeringId);
    if (!o) continue;
    const recipients = new Set(subs.filter((s) => s.channelId === o.channelId && e.kind !== "key" && s.events.includes(topic[e.kind])).map((s) => s.userId));
    if (o.ownerId && e.kind !== "price") recipients.add(o.ownerId);
    for (const userId of recipients) {
      rows.push({ userId, kind: e.kind, title: `${o.name} · ${o.group} ${title[e.kind]}`, body: e.body, link: `/channels/${o.slug}#${o.id}` });
    }
  }
  if (rows.length) await db.insert(notifications).values(rows);
  return rows.length;
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  return res.ok;
}

/** 把未发送的站内通知投递到邮件和 Telegram；演示账号（.example 邮箱）只保留站内通知 */
export async function dispatchNotifications() {
  const db = await getDb();
  const pending = await db
    .select({ n: notifications, email: users.email, chatId: users.telegramChatId })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .where(and(isNull(notifications.sentAt), isNull(notifications.error)))
    .limit(50);
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  for (const { n, email, chatId } of pending) {
    const text = `${n.title}\n${n.body}\n${n.link ? site + n.link : ""}`;
    try {
      if (!email.endsWith(".example")) await sendMail(email, `【源流】${n.title}`, text);
      if (chatId) await sendTelegram(chatId, text);
      await db.update(notifications).set({ sentAt: new Date() }).where(eq(notifications.id, n.id));
    } catch (e) {
      await db.update(notifications).set({ error: String((e as Error).message ?? e).slice(0, 300) }).where(eq(notifications.id, n.id));
    }
  }
}
