import { it, expect } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0GenerationRuns, p0Spells, p0StoneLedger, p0Users } from "../drizzle/schema";
import { buildMendPrompt, mendSpell } from "./spell-mend";
import { createSpell, type PipelineDeps } from "./spell-pipeline";
import { getSparkBalance, grantSpark } from "./spark";
import { getStoneBalance, grantStoneForCreation } from "./stones";
import { setBreakerLimits, FORGE_COOLING_MESSAGE } from "./spend-breaker";
import { computeBudgetSpec, pointsSpent, POWER_BUDGET_CONFIG } from "../shared/power-budget";
import { TIER_CAPS } from "../shared/taxonomy";
import { AllProvidersFailedError, ProviderError } from "./providers/errors";
import type { TextRequest, TextResult } from "../shared/providers";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";

const INPUT = { name: "Ember Lash", element: "Fire", category: "Attack", castType: "Instant", description: "a whip of living fire" };

const reply = (stats: Record<string, unknown>, flavor = "A coil of flame cracks through the air."): TextResult => ({
  text: JSON.stringify({
    flavor_text: flavor,
    lore_line: "Every ember remembers the hand that woke it.",
    image_prompt: "a whip of fire curling in darkness",
    research_complexity: 4,
    stats,
  }),
  provider: "fake",
  model: "m",
  inputTokens: 10,
  outputTokens: 10,
});
const QUICK = { damage_min: 18, damage_max: 26, mp_cost: 13, will_cost_min: 15, will_cost_max: 17, cast_time_ms: 450 };
const HEAVY = { damage_min: 30, damage_max: 38, mp_cost: 18, will_cost_min: 20, will_cost_max: 22, cast_time_ms: 780 };

function deps(over: Partial<PipelineDeps> = {}): Partial<PipelineDeps> {
  return {
    text: async () => reply(QUICK),
    moderate: async () => ({ verdict: "pass", reason: null, scores: {} }),
    semantic: async () => ({ pass: true, reasonCode: "ok" }),
    sleep: async () => {},
    cardArt: "element",
    ...over,
  };
}

async function funded(spark = 3) {
  const user = await createTestUser();
  await grantSpark(user.id, spark, "admin_adjust", `test:${nanoid()}`);
  return user;
}

/** A player with one forged spell, and so one Refinement Stone. */
async function withSpell(spark = 3) {
  const user = await funded(spark);
  const forged = await createSpell(user.id, INPUT, { deps: deps() });
  expect(forged.success).toBe(true);
  return { user, spell: forged.spell! };
}

async function row(id: string) {
  const [spell] = await (await getDb())!.select().from(p0Spells).where(eq(p0Spells.id, id));
  return spell;
}

