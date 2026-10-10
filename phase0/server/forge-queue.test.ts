import { it, expect, afterAll } from "vitest";
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { p0ForgeQueue } from "../drizzle/schema";
import {
  acknowledgeForged,
  createOrQueue,
  enqueueCreation,
  FORGE_QUEUE,
  forgeQueueFor,
  processForgeQueue,
  withdrawQueued,
} from "./forge-queue";
import { createSpell, type PipelineDeps, type SpellCreationResult } from "./spell-pipeline";
import { getSparkBalance, grantSpark } from "./spark";
import { AllProvidersFailedError, ProviderError } from "./providers/errors";
import type { TextResult } from "../shared/providers";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";

const INPUT = { name: "Ember Lash", element: "Fire", category: "Attack", castType: "Instant", description: "a whip of living fire" };

const goodJson = JSON.stringify({
  flavor_text: "A coil of flame cracks through the air.",
  lore_line: "Every ember remembers the hand that woke it.",
  image_prompt: "a whip of fire curling in darkness",
  research_complexity: 4,
  stats: { damage_min: 18, damage_max: 26, mp_cost: 13, will_cost_min: 15, will_cost_max: 17, cast_time_ms: 450 },
});
const textReply = (): TextResult => ({ text: goodJson, provider: "fake", model: "m", inputTokens: 10, outputTokens: 10 });

function deps(over: Partial<PipelineDeps> = {}): Partial<PipelineDeps> {
  return {
    text: async () => textReply(),
    moderate: async () => ({ verdict: "pass", reason: null, scores: {} }),
    semantic: async () => ({ pass: true, reasonCode: "ok" }),
    sleep: async () => {},
    cardArt: "element",
    ...over,
  };
}

const cooling = async (): Promise<SpellCreationResult> => ({ success: false, code: "forge_cooling", error: "cooling" });
const open = async () => true;

const userIds: number[] = [];
async function funded(spark = 3) {
  const user = await createTestUser();
  userIds.push(user.id);
  await grantSpark(user.id, spark, "admin_adjust", `test:${nanoid()}`);
  return user;
}

async function entry(id: string) {
  const [row] = await (await getDb())!.select().from(p0ForgeQueue).where(eq(p0ForgeQueue.id, id));
  return row;
}

