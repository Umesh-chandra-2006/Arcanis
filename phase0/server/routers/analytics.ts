import { desc, count } from "drizzle-orm";
import { router, publicProcedure } from "../_core/trpc";
import { TrackEventSchema } from "../../shared/validation";
import { trackEvent, getDailyMetrics } from "../analytics";
import { requireDb } from "../db";
import { p0Spells, p0SparkBalances, p0Users } from "../../drizzle/schema";
import { totalSparkStats } from "../spark";
import { ENV } from "../_core/env";
import type { TrpcContext } from "../_core/context";

function canViewMetrics(ctx: TrpcContext): boolean {
  if (ctx.user?.role === "admin") return true;
  if (!ENV.isProduction) return true;
  const key = ctx.req.headers["x-metrics-key"];
  return ENV.metricsKey !== "" && key === ENV.metricsKey;
}

export const analyticsRouter = router({
  track: publicProcedure.input(TrackEventSchema).mutation(async ({ ctx, input }) => {
    await trackEvent({
      eventType: input.eventType,
      userId: ctx.user?.id ?? null,
      sessionId: ctx.sessionId,
      metadata: input.metadata,
    });
    return { success: true };
  }),

  dailyMetrics: publicProcedure.query(async ({ ctx }) => {
    if (!canViewMetrics(ctx)) {
      return null;
    }
    return getDailyMetrics(7);
  }),

  weeklyMetrics: publicProcedure.query(async ({ ctx }) => {
    if (!canViewMetrics(ctx)) {
      return null;
    }
    const db = requireDb();

    const topSpells = await db
      .select({
        id: p0Spells.id,
        name: p0Spells.name,
        element: p0Spells.element,
        shareCount: p0Spells.shareCount,
        createdAt: p0Spells.createdAt,
      })
      .from(p0Spells)
      .orderBy(desc(p0Spells.shareCount), desc(p0Spells.createdAt))
      .limit(5);

    const [userCountRow] = await db.select({ value: count() }).from(p0Users);
    const [creatorCountRow] = await db
      .select({ value: count(p0Spells.ownerId) })
      .from(db.selectDistinct({ ownerId: p0Spells.ownerId }).from(p0Spells).as("creators"));

    const sparks = await totalSparkStats();

    const daily = await getDailyMetrics(7);
    const created = daily.reduce((sum, d) => sum + d.spellsCreated, 0);
    const shared = daily.reduce((sum, d) => sum + d.spellsShared, 0);
    const pageViews = daily.reduce((sum, d) => sum + d.sharePageViews, 0);
    const ctaClicks = daily.reduce((sum, d) => sum + d.sharePageCtaClicks, 0);

    const avgSharesPerUser = Math.max(0, shared) / Math.max(1, creatorCountRow?.value ?? 1);
    const conversionPerShare = pageViews > 0 ? ctaClicks / pageViews : 0;
    const kFactor = avgSharesPerUser * conversionPerShare;

    return {
      topSpells,
      kFactor: Number(kFactor.toFixed(3)),
      creationToShareRate: created > 0 ? Number((shared / created).toFixed(3)) : 0,
      signupToFirstCreationRate:
        (userCountRow?.value ?? 1) > 0
          ? Number(((creatorCountRow?.value ?? 0) / (userCountRow?.value ?? 1)).toFixed(3))
          : 0,
      sparkStats: sparks,
    };
  }),
});