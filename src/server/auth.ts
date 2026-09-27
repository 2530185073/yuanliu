import "server-only";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { auditLogs, loginCodes, sessions, users } from "@/db/schema";
import { mailConfigured, sendMail } from "./mail";
import { hmac } from "./secret";

const COOKIE = "yl_session";
const SESSION_DAYS = 30;
const CODE_TTL_MS = 10 * 60_000;

export type SessionUser = typeof users.$inferSelect;

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function requestLoginCode(email: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), gt(loginCodes.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= 5) return { ok: false, error: "发送太频繁，请一小时后再试" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(loginCodes).values({ email, codeHash: hmac(`${email}:${code}`), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
  const delivered = await sendMail(email, `源流登录验证码 ${code}`, `你的登录验证码是 ${code}，10 分钟内有效。如果不是你本人操作，请忽略这封邮件。`);
  if (!delivered && !mailConfigured() && (process.env.NODE_ENV !== "production" || process.env.LOGIN_DEV_CODES === "1")) return { ok: true, devCode: code };
  if (!delivered) return { ok: false, error: "邮件发送失败，请稍后再试" };
  return { ok: true };
}

export async function verifyLoginCode(email: string, code: string): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), isNull(loginCodes.usedAt), gt(loginCodes.expiresAt, new Date())))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, error: "验证码已过期，请重新获取" };
  if (row.attempts >= 5) return { ok: false, error: "尝试次数过多，请重新获取验证码" };

  const expected = Buffer.from(row.codeHash);
  const actual = Buffer.from(hmac(`${email}:${code}`));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db.update(loginCodes).set({ attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
    return { ok: false, error: "验证码不正确" };
  }
  await db.update(loginCodes).set({ usedAt: new Date() }).where(eq(loginCodes.id, row.id));

  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    const [{ n }] = await db.select({ n: count() }).from(users).where(eq(users.role, "admin"));
    const isAdmin = adminEmails().includes(email) || (n === 0 && process.env.NODE_ENV !== "production" && adminEmails().length === 0);
    [user] = await db.insert(users).values({ email, name: email.split("@")[0], role: isAdmin ? "admin" : "user" }).returning();
    await db.insert(auditLogs).values({ actorId: user.id, action: "user.register", target: email, detail: { role: user.role } });
  } else if (adminEmails().includes(email) && user.role !== "admin") {
    [user] = await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id)).returning();
  }
  if (user.status !== "active") return { ok: false, error: "账号已被停用" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hmac(token), userId: user.id, expiresAt });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return { ok: true, user };
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hmac(token)));
  if (!row || row.expiresAt.getTime() < Date.now() || row.user.status !== "active") return null;
  return row.user;
});

export async function requireUser(next = "/console"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hmac(token)));
  }
  store.delete(COOKIE);
}

export async function audit(actorId: string | null, action: string, target: string, detail: Record<string, unknown> = {}) {
  const db = await getDb();
  await db.insert(auditLogs).values({ actorId, action, target, detail });
}
