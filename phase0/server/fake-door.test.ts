import { it, expect } from "vitest";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { p0AnalyticsEvents, p0SparkLedger, p0SparkWaitlist } from "../drizzle/schema";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import type { TrpcContext } from "./_core/context";

describeDb("fake door (A13)", () => {
  it("records intent and waitlist joins and never grants Spark", async () => {
    const user = await createTestUser();
    const ctx = {
      req: { headers: {}, ip: "203.0.113.5" },
      res: { getHeader: () => undefined, setHeader: () => {} },
      user,
      sessionId: nanoid(32),
      ip: "203.0.113.5",
      device: { deviceId: null, fingerprint: null, ip: null },
    } as unknown as TrpcContext;
    const api = appRouter.createCaller(ctx);
    await api.spark.packIntent({ pack: "medium", source: "zero_spark" });
    await api.spark.joinWaitlist({ pack: "medium" });
    await api.spark.joinWaitlist({ pack: "large" }); // idempotent per player
    expect((await api.spark.onWaitlist()).joined).toBe(true);

    const db = (await getDb())!;
    const intents = await db.select().from(p0AnalyticsEvents).where(and(eq(p0AnalyticsEvents.userId, user.id), eq(p0AnalyticsEvents.eventType, "spark_pack_intent")));
    expect(intents).toHaveLength(1);
    expect(intents[0].metadata).toMatchObject({ pack: "medium", source: "zero_spark", balance: 0 });
    const waitlist = await db.select().from(p0SparkWaitlist).where(eq(p0SparkWaitlist.userId, user.id));
    expect(waitlist).toHaveLength(1);
    expect(waitlist[0].packClicked).toBe("large");
    const ledger = await db.select().from(p0SparkLedger).where(eq(p0SparkLedger.userId, user.id));
    expect(ledger.filter((e) => e.amount > 0)).toHaveLength(0);
  });
});
