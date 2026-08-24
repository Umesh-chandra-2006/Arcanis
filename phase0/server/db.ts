import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: MySql2Database<typeof schema> | null = null;
let _pool: mysql.Pool | null = null;
let _initPromise: Promise<MySql2Database<typeof schema> | null> | null = null;

export async function getDb(): Promise<MySql2Database<typeof schema> | null> {
  if (_db) return _db;
  if (!ENV.databaseUrl) return null;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      _pool = mysql.createPool({
        uri: ENV.databaseUrl,
        connectionLimit: 20,
      });
      _db = drizzle(_pool as any, { schema, mode: "default" }) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
    return _db;
  })();

  return _initPromise;
}

export function getPool(): mysql.Pool | null {
  return _pool;
}

export function requireDb(): MySql2Database<typeof schema> {
  if (!_db) {
    throw new Error("Database not initialized");
  }
  return _db;
}
