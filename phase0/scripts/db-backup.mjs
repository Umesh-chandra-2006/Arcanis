// Logical backup of the production database (task A1). Run weekly and before
// every production migration:  pnpm db:backup
// Writes <BACKUP_DIR>/arcanis-<db>-<utc timestamp>.sql (outside the repo).
// TiDB rejects mysqldump's savepoints, so --single-transaction is not used;
// take backups at low traffic.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BACKUP_DIR, cliArgs, cliEnv, parseDbUrl } from "./db-url.mjs";

const db = parseDbUrl(process.env.DATABASE_URL);
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(BACKUP_DIR, `arcanis-${db.database}-${stamp}.sql`);

const args = [
  ...cliArgs(db),
  "--no-tablespaces",
  "--set-gtid-purged=OFF",
  "--skip-lock-tables",
  "--hex-blob",
  "--max-allowed-packet=512M",
  db.database,
];

const out = fs.createWriteStream(file);
const child = spawn("mysqldump", args, { env: cliEnv(db), stdio: ["ignore", "pipe", "inherit"] });
child.stdout.pipe(out);
child.on("close", (code) => {
  out.close();
  if (code !== 0) {
    fs.rmSync(file, { force: true });
    console.error(`mysqldump exited with ${code}`);
    process.exit(1);
  }
  console.log(`Backup written: ${file} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
});
