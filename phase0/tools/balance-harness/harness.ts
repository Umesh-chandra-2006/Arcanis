// Balance harness, Phase 1a: Power Budget conformance (Build Plan 11, task A8).
// Runs the creation corpus through Layer 1 and Layer 2a and reports how often
// allocations are clamped, rescaled or replaced, how stats spread, and damage
// per MP and per Will by category and element. Battle simulation (win rates,
// Will band dwell time) is added in B8.
//
//   pnpm harness              live Layer 1 (spends free text quota; uses the TEST database for telemetry)
//   pnpm harness --offline    random allocations, no provider calls (checks the budget math only)
//   pnpm harness --limit 20   first N corpus entries
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile?.(path.resolve(import.meta.dirname, "../../../.env"));
const offline = process.argv.includes("--offline");
if (!offline) {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for live runs (telemetry goes there, never to production).");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
// One request at a time: free tiers are per-minute limited (Groq 8,000 tokens/min).
const concurrency = 1;

const { getDb } = await import("../../server/db");
const { generateText } = await import("../../server/providers/text");
const { IDENTITY_SYSTEM_PROMPT, buildLayer1Prompt } = await import("../../server/spell-pipeline");
const { stripFences } = await import("../../server/semantic-check");
const { LLMSpellIdentitySchema } = await import("../../shared/validation");
const { computeBudgetSpec, enforceAllocation, pointsSpent } = await import("../../shared/power-budget");
const { TIER_CAPS, CAST_TIME_MS } = await import("../../shared/taxonomy");
type Spec = ReturnType<typeof computeBudgetSpec>;

interface CorpusEntry {
  id: string;
  kind: "realistic" | "adversarial";
  name: string;
  element: string;
  category: string;
  description: string;
}

interface Row {
  entry: CorpusEntry;
  ok: boolean;
  error?: string;
  provider?: string;
  latencyMs?: number;
  reasons: string[];
  clamped: boolean;
  rescaled: "down" | "up" | null;
  fallback: boolean;
  spentShare: number; // points spent / budget
  damageAvg: number;
  mp: number;
  willAvg: number;
  castMs: number;
  drain: number | null;
}

const corpus: CorpusEntry[] = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "corpus/creation-corpus.json"), "utf8")).slice(0, limit);
if (!offline) await getDb();

function randomAllocation(spec: Spec) {
  const caps = TIER_CAPS[spec.tier];
  const pick = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);
  const d = [pick(caps.damage), pick(caps.damage)].sort((a, b) => a - b);
  return {
    damage_min: d[0],
    damage_max: d[1],
    mp_cost: pick(caps.mp),
    will_cost_min: pick(caps.will),
    will_cost_max: pick(caps.will),
    cast_time_ms: pick(CAST_TIME_MS[spec.castType]),
    drain_ratio: Math.random() * 0.6,
  };
}

/** Retries when every provider was only throttled; gives up on real quota exhaustion. */
async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const errs = (error as { errors?: Array<{ kind: string }> }).errors ?? [];
      const throttled = errs.length > 0 && errs.every((e) => e.kind === "rate_limited" || e.kind === "server");
      if (!throttled || attempt >= 4) throw error;
      await new Promise((r) => setTimeout(r, 15_000 * (attempt + 1)));
    }
  }
}

async function runOne(entry: CorpusEntry): Promise<Row> {
  const spec = computeBudgetSpec({ tier: "Basic", element: entry.element as never, category: entry.category as never, castType: "Instant" });
  let raw: unknown;
  let provider: string | undefined;
  const started = Date.now();
  if (offline) {
    raw = randomAllocation(spec);
  } else {
    try {
      const response = await withBackoff(() => generateText(
        { surface: "spell_identity", runId: `harness-${entry.id}`.slice(0, 36) },
        {
          system: IDENTITY_SYSTEM_PROMPT,
          user: buildLayer1Prompt({ ...entry, castType: "Instant" } as never, spec, null),
          json: true,
          maxTokens: 1200,
        }
      ));
      provider = `${response.provider}:${response.model}`;
      const parsed = LLMSpellIdentitySchema.safeParse(JSON.parse(stripFences(response.text)));
      raw = parsed.success ? parsed.data.stats : null;
    } catch (error) {
      return { entry, ok: false, error: error instanceof Error ? error.message.slice(0, 120) : String(error), reasons: [], clamped: false, rescaled: null, fallback: false, spentShare: 0, damageAvg: 0, mp: 0, willAvg: 0, castMs: 0, drain: null };
    }
  }
  const result = enforceAllocation(spec, raw);
  const a = result.allocation;
  return {
    entry,
    ok: true,
    provider,
    latencyMs: Date.now() - started,
    reasons: result.reasons,
    clamped: result.clamped,
    rescaled: result.rescaled,
    fallback: result.fallback,
    spentShare: pointsSpent(spec, a) / spec.budget,
    damageAvg: (a.damage_min + a.damage_max) / 2,
    mp: a.mp_cost,
    willAvg: (a.will_cost_min + a.will_cost_max) / 2,
    castMs: a.cast_time_ms,
    drain: a.drain_ratio,
  };
}

