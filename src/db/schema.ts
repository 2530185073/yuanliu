import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Check, DailyUptime, ScorePart } from "@/lib/types";

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text(),
  role: text({ enum: ["user", "admin"] }).notNull().default("user"),
  status: text({ enum: ["active", "disabled"] }).notNull().default("active"),
  telegramChatId: text(),
  createdAt: createdAt(),
});

export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    codeHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    attempts: integer().notNull().default(0),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.email, t.createdAt)],
);

export const sessions = pgTable("sessions", {
  id: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const models = pgTable("models", {
  id: text().primaryKey(),
  family: text({ enum: ["openai", "anthropic", "google", "xai"] }).notNull(),
  tier: text({ enum: ["旗舰", "主力", "轻量"] }).notNull(),
  input: doublePrecision().notNull(),
  output: doublePrecision().notNull(),
  cacheRead: doublePrecision().notNull(),
  contextK: integer().notNull(),
  sortOrder: integer().notNull().default(0),
});

export const channels = pgTable(
  "channels",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    domain: text().notNull(),
    siteUrl: text().notNull(),
    baseUrl: text().notNull(),
    system: text().notNull().default("未识别"),
    ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: text({ enum: ["pending", "approved", "rejected", "hidden"] }).notNull().default("pending"),
    rejectReason: text(),
    invoice: boolean().notNull().default(false),
    payMethods: jsonb().$type<string[]>().notNull().default([]),
    minTopup: doublePrecision().notNull().default(10),
    rechargeRate: doublePrecision().notNull().default(1),
    contact: text(),
    tagline: text(),
    claimToken: text(),
    isDemo: boolean().notNull().default(false),
    createdAt: createdAt(),
    approvedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.status), index().on(t.ownerId)],
);

export const offerings = pgTable(
  "offerings",
  {
    id: text().primaryKey(),
    channelId: uuid()
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    groupName: text().notNull(),
    sourceType: text({ enum: ["官转", "号池", "官方Key", "云厂商", "Kiro", "逆向", "混合"] }).notNull().default("混合"),
    scenes: jsonb().$type<string[]>().notNull().default([]),
    claimedText: text().notNull().default(""),
    claimedMultiplier: doublePrecision(),
    measuredMultiplier: doublePrecision(),
    multiplierSource: text({ enum: ["synced", "manual", "measured"] }).notNull().default("manual"),
    protocol: text({ enum: ["openai-chat", "openai-responses", "anthropic", "gemini"] }).notNull().default("openai-chat"),
    probeKeyEnc: text(),
    status: text({ enum: ["active", "paused"] }).notNull().default("active"),
    sponsored: boolean().notNull().default(false),
    upstreamSupplyId: text(),
    upstreamConfidence: integer(),
    upstreamDisclosed: boolean().notNull().default(false),
    nextProbeAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    nextVerifyAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.channelId), index().on(t.nextProbeAt)],
);

export const offeringModels = pgTable(
  "offering_models",
  {
    offeringId: text()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    modelId: text()
      .notNull()
      .references(() => models.id),
    primary: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.offeringId, t.modelId] })],
);

export const probeResults = pgTable(
  "probe_results",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    offeringId: text()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    modelId: text().notNull(),
    checkedAt: timestamp({ withTimezone: true }).notNull(),
    state: text({ enum: ["ok", "slow", "fail", "excluded"] }).notNull(),
    ttftMs: integer(),
    totalMs: integer(),
    tps: doublePrecision(),
    httpStatus: integer(),
    errorClass: text({ enum: ["site", "key", "config", "ratelimit", "content"] }),
    error: text(),
    region: text().notNull().default("local"),
  },
  (t) => [index().on(t.offeringId, t.checkedAt)],
);

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    offeringId: text()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    checkedAt: timestamp({ withTimezone: true }).notNull(),
    status: text({ enum: ["pass", "warn", "fail"] }).notNull(),
    score: integer().notNull(),
    mystery: boolean().notNull().default(false),
    checks: jsonb().$type<Check[]>().notNull(),
    iqHtml: text(),
  },
  (t) => [index().on(t.offeringId, t.checkedAt)],
);

export interface LatestProbe {
  ok: boolean;
  ttftMs: number | null;
  checkedAt: string;
  errorClass: string | null;
  error: string | null;
}