describeDb("forge queue (Master Doc 25, v7.5)", () => {
  // Leave nothing waiting: this database is shared with local dev, whose queue loop is live.
  afterAll(async () => {
    const db = await getDb();
    if (db && userIds.length) {
      await db.update(p0ForgeQueue).set({ status: "cancelled" }).where(inArray(p0ForgeQueue.userId, userIds));
    }
  });

  it("a cooling forge queues the design and reserves no Spark", async () => {
    const user = await funded(2);
    const result = await createOrQueue(user.id, INPUT, { create: cooling });
    expect(result).toMatchObject({ success: false, code: "queued" });
    expect((await getSparkBalance(user.id)).balance).toBe(2);
    const view = await forgeQueueFor(user.id);
    expect(view.waiting).toHaveLength(1);
    expect(view.waiting[0]).toMatchObject({ name: "Ember Lash", element: "Fire" });
    expect(view.finished).toHaveLength(0);
  });

  it("an open forge creates at once and queues nothing", async () => {
    const user = await funded(1);
    const ok = async (): Promise<SpellCreationResult> => ({ success: true });
    expect(await createOrQueue(user.id, INPUT, { create: ok })).toMatchObject({ success: true });
    expect((await forgeQueueFor(user.id)).waiting).toHaveLength(0);
  });

  it("a player cannot queue more designs than they have Spark, or more than the cap", async () => {
    const poor = await funded(1);
    expect(await enqueueCreation(poor.id, INPUT)).toMatchObject({ code: "queued" });
    expect(await enqueueCreation(poor.id, INPUT)).toMatchObject({ code: "no_spark" });

    const rich = await funded(FORGE_QUEUE.maxPerPlayer + 5);
    for (let i = 0; i < FORGE_QUEUE.maxPerPlayer; i++) expect(await enqueueCreation(rich.id, INPUT)).toMatchObject({ code: "queued" });
    expect(await enqueueCreation(rich.id, INPUT)).toMatchObject({ code: "queue_full" });
  });

  it("nothing is forged while the forge is still cooling", async () => {
    const user = await funded(2);
    await enqueueCreation(user.id, INPUT);
    const tally = await processForgeQueue({ userId: user.id, deps: deps(), forgeOpen: async () => false });
    expect(tally).toEqual({ forged: 0, failed: 0, requeued: 0 });
    expect((await forgeQueueFor(user.id)).waiting).toHaveLength(1);
    expect((await getSparkBalance(user.id)).balance).toBe(2);
  });

  it("forges through the real pipeline when the forge reopens, spends one Spark, and announces it once", async () => {
    const user = await funded(2);
    await enqueueCreation(user.id, INPUT);
    const tally = await processForgeQueue({ userId: user.id, deps: deps(), forgeOpen: open });
    expect(tally.forged).toBe(1);
    expect((await getSparkBalance(user.id)).balance).toBe(1);

    const view = await forgeQueueFor(user.id);
    expect(view.waiting).toHaveLength(0);
    expect(view.finished).toHaveLength(1);
    expect(view.finished[0]).toMatchObject({ forged: true, name: "Ember Lash" });
    expect(view.finished[0].spellId).toBeTruthy();
    expect(JSON.stringify(view)).not.toMatch(/will/i);

    await acknowledgeForged(user.id, [view.finished[0].id]);
    expect((await forgeQueueFor(user.id)).finished).toHaveLength(0);
  });

  it("a failure on our side refunds, retries on later ticks, then gives up without spending Spark", async () => {
    const user = await funded(1);
    const queued = await enqueueCreation(user.id, INPUT);
    expect(queued.code).toBe("queued");
    const down = deps({
      text: async () => {
        throw new AllProvidersFailedError([new ProviderError("server", "fake", "down")]);
      },
    });
    for (let i = 1; i < FORGE_QUEUE.maxAttempts; i++) {
      expect(await processForgeQueue({ userId: user.id, deps: down, forgeOpen: open })).toMatchObject({ requeued: 1, failed: 0 });
    }
    expect(await processForgeQueue({ userId: user.id, deps: down, forgeOpen: open })).toMatchObject({ failed: 1 });
    expect((await getSparkBalance(user.id)).balance).toBe(1);
    const view = await forgeQueueFor(user.id);
    expect(view.finished[0]).toMatchObject({ forged: false });
    expect(view.finished[0].message).toMatch(/No Spark was spent/);
  });

  it("a design whose Spark was spent elsewhere fails cleanly when its turn comes", async () => {
    const user = await funded(1);
    await enqueueCreation(user.id, INPUT);
    // The forge reopens and the player spends their only Spark on a live creation first.
    expect((await createSpell(user.id, INPUT, { deps: deps() })).success).toBe(true);
    expect(await processForgeQueue({ userId: user.id, deps: deps(), forgeOpen: open })).toMatchObject({ forged: 0, failed: 1 });
    expect((await getSparkBalance(user.id)).balance).toBe(0);
    expect((await forgeQueueFor(user.id)).finished[0].message).toMatch(/no Spark left/);
  });

  it("a waiting design can be withdrawn, but only by its owner and only before forging", async () => {
    const user = await funded(1);
    const other = await funded(1);
    await enqueueCreation(user.id, INPUT);
    const [waiting] = (await forgeQueueFor(user.id)).waiting;
    expect(await withdrawQueued(other.id, waiting.id)).toBe(false);
    expect(await withdrawQueued(user.id, waiting.id)).toBe(true);
    expect(await withdrawQueued(user.id, waiting.id)).toBe(false);
    expect((await entry(waiting.id)).status).toBe("cancelled");
    expect(await processForgeQueue({ userId: user.id, deps: deps(), forgeOpen: open })).toMatchObject({ forged: 0 });
  });

  it("a design stuck mid-forge after a crash goes back in line", async () => {
    const user = await funded(1);
    await enqueueCreation(user.id, INPUT);
    const [waiting] = (await forgeQueueFor(user.id)).waiting;
    const db = (await getDb())!;
    await db
      .update(p0ForgeQueue)
      .set({ status: "forging", startedAt: new Date(Date.now() - FORGE_QUEUE.staleMs - 60_000) })
      .where(eq(p0ForgeQueue.id, waiting.id));
    expect(await processForgeQueue({ userId: user.id, deps: deps(), forgeOpen: open })).toMatchObject({ forged: 1 });
  });
});
