import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { trackEvent, getDailyMetrics } from "../analytics";
import { requireDb } from "../db";
import { p0Spells } from "../../drizzle/schema";
import { totalSparkStats } from "../spark";
import { checkRateLimit } from "../rate-limit";
import { computeGateMetrics } from "../gate-metrics";
import { ANONYMOUS_EVENTS, AUTHENTICATED_EVENTS, MAX_EVENT_PROPS_BYTES } from "../../shared/analytics-events";

const TrackInput = z.object({
  eventType: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const analyticsRouter = router({
  /**
   * Public tracking endpoint (Build Plan 12): allowlisted events only, props
   * validated (unknown props dropped) and size-limited, rate-limited per IP and
   * per anonymous id; the user always comes from the session.
   */
  track: publicProcedure.input(TrackInput).mutation(async ({ ctx, input }) => {
    const allowed = (ctx.user ? AUTHENTICATED_EVENTS : ANONYMOUS_EVENTS) as Record<string, z.ZodTypeAny>;
    const schema = allowed[input.eventType];
    if (!schema) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown event" });
    if (JSON.stringify(input.metadata).length > MAX_EVENT_PROPS_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
    const props = schema.safeParse(input.metadata);
    if (!props.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid event props" });
    const limits = [
      checkRateLimit(`track:ip:${ctx.ip ?? "unknown"}`, 120, 3600),
      ...(ctx.sessionId ? [checkRateLimit(`track:anon:${ctx.sessionId}`, 60, 3600)] : []),
    ];
    if (limits.some((l) => !l.allowed)) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    await trackEvent({ eventType: input.eventType, userId: ctx.user?.id ?? null, sessionId: ctx.sessionId, metadata: props.data as Record<string, unknown> });
    return { success: true };
  }),

  /** Gate 1a dashboard (Phase Plan v2.2 Section 5). */
  gateMetrics: adminProcedure.input(z.object({ days: z.number().int().min(1).max(180).default(28) }).optional()).query(({ input }) =>
    computeGateMetrics({ days: input?.days ?? 28 })
  ),

  dailyMetrics: adminProcedure.query(() => getDailyMetrics(7)),

  overview: adminProcedure.query(async () => {
    const topSpells = await requireDb()
      .select({ id: p0Spells.id, name: p0Spells.name, element: p0Spells.element, shareCount: p0Spells.shareCount, createdAt: p0Spells.createdAt })
      .from(p0Spells)
      .orderBy(desc(p0Spells.shareCount), desc(p0Spells.createdAt))
      .limit(5);
    return { topSpells, sparkStats: await totalSparkStats() };
  }),
});
