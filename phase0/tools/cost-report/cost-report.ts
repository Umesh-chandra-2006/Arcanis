// Cost report (Build Plan 7.7, 11; task A8). Aggregates provider_calls and
// generation_runs: cost per successful creation, retry rate, schema failure
// rate, 2a clamp rate, 2b rejection rate, 2c trigger rate, latency.
//   pnpm cost-report               production database, last 7 days
//   pnpm cost-report --test        test database
//   pnpm cost-report --days 30
//   pnpm cost-report --since 2026-10-10T00:00:00Z   (A14 corpus runs)
import path from "node:path";
import fs from "node:fs";

process.loadEnvFile?.(path.resolve(import.meta.dirname, "../../../.env"));
if (process.argv.includes("--test")) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

const { gte } = await import("drizzle-orm");
const { getDb } = await import("../../server/db");
const { p0GenerationRuns, p0ProviderCalls } = await import("../../drizzle/schema");

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const since = arg("--since") ? new Date(arg("--since")!) : new Date(Date.now() - Number(arg("--days") ?? 7) * 86_400_000);

const db = (await getDb())!;
const runs = await db.select().from(p0GenerationRuns).where(gte(p0GenerationRuns.createdAt, since));
const calls = await db.select().from(p0ProviderCalls).where(gte(p0ProviderCalls.createdAt, since));

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "-");
const usd = (n: number) => `$${n.toFixed(5)}`;
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
};

const finished = runs.filter((r) => r.outcome !== "running");
const success = finished.filter((r) => r.outcome === "success");
const runIds = new Set(finished.map((r) => r.id));
const runCalls = calls.filter((c) => c.runId && runIds.has(c.runId));
const successIds = new Set(success.map((r) => r.id));
const successCost = runCalls.filter((c) => successIds.has(c.runId!)).reduce((s, c) => s + c.costEstimateUsd, 0);
const allRunCost = runCalls.reduce((s, c) => s + c.costEstimateUsd, 0);
const schemaFailures = finished.reduce((n, r) => {
  const steps = ((r.trace as { steps?: Array<{ step: string }> } | null)?.steps ?? []);
  return n + steps.filter((s) => s.step === "layer2a_schema").length;
}, 0);
// Denominators come from run traces, so runs with any provider (including test fakes) count.
const stepsOf = (r: (typeof finished)[number]) => ((r.trace as { steps?: Array<{ step: string; verdict?: string }> } | null)?.steps ?? []);
const layer1Responses = finished.reduce((n, r) => n + stepsOf(r).filter((s) => s.step === "layer2a_schema" || s.step === "layer2a_text" || s.step === "layer2a_stats").length, 0);
const moderationSteps = finished.flatMap((r) => stepsOf(r).filter((s) => s.step === "text_2b" || s.step === "input_2b" || s.step === "image_2b"));
const textRejects = moderationSteps.filter((s) => s.verdict === "reject").length;

const bySurface = new Map<string, typeof calls>();
for (const c of calls) bySurface.set(`${c.surface} ${c.provider}:${c.model}`, [...(bySurface.get(`${c.surface} ${c.provider}:${c.model}`) ?? []), c]);

const report = `# Cost report

- Database: ${process.argv.includes("--test") ? "test" : "production"}
- Window: since ${since.toISOString()}
- Creations attempted: ${finished.length} (success ${success.length}, refunded ${finished.filter((r) => r.outcome === "refunded").length}, user rejected ${finished.filter((r) => r.outcome === "user_rejected").length}, error ${finished.filter((r) => r.outcome === "error").length})

## Gate metrics

| Metric | Value | Target |
|---|---|---|
| All-in cost per successful creation (shadow, list price) | ${success.length ? usd(allRunCost / success.length) : "-"} | at or below $0.08 |
| Cost of successful runs only, per success | ${success.length ? usd(successCost / success.length) : "-"} | |
| Retry rate (Layer 1 attempts beyond the first) | ${pct(finished.reduce((s, r) => s + Math.max(0, r.attempts - 1), 0), finished.length)} | |
| Schema failure rate (per Layer 1 response) | ${pct(schemaFailures, layer1Responses)} | |
| Layer 2a clamp or rescale rate | ${pct(finished.filter((r) => r.layer2aClamped).length, finished.length)} | |
| Layer 2a fallback rate | ${pct(finished.filter((r) => r.layer2aFallback).length, finished.length)} | |
| Layer 2b flag rate (any surface, per run) | ${pct(finished.filter((r) => r.layer2bFlagged).length, finished.length)} | |
| Layer 2b rejections (per moderation check) | ${pct(textRejects, moderationSteps.length)} | |
| Layer 2c trigger rate | ${pct(finished.filter((r) => r.layer2cFired).length, finished.length)} | at or below 15% |
| Creation latency p50 / p95 | ${(quantile(finished.filter((r) => r.finishedAt).map((r) => r.finishedAt!.getTime() - r.createdAt.getTime()), 0.5) / 1000).toFixed(1)}s / ${(quantile(finished.filter((r) => r.finishedAt).map((r) => r.finishedAt!.getTime() - r.createdAt.getTime()), 0.95) / 1000).toFixed(1)}s | first card in under 3 min |

## Provider calls

| Surface and model | calls | success | quota | rate limited | other errors | p50 ms | p95 ms | shadow cost |
|---|---|---|---|---|---|---|---|---|
${[...bySurface.entries()]
  .sort()
  .map(([k, cs]) => {
    const n = (o: string) => cs.filter((c) => c.outcome === o).length;
    const lat = cs.filter((c) => c.outcome === "success").map((c) => c.latencyMs);
    return `| ${k} | ${cs.length} | ${n("success")} | ${n("quota")} | ${n("rate_limited")} | ${cs.length - n("success") - n("quota") - n("rate_limited")} | ${quantile(lat, 0.5)} | ${quantile(lat, 0.95)} | ${usd(cs.reduce((s, c) => s + c.costEstimateUsd, 0))} |`;
  })
  .join("\n")}

Real spend is $0 while every provider is on a free tier; costs are list-price estimates (server/providers/pricing.ts).
`;

console.log(report);
if (process.argv.includes("--write")) {
  const out = path.resolve(import.meta.dirname, "reports");
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `cost-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(file, report);
  console.log(`Report written: ${file}`);
}
process.exit(0);
