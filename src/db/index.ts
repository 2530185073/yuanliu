import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __ylDb?: Promise<DB> };
const migrationsFolder = path.join(process.cwd(), "drizzle");

async function open(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const [{ Pool }, { drizzle }, { migrate }] = await Promise.all([
      import("pg"),
      import("drizzle-orm/node-postgres"),
      import("drizzle-orm/node-postgres/migrator"),
    ]);
    const db = drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }), schema, casing: "snake_case" });
    await migrate(db, { migrationsFolder });
    return db as unknown as DB;
  }
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  await mkdir(dir, { recursive: true });
  const db = drizzle({ client: await PGlite.create(dir), schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder });
  return db as unknown as DB;
}

/** 进程内单例；开发环境热更新时复用同一个连接，避免重复打开 PGlite 数据目录 */
export function getDb(): Promise<DB> {
  g.__ylDb ??= open()
    .then(async (db) => {
      const { ensureSeeded } = await import("./seed");
      await ensureSeeded(db);
      return db;
    })
    .catch((e) => {
      g.__ylDb = undefined;
      throw e;
    });
  return g.__ylDb;
}

/** 原生 SQL 查询；node-postgres 与 PGlite 的结果都带 rows */
export async function rawRows<T>(db: DB, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown as { rows: T[] };
  return result.rows;
}

export { schema };