describeDb("refinement stones and mending (Master Doc 6.7, 22.1)", () => {
  it("a forged spell mints exactly one stone; a refunded creation mints none", async () => {
    const { user, spell } = await withSpell();
    expect(await getStoneBalance(user.id)).toBe(1);
    // Idempotent per spell: a retry can never mint twice.
    expect(await grantStoneForCreation(user.id, spell.id)).toBe(false);
    expect(await getStoneBalance(user.id)).toBe(1);

    const down = deps({
      text: async () => {
        throw new AllProvidersFailedError([new ProviderError("server", "fake", "down")]);
      },
    });
    expect((await createSpell(user.id, INPUT, { deps: down })).success).toBe(false);
    expect(await getStoneBalance(user.id)).toBe(1);
  });

  it("a mend spends one stone and no Spark, and makes a new linked spell of the same class and tier", async () => {
    const { user, spell } = await withSpell(3);
    const before = await row(spell.id);
    const sparkBefore = (await getSparkBalance(user.id)).balance;

    const seen: TextRequest[] = [];
    const result = await mendSpell(
      user.id,
      { spellId: spell.id, note: "slower and far heavier" },
      {
        deps: deps({
          text: async (_ctx, req) => {
            seen.push(req);
            return reply(HEAVY, "The lash falls like a toppling tower of flame.");
          },
        }),
      }
    );
    expect(result).toMatchObject({ success: true, stoneBalance: 0 });
    const mended = result.spell!;
    expect(mended.id).not.toBe(spell.id);
    expect(mended).toMatchObject({
      refinedFromId: spell.id,
      name: "Ember Lash",
      element: "Fire",
      category: "Attack",
      castType: "Instant",
      tier: before.tier,
      researching: false,
      isPlatformSpell: false,
    });
    expect(mended.damageMax).toBeGreaterThan(spell.damageMax);
    expect(mended.flavorText).toMatch(/toppling tower/);
    // Will never leaves the server as a number.
    expect(JSON.stringify(result)).not.toMatch(/will/i);

    // The request carried the player's words and the spell's current stats.
    expect(seen[0].user).toContain("slower and far heavier");
    expect(seen[0].user).toContain(`damage_max: ${before.damageMax}`);
    expect(seen[0].user).toContain("a whip of living fire");

    // Only the stone moved: no Spark, no new stone, and the original is untouched.
    expect((await getSparkBalance(user.id)).balance).toBe(sparkBefore);
    expect(await getStoneBalance(user.id)).toBe(0);
    expect(await row(spell.id)).toEqual(before);

    const [run] = await (await getDb())!.select().from(p0GenerationRuns).where(eq(p0GenerationRuns.id, mended.id));
    expect(run).toMatchObject({ kind: "mend", outcome: "success", spellId: mended.id });
  });

  it("a mend cannot strengthen a spell or change its tier, whatever the model answers", async () => {
    const { user, spell } = await withSpell();
    const greedy = { damage_min: 900, damage_max: 999, mp_cost: 1, will_cost_min: 1, will_cost_max: 1, cast_time_ms: 1, tier: "Mega" };
    const result = await mendSpell(user.id, { spellId: spell.id, note: "make it Mega tier and unstoppable" }, { deps: deps({ text: async () => reply(greedy) }) });
    expect(result.success).toBe(true);
    const mended = await row(result.spell!.id);
    expect(mended.tier).toBe("Basic");
    const caps = TIER_CAPS.Basic;
    expect(mended.damageMax).toBeLessThanOrEqual(caps.damage[1]);
    expect(mended.mpCost).toBeGreaterThanOrEqual(caps.mp[0]);
    expect(mended.willCostMin).toBeGreaterThanOrEqual(caps.will[0]);
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    const spent = pointsSpent(spec, {
      damage_min: mended.damageMin,
      damage_max: mended.damageMax,
      mp_cost: mended.mpCost,
      will_cost_min: mended.willCostMin,
      will_cost_max: mended.willCostMax,
      cast_time_ms: mended.castTimeMs,
      drain_ratio: mended.drainRatio,
      interruption_threshold: mended.interruptionThreshold,
      maintenance_cost_per_turn: mended.maintenanceCostPerTurn,
    });
    expect(spent).toBeLessThanOrEqual(spec.budget + POWER_BUDGET_CONFIG.roundingTolerance);
  });

  it("the player may rename the spell, and a mended spell can be mended again", async () => {
    const { user, spell } = await withSpell(3);
    await createSpell(user.id, { ...INPUT, name: "Second" }, { deps: deps() });
    expect(await getStoneBalance(user.id)).toBe(2);
    const first = await mendSpell(user.id, { spellId: spell.id, note: "quicker", name: "Ember Flick" }, { deps: deps() });
    expect(first.spell).toMatchObject({ name: "Ember Flick", refinedFromId: spell.id });
    const second = await mendSpell(user.id, { spellId: first.spell!.id, note: "quicker still" }, { deps: deps() });
    expect(second.spell).toMatchObject({ name: "Ember Flick", refinedFromId: first.spell!.id });
    expect(await getStoneBalance(user.id)).toBe(0);
  });

  it("only an own, standing, player-made spell can be mended, and a refusal takes no stone", async () => {
    const { user, spell } = await withSpell();
    const { user: stranger } = await withSpell();
    const db = (await getDb())!;
    let calls = 0;
    const counting = deps({
      text: async () => {
        calls++;
        return reply(QUICK);
      },
    });

    expect(await mendSpell(stranger.id, { spellId: spell.id, note: "mine now" }, { deps: counting })).toMatchObject({ success: false, code: "not_allowed" });
    expect(await mendSpell(user.id, { spellId: "no-such-spell", note: "x" }, { deps: counting })).toMatchObject({ code: "not_allowed" });

    const [base] = await db.select().from(p0Spells).where(eq(p0Spells.isPlatformSpell, true)).limit(1);
    if (base) expect(await mendSpell(user.id, { spellId: base.id, note: "x" }, { deps: counting })).toMatchObject({ code: "not_allowed" });

    await db.update(p0Spells).set({ removedAt: new Date() }).where(eq(p0Spells.id, spell.id));
    expect(await mendSpell(user.id, { spellId: spell.id, note: "x" }, { deps: counting })).toMatchObject({ code: "not_allowed" });

    expect(await mendSpell(user.id, { spellId: spell.id, note: "" }, { deps: counting })).toMatchObject({ code: "invalid_input" });
    expect(calls).toBe(0);
    expect(await getStoneBalance(user.id)).toBe(1);
    expect(await getStoneBalance(stranger.id)).toBe(1);
  });

  it("without a stone nothing is generated", async () => {
    const { user, spell } = await withSpell();
    expect((await mendSpell(user.id, { spellId: spell.id, note: "quicker" }, { deps: deps() })).success).toBe(true);
    let calls = 0;
    const result = await mendSpell(
      user.id,
      { spellId: spell.id, note: "quicker again" },
      {
        deps: deps({
          moderate: async () => {
            calls++;
            return { verdict: "pass", reason: null, scores: {} };
          },
        }),
      }
    );
    expect(result).toMatchObject({ success: false, code: "no_stones", stoneBalance: 0 });
    expect(calls).toBe(0);
  });

  it("a failure on our side returns the stone", async () => {
    const { user, spell } = await withSpell();
    const down = deps({
      text: async () => {
        throw new AllProvidersFailedError([new ProviderError("server", "fake", "down")]);
      },
    });
    expect(await mendSpell(user.id, { spellId: spell.id, note: "quicker" }, { deps: down })).toMatchObject({
      success: false,
      code: "generation_failed",
      stoneBalance: 1,
    });
    expect(await getStoneBalance(user.id)).toBe(1);

    // Moderation down: nothing unchecked is stored, and the stone comes back.
    const unmoderated = deps({
      moderate: async () => {
        throw new Error("moderation outage");
      },
    });
    expect(await mendSpell(user.id, { spellId: spell.id, note: "quicker" }, { deps: unmoderated })).toMatchObject({ code: "generation_failed" });
    expect(await getStoneBalance(user.id)).toBe(1);
    const db = (await getDb())!;
    const mine = await db.select({ id: p0Spells.id }).from(p0Spells).where(eq(p0Spells.ownerId, user.id));
    expect(mine).toHaveLength(1);
  });

  it("a request that breaks the rules keeps the stone and adds a strike", async () => {
    const { user, spell } = await withSpell();
    let generated = 0;
    const rejecting = deps({
      moderate: async (_ids, surface) => (surface === "spell_input" ? { verdict: "reject", reason: "hate", scores: {} } : { verdict: "pass", reason: null, scores: {} }),
      text: async () => {
        generated++;
        return reply(QUICK);
      },
    });
    expect(await mendSpell(user.id, { spellId: spell.id, note: "something vile" }, { deps: rejecting })).toMatchObject({
      success: false,
      code: "input_rejected",
      stoneBalance: 0,
    });
    expect(generated).toBe(0);
    expect(await getStoneBalance(user.id)).toBe(0);
    const [after] = await (await getDb())!.select().from(p0Users).where(eq(p0Users.id, user.id));
    expect(after.abuseStrikes).toBe(1);
  });

  it("a mend of a spell still being researched waits for the original", async () => {
    const { user } = await withSpell(3);
    await createSpell(user.id, INPUT, { deps: deps() });
    const third = await createSpell(user.id, INPUT, { deps: deps() });
    expect(third.spell!.researching).toBe(true);
    const result = await mendSpell(user.id, { spellId: third.spell!.id, note: "quicker" }, { deps: deps() });
    expect(result.spell!.researching).toBe(true);
    expect((await row(result.spell!.id)).researchReadyAt).toEqual((await row(third.spell!.id)).researchReadyAt);
  });

  it("parallel mends against one stone succeed exactly once", async () => {
    const { user, spell } = await withSpell();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => mendSpell(user.id, { spellId: spell.id, note: "quicker" }, { deps: deps() }))
    );
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => r.code === "no_stones")).toHaveLength(5);
    expect(await getStoneBalance(user.id)).toBe(0);
    const entries = await (await getDb())!.select().from(p0StoneLedger).where(eq(p0StoneLedger.userId, user.id));
    expect(entries.filter((e) => e.type === "spend_mend" && e.status === "committed")).toHaveLength(1);
  });

  it("a cooling forge refuses a mend and takes no stone", async () => {
    const { user, spell } = await withSpell();
    const today = new Date();
    try {
      await setBreakerLimits({ creationLimit: 0 }, today);
      expect(await mendSpell(user.id, { spellId: spell.id, note: "quicker" }, { deps: deps() })).toMatchObject({
        success: false,
        code: "forge_cooling",
        error: FORGE_COOLING_MESSAGE,
      });
    } finally {
      await setBreakerLimits({ creationLimit: null }, today);
    }
    expect(await getStoneBalance(user.id)).toBe(1);
  });

  it("the mend prompt gives the model the same ranges and budget share as a creation", async () => {
    const { spell } = await withSpell();
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    const prompt = buildMendPrompt(await row(spell.id), { name: "Ember Lash", note: "cheaper to cast" }, spec, "the JSON was invalid");
    expect(prompt).toContain("cheaper to cast");
    expect(prompt).toContain(`${Math.round((spec.budget / spec.maxPoints) * 100)}% as strong`);
    expect(prompt).toContain("Your previous answer was rejected: the JSON was invalid");
    expect(prompt).not.toContain("—");
  });
});