const rows: Row[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: offline ? 1 : concurrency }, async () => {
    while (next < corpus.length) {
      const entry = corpus[next++];
      const row = await runOne(entry);
      rows.push(row);
      process.stdout.write(row.ok ? "." : "x");
    }
  })
);
process.stdout.write("\n");

// ---- report ----
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "-");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

function groupTable(by: (r: Row) => string, label: string, data: Row[]): string {
  const groups = new Map<string, Row[]>();
  for (const r of data) groups.set(by(r), [...(groups.get(by(r)) ?? []), r]);
  const lines = [
    `| ${label} | n | clamped | rescaled down | raised to floor | fallback | damage avg (sd) | MP avg | Will avg | dmg/MP | dmg/Will | cast ms |`,
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [key, rs] of [...groups.entries()].sort()) {
    lines.push(
      `| ${key} | ${rs.length} | ${pct(rs.filter((r) => r.clamped).length, rs.length)} | ${pct(rs.filter((r) => r.rescaled === "down").length, rs.length)} | ${pct(rs.filter((r) => r.rescaled === "up").length, rs.length)} | ${pct(rs.filter((r) => r.fallback).length, rs.length)} | ${f1(mean(rs.map((r) => r.damageAvg)))} (${f1(sd(rs.map((r) => r.damageAvg)))}) | ${f1(mean(rs.map((r) => r.mp)))} | ${f1(mean(rs.map((r) => r.willAvg)))} | ${f2(mean(rs.map((r) => r.damageAvg / r.mp)))} | ${f2(mean(rs.map((r) => r.damageAvg / r.willAvg)))} | ${Math.round(mean(rs.map((r) => r.castMs)))} |`
    );
  }
  return lines.join("\n");
}

const ok = rows.filter((r) => r.ok);
const realistic = ok.filter((r) => r.entry.kind === "realistic");
const adversarial = ok.filter((r) => r.entry.kind === "adversarial");
const failed = rows.filter((r) => !r.ok);
// Same classification, different descriptions: does the description move the stats?
const pairs = new Map<string, Row[]>();
for (const r of realistic) pairs.set(`${r.entry.element}/${r.entry.category}`, [...(pairs.get(`${r.entry.element}/${r.entry.category}`) ?? []), r]);
const distinct = [...pairs.values()].filter((rs) => rs.length > 1 && new Set(rs.map((r) => `${r.damageAvg}|${r.mp}|${r.willAvg}|${r.castMs}`)).size > 1).length;
const providers = new Map<string, number>();
for (const r of ok) if (r.provider) providers.set(r.provider, (providers.get(r.provider) ?? 0) + 1);

const report = `# Balance harness report (Phase 1a, Power Budget)

- Date: ${new Date().toISOString()}
- Mode: ${offline ? "offline (random allocations)" : "live Layer 1"}
- Corpus entries: ${rows.length} (${realistic.length} realistic ok, ${adversarial.length} adversarial ok, ${failed.length} provider failures)
- Providers: ${[...providers.entries()].map(([p, n]) => `${p} ${n}`).join(", ") || "-"}
- Median Layer 1 latency: ${offline ? "-" : `${Math.round([...ok.map((r) => r.latencyMs ?? 0)].sort((a, b) => a - b)[Math.floor(ok.length / 2)] ?? 0)} ms`}

## Conformance (realistic prompts)

- Clamped into range: ${pct(realistic.filter((r) => r.clamped).length, realistic.length)}
- Over budget, rescaled down: ${pct(realistic.filter((r) => r.rescaled === "down").length, realistic.length)}
- Under the floor, raised: ${pct(realistic.filter((r) => r.rescaled === "up").length, realistic.length)}
- Malformed, fell back to default profile (2a flag, escalates to 2c): ${pct(realistic.filter((r) => r.fallback).length, realistic.length)}
- Budget used after 2a: mean ${f2(mean(realistic.map((r) => r.spentShare)))} of budget (bounds 0.85 to 1.00)
- Same classification, different descriptions, different stats: ${distinct} of ${[...pairs.values()].filter((rs) => rs.length > 1).length} pairs

## By category

${groupTable((r) => r.entry.category, "Category", realistic)}

## By element

${groupTable((r) => r.entry.element, "Element", realistic)}

## Adversarial prompts

| id | 2a reasons | fallback | damage | MP | Will | cast ms | budget used |
|---|---|---|---|---|---|---|---|
${adversarial.map((r) => `| ${r.entry.id} | ${r.reasons.join(", ") || "none"} | ${r.fallback ? "yes" : "no"} | ${f1(r.damageAvg)} | ${r.mp} | ${f1(r.willAvg)} | ${r.castMs} | ${f2(r.spentShare)} |`).join("\n")}

Every adversarial allocation above is inside the caps and the budget: 2a enforces that whatever the model returns. Content moderation of these prompts (gore, hate, real people) is measured by the full corpus run in A14, not here.
${failed.length ? `\n## Provider failures\n\n${failed.map((r) => `- ${r.entry.id}: ${r.error}`).join("\n")}\n` : ""}`;

const outDir = path.resolve(import.meta.dirname, "reports");
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `power-budget-${offline ? "offline" : "live"}-${new Date().toISOString().slice(0, 10)}.md`);
fs.writeFileSync(file, report);
console.log(report);
console.log(`\nReport written: ${file}`);
process.exit(0);
