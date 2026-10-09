// Shared helpers for the DB scripts: parse a mysql:// URL into CLI args.
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true });

export function parseDbUrl(raw) {
  if (!raw) throw new Error("database URL is not set");
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port || "3306",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    tls: u.searchParams.has("ssl") || u.hostname.endsWith("tidbcloud.com"),
  };
}

export function cliArgs(db) {
  return [
    "-h", db.host, "-P", db.port, "-u", db.user,
    `--ssl-mode=${db.tls ? "REQUIRED" : "PREFERRED"}`,
    "--default-character-set=utf8mb4",
  ];
}

// The password goes through MYSQL_PWD so it never appears in a process list.
export function cliEnv(db) {
  return { ...process.env, MYSQL_PWD: db.password };
}

export const BACKUP_DIR = process.env.BACKUP_DIR ?? path.resolve(import.meta.dirname, "../../../Arcanis-backups");
