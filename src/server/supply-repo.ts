import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";

export type SupplyRow = typeof t.supplyItems.$inferSelect;
export type SupplierRow = typeof t.suppliers.$inferSelect;
export type WantedRow = typeof t.wantedPosts.$inferSelect;

export async function listSupply() {
  const db = await getDb();
  const rows = await db
    .select({ item: t.supplyItems, supplier: t.suppliers })
    .from(t.supplyItems)
    .innerJoin(t.suppliers, eq(t.suppliers.id, t.supplyItems.supplierId))
    .where(eq(t.supplyItems.status, "approved"));
  return rows.sort((a, b) => b.supplier.reputation - a.supplier.reputation);
}

export async function getSupplyItem(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ item: t.supplyItems, supplier: t.suppliers })
    .from(t.supplyItems)
    .innerJoin(t.suppliers, eq(t.suppliers.id, t.supplyItems.supplierId))
    .where(eq(t.supplyItems.id, id));
  return row && row.item.status === "approved" ? row : null;
}

export async function listWanted() {
  const db = await getDb();
  const posts = await db.select().from(t.wantedPosts).where(eq(t.wantedPosts.approved, true)).orderBy(desc(t.wantedPosts.postedAt));
  const ids = posts.map((p) => p.id);
  const [responses, authors] = await Promise.all([
    ids.length ? db.select({ postId: t.wantedResponses.postId }).from(t.wantedResponses).where(inArray(t.wantedResponses.postId, ids)) : [],
    db.select({ slug: t.channels.slug, name: t.channels.name }).from(t.channels),
  ]);
  const nameOf = new Map(authors.map((a) => [a.slug, a.name]));
  return posts.map((p) => ({ post: p, authorName: (p.authorSlug && nameOf.get(p.authorSlug)) || "某中转站", responses: responses.filter((r) => r.postId === p.id).length }));
}

export async function getWanted(id: string) {
  const db = await getDb();
  const [post] = await db.select().from(t.wantedPosts).where(eq(t.wantedPosts.id, id));
  if (!post || !post.approved) return null;
  const responses = await db
    .select({ response: t.wantedResponses, supplier: t.suppliers })
    .from(t.wantedResponses)
    .innerJoin(t.suppliers, eq(t.suppliers.id, t.wantedResponses.supplierId))
    .where(eq(t.wantedResponses.postId, id))
    .orderBy(t.wantedResponses.at);
  const supplyIds = responses.map((r) => r.response.supplyId).filter((v): v is string => Boolean(v));
  const supplies = supplyIds.length ? await db.select().from(t.supplyItems).where(inArray(t.supplyItems.id, supplyIds)) : [];
  const [author] = post.authorSlug ? await db.select({ slug: t.channels.slug, name: t.channels.name }).from(t.channels).where(eq(t.channels.slug, post.authorSlug)) : [];
  return { post, author: author ?? null, responses: responses.map((r) => ({ ...r, supply: supplies.find((s) => s.id === r.response.supplyId) ?? null })) };
}
