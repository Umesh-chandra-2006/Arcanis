// One real creation through every live provider, against the TEST database
// (tasks A6, A15). Spends free-tier quota: one text call or a few, one image
// if an image provider is configured, a few moderation calls.
//   pnpm creation:live ["description"]
import sharp from "sharp";

process.loadEnvFile?.("../.env");
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; this never runs against production.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// The test database accumulates creations from test runs; the breaker is tested elsewhere.
process.env.DAILY_CREATION_LIMIT = "1000000";

const { getDb } = await import("../server/db");
const { createSpell } = await import("../server/spell-pipeline");
const { grantSpark } = await import("../server/spark");
const { moderateWithTelemetry } = await import("../server/providers/moderation");
const { createTestUser } = await import("../server/test/factories");
const { p0GenerationRuns, p0ProviderCalls } = await import("../drizzle/schema");
const { eq } = await import("drizzle-orm");

await getDb();

// 1. Image moderation accepts a base64 data URL (needed for generated art).
const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#884422" } }).png().toBuffer();
const imageCheck = await moderateWithTelemetry({ surface: "model_check" }, [
  { type: "image", url: `data:image/png;base64,${png.toString("base64")}` },
]);
console.log(`image moderation via data URL: ok (${Object.keys(imageCheck.scores).length} categories)`);

// 2. A full creation.
const user = await createTestUser();
await grantSpark(user.id, 2, "admin_adjust", `live-check:${Date.now()}`);
const description = process.argv[2] ?? "a slow, heavy meteor of black fire that crushes everything it lands on";
const started = Date.now();
const result = await createSpell(user.id, { name: "Ashfall Meteor", element: "Fire", category: "Attack", castType: "Instant", description });
console.log(`creation: ${result.success ? "success" : `failed (${result.code}: ${result.error})`} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (result.spell) {
  const { imageUrl, ...rest } = result.spell;
  console.log(JSON.stringify({ ...rest, imageUrl: imageUrl.slice(0, 80) }, null, 2));
}
const db = (await getDb())!;
const runId = result.spell?.id;
if (runId) {
  const [run] = await db.select().from(p0GenerationRuns).where(eq(p0GenerationRuns.id, runId));
  console.log("run:", JSON.stringify({ outcome: run.outcome, attempts: run.attempts, layer2aClamped: run.layer2aClamped, layer2cFired: run.layer2cFired, totalCostUsd: run.totalCostUsd }));
  const calls = await db.select().from(p0ProviderCalls).where(eq(p0ProviderCalls.runId, runId));
  for (const c of calls) console.log(`  call ${c.surface} ${c.provider}:${c.model} ${c.outcome} ${c.latencyMs}ms $${c.costEstimateUsd.toFixed(6)}`);
}
process.exit(result.success ? 0 : 1);
