// Restores a backup into an EMPTY database (a new host after losing the old
// one). Refuses if the target already has tables, so it can never overwrite.
//   node scripts/db-restore.mjs <path/to/backup.sql>   (target: DATABASE_URL)
import { spawn } from "node:child_process";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { cliArgs, cliEnv, parseDbUrl } from "./db-url.mjs";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error("usage: node scripts/db-restore.mjs <path/to/backup.sql>");
const db = parseDbUrl(process.env.DATABASE_URL);

const conn = await mysql.createConnection({
  host: db.host,
  port: Number(db.port),
  user: db.user,
  password: db.password,
  ssl: db.tls ? { rejectUnauthorized: true } : undefined,
});
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.database}\``);
const [[{ n }]] = await conn.query(
  "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?",
  [db.database]
);
if (Number(n) > 0) {
  await conn.end();
  throw new Error(`${db.database} on ${db.host} already has ${n} tables; refusing to restore over it`);
}

console.log(`Restoring ${file} into ${db.database} on ${db.host}...`);
await new Promise((resolve, reject) => {
  const child = spawn("mysql", [...cliArgs(db), "--max-allowed-packet=512M", db.database], {
    env: cliEnv(db),
    stdio: ["pipe", "inherit", "inherit"],
  });
  fs.createReadStream(file).pipe(child.stdin);
  child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`mysql exited with ${code}`))));
});

const [tables] = await conn.query(
  "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
  [db.database]
);
for (const { t } of tables) {
  const [[row]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${db.database}\`.\`${t}\``);
  console.log(`${t}: ${row.n}`);
}
const [[last]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${db.database}\`.__drizzle_migrations`);
console.log(`Restored. Migrations recorded: ${last.n}`);
await conn.end();
