import { it, expect } from "vitest";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0GenerationRuns, p0ModerationEvents, p0Spells, p0Users } from "../drizzle/schema";
import { createSpell, getMySpells, getRecentSpells, getSpellPublic, type PipelineDeps } from "./spell-pipeline";
import { getSparkBalance, grantSpark } from "./spark";
import { getBreakerStatus } from "./spend-breaker";
import { AllProvidersFailedError, ProviderError } from "./providers/errors";
import type { PolicyDecision } from "./moderation";
import type { ImageResult, TextResult } from "../shared/providers";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";

const INPUT = { name: "Ember Lash", element: "Fire", category: "Attack", castType: "Instant", description: "a whip of living fire" };

const goodJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    flavor_text: "A coil of flame cracks through the air.",
    lore_line: "Every ember remembers the hand that woke it.",
    image_prompt: "a whip of fire curling in darkness, ember sparks, gold and crimson",
    research_complexity: 4,
    stats: { damage_min: 18, damage_max: 26, mp_cost: 13, will_cost_min: 15, will_cost_max: 17, cast_time_ms: 450 },
    ...overrides,
  });

const textReply = (text: string): TextResult => ({ text, provider: "fake", model: "m", inputTokens: 10, outputTokens: 10 });
const pass: PolicyDecision = { verdict: "pass", reason: null, scores: {} };

let png: Uint8Array;
async function fakeImage(): Promise<ImageResult> {
  png ??= new Uint8Array(await sharp({ create: { width: 64, height: 64, channels: 3, background: "#aa5522" } }).png().toBuffer());
  return { bytes: png, mime: "image/png", provider: "fake", model: "m", width: 64, height: 64 };
}

function deps(over: Partial<PipelineDeps> = {}): Partial<PipelineDeps> {
  return {
    text: async () => textReply(goodJson()),
    image: fakeImage,
    moderate: async () => pass,
    semantic: async () => ({ pass: true, reasonCode: "ok" }),
    sleep: async () => {},
    cardArt: "generated",
    ...over,
  };
}

async function funded(spark = 3) {
  const user = await createTestUser();
  await grantSpark(user.id, spark, "admin_adjust", `test:${nanoid()}`);
  return user;
}

async function run(runIdOf: string) {
  const [row] = await (await getDb())!.select().from(p0GenerationRuns).where(eq(p0GenerationRuns.id, runIdOf));
  return row;
}

