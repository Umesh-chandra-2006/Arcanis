// Proves a backup restores (task A1): loads it into a scratch database on the
// same server, compares row counts with the live database, then drops it.
//   pnpm db:restore-check [path/to/backup.sql]   (defaults to the newest backup)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { BACKUP_DIR, cliArgs, cliEnv, parseDbUrl } from "./db-url.mjs";

const SCRATCH = "arcanis_restore_check";
const live = parseDbUrl(process.env.DATABASE_URL);

function newestBackup() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql")).sort();
  if (!files.length) throw new Error(`no backups in ${BACKUP_DIR}`);
  return path.join(BACKUP_DIR, files.at(-1));
}

async function connect(database) {
  return mysql.createConnection({
    host: live.host,
    port: Number(live.port),
    user: live.user,
    password: live.password,
    database,
    ssl: live.tls ? { rejectUnauthorized: true } : undefined,
  });
}

async function rowCounts(conn, schema) {
  const [tables] = await conn.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
    [schema]
  );
  const counts = {};
  for (const { t } of tables) {
    const [[row]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${schema}\`.\`${t}\``);
    counts[t] = Number(row.n);
  }
  return counts;
}

const file = process.argv[2] ?? newestBackup();
console.log(`Restoring ${file} into ${SCRATCH}...`);
const admin = await connect(live.database);
await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
await admin.query(`CREATE DATABASE ${SCRATCH}`);

try {
  await new Promise((resolve, reject) => {
    const child = spawn("mysql", [...cliArgs(live), "--max-allowed-packet=512M", SCRATCH], {
      env: cliEnv(live),
      stdio: ["pipe", "inherit", "inherit"],
    });
    fs.createReadStream(file).pipe(child.stdin);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`mysql exited with ${code}`))));
  });

  const [want, got] = [await rowCounts(admin, live.database), await rowCounts(admin, SCRATCH)];
  let ok = true;
  for (const [table, n] of Object.entries(want)) {
    const match = got[table] === n;
    ok &&= match;
    console.log(`${match ? "ok  " : "DIFF"} ${table}: live ${n}, restored ${got[table] ?? "missing"}`);
  }
  console.log(ok ? "Restore verified." : "Restore MISMATCH (live data may have changed since the dump).");
  process.exitCode = ok ? 0 : 1;
} finally {
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await admin.end();
}
