// Migrates the test database once per run. Skipped when no test DB is configured.
import dotenv from "dotenv";
import path from "node:path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { resolveTestDatabaseUrl } from "./test-db-guard";

export default async function setup() {
  dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });
  const decision = resolveTestDatabaseUrl(process.env);
  if (!decision.ok) {
    if (process.env.REQUIRE_TEST_DB === "1") throw new Error(decision.reason);
    console.warn(`[tests] DB tests skipped: ${decision.reason}`);
    return;
  }
  const conn = await mysql.createConnection({ uri: decision.url, multipleStatements: true });
  try {
    await migrate(drizzle(conn), {
      migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle"),
    });
  } finally {
    await conn.end();
  }
}
