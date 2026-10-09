// Fake-door Spark pricing (Phase Plan 5, task A13). Records intent and waitlist
// opt-ins; never grants Spark (that would contaminate the signal).
import { z } from "zod";
import { count, eq, sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { p0AnalyticsEvents, p0SparkWaitlist } from "../../drizzle/schema";
import { trackEvent } from "../analytics";
import { getSparkBalance } from "../spark";
import { SPARK_PACKS } from "../../shared/constants";

const PackId = z.enum(SPARK_PACKS.map((p) => p.id) as [string, ...string[]]);

export const sparkRouter = router({
  packIntent: protectedProcedure.input(z.object({ pack: PackId, source: z.enum(["zero_spark", "chip"]) })).mutation(async ({ ctx, input }) => {
    const { balance } = await getSparkBalance(ctx.user.id);
    await trackEvent({ eventType: "spark_pack_intent", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: { pack: input.pack, source: input.source, balance } });
    return { recorded: true };
  }),

  joinWaitlist: protectedProcedure.input(z.object({ pack: PackId.optional() })).mutation(async ({ ctx, input }) => {
    await requireDb()
      .insert(p0SparkWaitlist)
      .values({ userId: ctx.user.id, packClicked: input.pack ?? null })
      .onDuplicateKeyUpdate({ set: { packClicked: sql`COALESCE(${input.pack ?? null}, ${p0SparkWaitlist.packClicked})` } });
    await trackEvent({ eventType: "spark_waitlist_joined", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: { pack: input.pack ?? null } });
    return { joined: true };
  }),

  onWaitlist: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await requireDb().select().from(p0SparkWaitlist).where(eq(p0SparkWaitlist.userId, ctx.user.id)).limit(1);
    return { joined: Boolean(row) };
  }),

  fakeDoorStats: adminProcedure.query(async () => {
    const db = requireDb();
    const intents = await db
      .select({ pack: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${p0AnalyticsEvents.metadata}, '$.pack'))`, n: count() })
      .from(p0AnalyticsEvents)
      .where(eq(p0AnalyticsEvents.eventType, "spark_pack_intent"))
      .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(${p0AnalyticsEvents.metadata}, '$.pack'))`);
    const [waitlist] = await db.select({ n: count() }).from(p0SparkWaitlist);
    return { intents: intents.map((i) => ({ pack: i.pack, clicks: Number(i.n) })), waitlist: Number(waitlist?.n ?? 0) };
  }),
});
