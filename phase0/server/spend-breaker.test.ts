import { it, expect } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0ProviderCalls, p0SparkLedger } from "../drizzle/schema";
import { checkBreaker, getBreakerStatus, resetBreaker, setBreakerLimits, tripBreaker, FORGE_COOLING_MESSAGE } from "./spend-breaker";
import { createSpell } from "./spell-pipeline";
import { grantSpark } from "./spark";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";

// Each test uses its own far-future UTC day so rows from other tests never count.
let dayOffset = 0;
const isolatedDay = () => new Date(Date.UTC(2031, 0, 1 + dayOffset++ * 3, 12));

describeDb("spend breaker", () => {
  it("is open with no spend and no creations", async () => {
    const status = await getBreakerStatus(isolatedDay());
    expect(status.open).toBe(true);
    expect(status.creations).toBe(0);
  });

  it("refuses at the real spend limit, counting only billed providers", async () => {
    const now = isolatedDay();
    const db = (await getDb())!;
    await db.insert(p0ProviderCalls).values({
      id: nanoid(36),
      surface: "image",
      provider: "billedco",
      model: "m",
      units: {},
      latencyMs: 1,
      costEstimateUsd: 50,
      outcome: "success",
      createdAt: now,
    });
    expect((await getBreakerStatus(now)).open).toBe(true); // shadow cost only
    const blocked = await checkBreaker({ userId: null }, now, { billedProviders: ["billedco"] });
    expect(blocked?.reason).toBe("spend_limit");
  });

  it("refuses at the creation limit and lets an admin raise it", async () => {
    const now = isolatedDay();
    await setBreakerLimits({ creationLimit: 0 }, now);
    expect((await checkBreaker({ userId: null }, now))?.reason).toBe("creation_limit");
    await setBreakerLimits({ creationLimit: 10 }, now);
    expect(await checkBreaker({ userId: null }, now)).toBeNull();
  });

  it("a quota trip holds for the day until an admin resets it", async () => {
    const now = isolatedDay();
    await tripBreaker("provider_quota", now);
    expect((await getBreakerStatus(now)).reason).toBe("provider_quota");
    const nextDay = new Date(now.getTime() + 24 * 3600 * 1000);
    expect((await getBreakerStatus(nextDay)).open).toBe(true);
    await resetBreaker(now);
    expect((await getBreakerStatus(now)).open).toBe(true);
  });

  it("the creation pipeline refuses at the limit with no Spark reserved", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 3, "admin_adjust", `test:${nanoid()}`);
    const today = new Date();
    try {
      await setBreakerLimits({ creationLimit: 0 }, today);
      const result = await createSpell(user.id, {
        name: "Ember Lash",
        element: "Fire",
        category: "Attack",
        castType: "Instant",
        description: "a whip of fire",
      });
      expect(result).toMatchObject({ success: false, error: FORGE_COOLING_MESSAGE });
      const entries = await (await getDb())!.select().from(p0SparkLedger).where(eq(p0SparkLedger.userId, user.id));
      expect(entries.filter((e) => e.type === "spend_creation")).toHaveLength(0);
    } finally {
      await setBreakerLimits({ creationLimit: null }, today);
    }
  });
});
