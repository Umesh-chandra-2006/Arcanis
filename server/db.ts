import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _hearthTableChecked = false;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 20,
      });
      _db = drizzle(_pool as any) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }

  // Ensure hearth_posts table exists in MySQL
  if (_pool && !_hearthTableChecked) {
    try {
      _hearthTableChecked = true;
      await _pool.query(`
        CREATE TABLE IF NOT EXISTS \`hearth_posts\` (
          \`id\` varchar(36) NOT NULL PRIMARY KEY,
          \`author_id\` int NOT NULL,
          \`content\` text NOT NULL,
          \`attached_spell_id\` varchar(36) DEFAULT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX \`author_idx\` (\`author_id\`),
          INDEX \`created_at_idx\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (err) {
      console.error("[Database] Error ensuring hearth_posts table:", err);
    }
  }

  return _db;
}