describeDb("creation pipeline", () => {
  it("creates a spell, commits one Spark, never sends Will numbers", async () => {
    const user = await funded(3);
    const result = await createSpell(user.id, INPUT, { deps: deps() });
    expect(result.success).toBe(true);
    expect(JSON.stringify(result.spell)).not.toMatch(/will_?cost/i);
    expect(result.spell!.strain).toMatch(/light|moderate|heavy/);
    expect(result.spell!.researching).toBe(false); // first spell skips research
    expect(result.spell!.imageUrl).toMatch(/^data:image\/webp/); // card variant via inline storage in tests
    expect((await getSparkBalance(user.id)).balance).toBe(2);
    const r = await run(result.spell!.id);
    expect(r.outcome).toBe("success");
    expect(r.attempts).toBe(1);
    const [row] = await (await getDb())!.select().from(p0Spells).where(eq(p0Spells.id, result.spell!.id));
    expect(row.ogImageUrl).toMatch(/^data:image\/jpeg/);
    expect(row.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rejects harmful input before generation: Spark spent, strike added, nothing generated", async () => {
    const user = await funded(3);
    let textCalls = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        moderate: async (_ctx, surface) => (surface === "spell_input" ? { verdict: "reject", reason: "hate", scores: { hate: 0.9 } } : pass),
        text: async () => {
          textCalls++;
          return textReply(goodJson());
        },
      }),
    });
    expect(result).toMatchObject({ success: false, code: "input_rejected" });
    expect(textCalls).toBe(0);
    expect((await getSparkBalance(user.id)).balance).toBe(2);
    const [u] = await (await getDb())!.select().from(p0Users).where(eq(p0Users.id, user.id));
    expect(u.abuseStrikes).toBe(1);
  });

  it("retries silently on invalid Layer 1 output and succeeds", async () => {
    const user = await funded();
    const replies = ["not json", JSON.stringify({ flavor_text: "x" }), goodJson()];
    const result = await createSpell(user.id, INPUT, { deps: deps({ text: async () => textReply(replies.shift()!) }) });
    expect(result.success).toBe(true);
    expect((await run(result.spell!.id)).attempts).toBe(3);
  });

  it("refunds when every attempt fails", async () => {
    const user = await funded(1);
    const result = await createSpell(user.id, INPUT, { deps: deps({ text: async () => textReply("nope") }) });
    expect(result).toMatchObject({ success: false, code: "generation_failed" });
    expect((await getSparkBalance(user.id)).balance).toBe(1);
  });

  it("regenerates when 2b rejects generated text", async () => {
    const user = await funded();
    let textChecks = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        moderate: async (_ctx, surface) => {
          if (surface !== "spell_text") return pass;
          textChecks++;
          return textChecks === 1 ? { verdict: "reject", reason: "violence/graphic", scores: { "violence/graphic": 0.99 } } : pass;
        },
      }),
    });
    expect(result.success).toBe(true);
    expect(textChecks).toBe(2);
    const events = await (await getDb())!.select().from(p0ModerationEvents).where(eq(p0ModerationEvents.userId, user.id));
    expect(events.map((e) => e.verdict)).toContain("reject");
  });

  it("runs 2c only on a borderline flag, and a 2c fail forces a retry", async () => {
    const user = await funded();
    let semanticCalls = 0;
    let textChecks = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        moderate: async (_ctx, surface) => {
          if (surface !== "spell_text") return pass;
          textChecks++;
          return textChecks === 1 ? { verdict: "borderline", reason: "harassment", scores: { harassment: 0.7 } } : pass;
        },
        semantic: async () => {
          semanticCalls++;
          return { pass: false, reasonCode: "contradicts_category" };
        },
      }),
    });
    expect(result.success).toBe(true);
    expect(semanticCalls).toBe(1);
    const r = await run(result.spell!.id);
    expect(r.layer2cFired).toBe(true);
    expect(r.attempts).toBe(2);
  });

  it("a malformed stat allocation falls back to the default profile and escalates to 2c", async () => {
    const user = await funded();
    let semanticCalls = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        text: async () => textReply(goodJson({ stats: { damage_min: "lots" } })),
        semantic: async () => {
          semanticCalls++;
          return { pass: true, reasonCode: "ok" };
        },
      }),
    });
    expect(result.success).toBe(true);
    expect(semanticCalls).toBe(1);
    expect((await run(result.spell!.id)).layer2aFallback).toBe(true);
  });

  it("uses the placeholder when every image fails moderation", async () => {
    const user = await funded();
    let images = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        image: async () => {
          images++;
          return fakeImage();
        },
        moderate: async (_ctx, surface) => (surface === "spell_image" ? { verdict: "reject", reason: "sexual", scores: { sexual: 0.9 } } : pass),
      }),
    });
    expect(result.success).toBe(true);
    expect(images).toBe(3);
    expect(result.spell!.imageUrl).toBe("");
  });

  it("refunds on an unexpected error after the reservation", async () => {
    const user = await funded(1);
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        storeImage: async () => {
          throw new Error("storage exploded");
        },
      }),
    });
    expect(result).toMatchObject({ success: false, code: "generation_failed" });
    expect((await getSparkBalance(user.id)).balance).toBe(1);
  });

  it("the third spell researches; the first two do not", async () => {
    const user = await funded(5);
    const a = await createSpell(user.id, INPUT, { deps: deps() });
    const b = await createSpell(user.id, { ...INPUT, name: "Second" }, { deps: deps() });
    const c = await createSpell(user.id, { ...INPUT, name: "Third" }, { deps: deps() });
    expect([a.spell!.researching, b.spell!.researching, c.spell!.researching]).toEqual([false, false, true]);

    // Research comes first: until it completes nothing the forge made leaves the server.
    const sealed = { flavorText: "", loreLine: "", imageUrl: "", damageMin: 0, damageMax: 0, mpCost: 0, castTimeMs: 0, potentialTier: null };
    expect(c.spell).toMatchObject({ name: "Third", element: "Fire", category: "Attack", ...sealed });
    expect(a.spell!.flavorText).not.toBe("");
    const mine = await getMySpells(user.id);
    expect(mine.find((s) => s.id === c.spell!.id)).toMatchObject(sealed);
    expect(mine.find((s) => s.id === a.spell!.id)!.damageMax).toBeGreaterThan(0);
    // No public page until it is granted, and it is not on the public wall.
    const wall = (await getRecentSpells(60)).map((s) => s.id);
    expect(wall).toContain(a.spell!.id);
    expect(wall).not.toContain(c.spell!.id);
    expect(await getSpellPublic(c.spell!.id)).toBeNull();
    expect(await getSpellPublic(a.spell!.id)).not.toBeNull();

    // When the research is complete the spell is granted whole.
    await (await getDb())!.update(p0Spells).set({ researchReadyAt: new Date(Date.now() - 60_000) }).where(eq(p0Spells.id, c.spell!.id));
    const granted = await getSpellPublic(c.spell!.id);
    expect(granted).toMatchObject({ researching: false, name: "Third" });
    expect(granted!.flavorText).not.toBe("");
    expect(granted!.damageMax).toBeGreaterThan(0);
  });

  it("backs off and retries when providers are only rate-limited", async () => {
    const user = await funded();
    const waits: number[] = [];
    let calls = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        sleep: async (ms) => {
          waits.push(ms);
        },
        text: async () => {
          if (calls++ === 0) throw new AllProvidersFailedError([new ProviderError("rate_limited", "groq", "TPM"), new ProviderError("rate_limited", "gemini", "RPM")]);
          return textReply(goodJson());
        },
      }),
    });
    expect(result.success).toBe(true);
    expect(waits).toEqual([3000]);
    expect((await getBreakerStatus()).reason).not.toBe("provider_quota");
  });

  it("a moderation outage refunds and never lets content through unchecked", async () => {
    const user = await funded(1);
    let textCalls = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        moderate: async () => {
          throw new Error("moderation provider down");
        },
        text: async () => {
          textCalls++;
          return textReply(goodJson());
        },
      }),
    });
    expect(result).toMatchObject({ success: false, code: "generation_failed" });
    expect(textCalls).toBe(0);
    expect((await getSparkBalance(user.id)).balance).toBe(1);
  });

  it("element card art (Phase 0/1a default) makes no image calls", async () => {
    const user = await funded();
    let images = 0;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        cardArt: "element",
        image: async () => {
          images++;
          return fakeImage();
        },
      }),
    });
    expect(result.success).toBe(true);
    expect(images).toBe(0);
    expect(result.spell!.imageUrl).toBe("");
  });

  it("refuses a restricted account without reserving Spark", async () => {
    const user = await funded(2);
    await (await getDb())!.update(p0Users).set({ restrictedUntil: new Date(Date.now() + 3600_000) }).where(eq(p0Users.id, user.id));
    const result = await createSpell(user.id, INPUT, { deps: deps() });
    expect(result).toMatchObject({ success: false, code: "restricted" });
    expect((await getSparkBalance(user.id)).balance).toBe(2);
  });

  it("quota exhaustion on every text provider refunds and trips the breaker for the day", async () => {
    const user = await funded(1);
    const isolatedDay = new Date(Date.UTC(2032, 5, 1, 12));
    // That far-future clock is also due a weekly allowance; compare at the same clock.
    const before = (await getSparkBalance(user.id, isolatedDay)).balance;
    const result = await createSpell(user.id, INPUT, {
      deps: deps({
        now: () => isolatedDay,
        text: async () => {
          throw new AllProvidersFailedError([new ProviderError("quota", "groq", "out"), new ProviderError("quota", "gemini", "out")]);
        },
      }),
    });
    expect(result.success).toBe(false);
    expect((await getSparkBalance(user.id, isolatedDay)).balance).toBe(before);
    expect((await getBreakerStatus(isolatedDay)).reason).toBe("provider_quota");
  });
});