export const offeringStats = pgTable("offering_stats", {
  offeringId: text()
    .primaryKey()
    .references(() => offerings.id, { onDelete: "cascade" }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  latest: jsonb().$type<LatestProbe | null>(),
  excludedReason: text(),
  h24: doublePrecision(),
  d7: doublePrecision(),
  d30: doublePrecision(),
  p50: integer(),
  p95: integer(),
  tps: integer().notNull().default(0),
  bars: jsonb().$type<number[]>().notNull().default([]),
  daily: jsonb().$type<DailyUptime[]>().notNull().default([]),
  modelTtft: jsonb().$type<Record<string, number | null>>().notNull().default({}),
  daoPrice: doublePrecision().notNull().default(0),
  score: integer().notNull().default(0),
  scoreParts: jsonb().$type<ScorePart[]>().notNull().default([]),
});

export const priceEvents = pgTable(
  "price_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    offeringId: text()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    at: timestamp({ withTimezone: true }).notNull(),
    text: text().notNull(),
    delta: doublePrecision(),
  },
  (t) => [index().on(t.offeringId, t.at)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    channelId: uuid()
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    authorName: text().notNull(),
    rating: integer().notNull(),
    text: text().notNull(),
    tags: jsonb().$type<string[]>().notNull().default([]),
    reply: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.channelId, t.createdAt)],
);

export const welfare = pgTable("welfare", {
  id: uuid().primaryKey().defaultRandom(),
  channelId: uuid()
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  kind: text({ enum: ["code", "trial", "invite"] }).notNull(),
  title: text().notNull(),
  detail: text().notNull().default(""),
});

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid().primaryKey().defaultRandom(),
    channelId: uuid()
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    code: text().notNull(),
    claimedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    claimedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.channelId, t.code)],
);

export const clicks = pgTable(
  "clicks",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    channelId: uuid()
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    offeringId: text(),
    visitor: text().notNull(),
    at: createdAt(),
  },
  (t) => [index().on(t.channelId, t.at)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid()
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    events: jsonb().$type<string[]>().notNull().default(["down", "price", "verify"]),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.channelId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    link: text(),
    createdAt: createdAt(),
    readAt: timestamp({ withTimezone: true }),
    sentAt: timestamp({ withTimezone: true }),
    error: text(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.sentAt)],
);

export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  source: text().notNull().default("手动"),
  note: text(),
  status: text({ enum: ["new", "added", "ignored"] }).notNull().default("new"),
  channelId: uuid().references(() => channels.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const suppliers = pgTable("suppliers", {
  id: text().primaryKey(),
  ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
  name: text().notNull(),
  kind: text().notNull(),
  verified: boolean().notNull().default(false),
  reputation: integer().notNull().default(60),
  deals: integer().notNull().default(0),
  responseMins: integer().notNull().default(30),
  bio: text().notNull().default(""),
  contact: text().notNull().default(""),
  createdAt: createdAt(),
});

export interface SupplyProbe {
  d7: number;
  h24: number | null;
  p50: number | null;
  p95: number | null;
  tps: number;
  bars: number[];
  curve: { t: string; ms: number | null; state: "ok" | "slow" | "fail" | "excluded" }[];
}

export const supplyItems = pgTable("supply_items", {
  id: text().primaryKey(),
  supplierId: text()
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  title: text().notNull(),
  family: text({ enum: ["openai", "anthropic", "google", "xai"] }).notNull(),
  sourceType: text().notNull(),
  models: jsonb().$type<string[]>().notNull().default([]),
  cnyPerUsd: doublePrecision().notNull(),
  settlement: text().notNull(),
  minOrder: text().notNull(),
  rpm: integer().notNull().default(0),
  concurrency: integer().notNull().default(0),
  features: jsonb().$type<string[]>().notNull().default([]),
  afterSales: text().notNull().default(""),
  stock: text().notNull().default("充足"),
  description: text().notNull().default(""),
  status: text({ enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  probe: jsonb().$type<SupplyProbe | null>(),
  verification: jsonb().$type<{ status: "pass" | "warn" | "fail"; score: number; checks: Check[] } | null>(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const wantedPosts = pgTable("wanted_posts", {
  id: text().primaryKey(),
  ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
  authorSlug: text(),
  title: text().notNull(),
  family: text({ enum: ["openai", "anthropic", "google", "xai"] }).notNull(),
  models: jsonb().$type<string[]>().notNull().default([]),
  volume: text().notNull(),
  target: text().notNull(),
  settlement: text().notNull().default("面议"),
  requirements: jsonb().$type<string[]>().notNull().default([]),
  status: text({ enum: ["开放报价", "洽谈中", "已成交"] }).notNull().default("开放报价"),
  detail: text().notNull().default(""),
  views: integer().notNull().default(0),
  approved: boolean().notNull().default(true),
  postedAt: createdAt(),
});

export const wantedResponses = pgTable("wanted_responses", {
  id: uuid().primaryKey().defaultRandom(),
  postId: text()
    .notNull()
    .references(() => wantedPosts.id, { onDelete: "cascade" }),
  supplierId: text()
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  supplyId: text(),
  offer: text().notNull(),
  note: text().notNull().default(""),
  at: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    target: text().notNull(),
    detail: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    at: createdAt(),
  },
  (t) => [index().on(t.at)],
);
