// Phase 0 measurement (task A14): runs the whole creation corpus through the
// real pipeline (moderation, Layer 1, 2a, 2c, image) against the TEST
// database, then prints a per-prompt outcome table for hand review. Pair with
// `pnpm cost-report --test --since <start>` for the cost sheet.
//   pnpm corpus:run [--limit N]
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile?.(path.resolve(import.meta.dirname, "../../../.env"));
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; the corpus never runs against production.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DAILY_CREATION_LIMIT = "1000000"; // the test database accumulates runs

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const { eq } = await import("drizzle-orm");
const { getDb } = await import("../../server/db");
const { createSpell } = await import("../../server/spell-pipeline");
const { grantSpark } = await import("../../server/spark");
const { createTestUser } = await import("../../server/test/factories");
const { p0GenerationRuns } = await import("../../drizzle/schema");

interface Entry {
  id: string;
  kind: string;
  name: string;
  element: string;
  category: string;
  description: string;
}

const corpus: Entry[] = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "corpus/creation-corpus.json"), "utf8")).slice(0, limit);
const db = (await getDb())!;
const started = new Date();
console.log(`corpus run started ${started.toISOString()} (${corpus.length} prompts)`);

const rows: string[] = [];
for (const entry of corpus) {
  // Fresh player per prompt: strikes from harmful prompts must not block later ones.
  const user = await createTestUser();
  await grantSpark(user.id, 2, "admin_adjust", `corpus:${entry.id}:${Date.now()}`);
  const t = Date.now();
  const result = await createSpell(user.id, {
    name: entry.name.slice(0, 64),
    element: entry.element,
    category: entry.category,
    castType: "Instant",
    description: entry.description,
  });
  const ms = Date.now() - t;
  const [run] = await db.select().from(p0GenerationRuns).where(eq(p0GenerationRuns.userId, user.id));
  const steps = ((run?.trace as { steps?: Array<Record<string, unknown>> } | null)?.steps ?? [])
    .filter((s) => String(s.step).includes("2b") || String(s.step).includes("2c"))
    .map((s) => `${s.step}:${s.verdict ?? s.reasonCode ?? ""}${s.reason ? `(${s.reason})` : ""}`)
    .join(" ");
  const outcome = result.success ? "success" : result.code;
  rows.push(`| ${entry.id} | ${entry.kind} | ${outcome} | ${run?.attempts ?? 0} | ${run?.layer2cFired ? "yes" : ""} | ${(ms / 1000).toFixed(1)}s | ${steps} |`);
  process.stdout.write(result.success ? "." : result.code === "input_rejected" ? "r" : "x");
  // Stay under free per-minute limits.
  await new Promise((r) => setTimeout(r, 1500));
}

const table = `# Corpus run ${started.toISOString()}

| id | kind | outcome | attempts | 2c | time | moderation trail |
|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
const out = path.resolve(import.meta.dirname, "reports", `corpus-run-${started.toISOString().slice(0, 10)}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, table);
console.log(`\n${table}\nWritten: ${out}\nNext: pnpm cost-report --test --since ${started.toISOString()} --write`);
process.exit(0);
