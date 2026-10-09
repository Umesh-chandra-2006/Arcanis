// Player reports and the admin moderation queue (Build Plan 13, task A6).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { p0ModerationEvents, p0Reviews, p0Spells, p0Users } from "../../drizzle/schema";
import { recordModerationEvent } from "../moderation";
import { hitRateLimit } from "../db-rate-limit";
import { addAbuseStrike, banUser } from "../abuse";

export const REPORT_REASONS = ["offensive", "sexual", "hateful", "violent_or_graphic", "spam", "real_person", "other"] as const;

async function ownerOf(targetType: "spell" | "review", targetId: string): Promise<number | null> {
  const db = requireDb();
  if (targetType === "spell") {
    const [s] = await db.select({ ownerId: p0Spells.ownerId }).from(p0Spells).where(eq(p0Spells.id, targetId)).limit(1);
    return s?.ownerId ?? null;
  }
  const [r] = await db.select({ userId: p0Reviews.userId }).from(p0Reviews).where(eq(p0Reviews.id, targetId)).limit(1);
  return r?.userId ?? null;
}

/** Takedown: a removed spell's preview returns 410; a removed review is hidden. */
export async function takeDown(targetType: "spell" | "review", targetId: string, now = new Date()): Promise<void> {
  const db = requireDb();
  if (targetType === "spell") {
    await db.update(p0Spells).set({ isPublic: false, removedAt: now }).where(eq(p0Spells.id, targetId));
  } else {
    await db.update(p0Reviews).set({ status: "removed" }).where(eq(p0Reviews.id, targetId));
  }
}

export async function restore(targetType: "spell" | "review", targetId: string): Promise<void> {
  const db = requireDb();
  if (targetType === "spell") {
    await db.update(p0Spells).set({ isPublic: true, removedAt: null }).where(eq(p0Spells.id, targetId));
  } else {
    await db.update(p0Reviews).set({ status: "visible" }).where(eq(p0Reviews.id, targetId));
  }
}

export const moderationRouter = router({
  /** Anyone viewing a public spell or review can report it. */
  report: publicProcedure
    .input(
      z.object({
        targetType: z.enum(["spell", "review"]),
        targetId: z.string().min(1).max(36),
        reason: z.enum(REPORT_REASONS),
        note: z.string().trim().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = ctx.device.deviceId ?? ctx.ip ?? "unknown";
      const limit = await hitRateLimit(`report:${key}`, 10, 3600);
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Thanks. We've received your reports." });
      const owner = await ownerOf(input.targetType, input.targetId);
      if (owner === null) throw new TRPCError({ code: "NOT_FOUND" });
      await recordModerationEvent({
        userId: ctx.user?.id ?? null,
        surface: "report",
        contentType: "text",
        targetType: input.targetType,
        targetId: input.targetId,
        verdict: "report",
        reason: input.reason,
        excerpt: input.note ?? null,
        status: "open",
      });
      return { received: true };
    }),

  queue: adminProcedure
    .input(z.object({ status: z.enum(["open", "resolved"]).default("open"), limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const db = requireDb();
      const events = await db
        .select()
        .from(p0ModerationEvents)
        .where(eq(p0ModerationEvents.status, input?.status ?? "open"))
        .orderBy(desc(p0ModerationEvents.createdAt))
        .limit(input?.limit ?? 50);
      const spellIds = events.filter((e) => e.targetType === "spell" && e.targetId).map((e) => e.targetId!);
      const reviewIds = events.filter((e) => e.targetType === "review" && e.targetId).map((e) => e.targetId!);
      const spells = spellIds.length
        ? await db
            .select({ id: p0Spells.id, name: p0Spells.name, flavorText: p0Spells.flavorText, imageUrl: p0Spells.imageUrl, cardImageUrl: p0Spells.cardImageUrl, isPublic: p0Spells.isPublic })
            .from(p0Spells)
            .where(inArray(p0Spells.id, spellIds))
        : [];
      const reviews = reviewIds.length
        ? await db.select({ id: p0Reviews.id, comment: p0Reviews.comment, status: p0Reviews.status }).from(p0Reviews).where(inArray(p0Reviews.id, reviewIds))
        : [];
      return events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        reviewedAt: e.reviewedAt?.toISOString() ?? null,
        spell: spells.find((s) => s.id === e.targetId) ?? null,
        review: reviews.find((r) => r.id === e.targetId) ?? null,
      }));
    }),

  resolve: adminProcedure
    .input(
      z.object({
        eventId: z.string().min(1).max(36),
        action: z.enum(["approve", "remove", "strike", "ban", "restore"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = requireDb();
      const [event] = await db.select().from(p0ModerationEvents).where(eq(p0ModerationEvents.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const target = event.targetType === "spell" || event.targetType === "review" ? event.targetType : null;
      const owner = target && event.targetId ? await ownerOf(target, event.targetId) : event.userId;

      if (input.action === "remove" || input.action === "strike" || input.action === "ban") {
        if (target && event.targetId) await takeDown(target, event.targetId);
      }
      if (input.action === "restore" && target && event.targetId) await restore(target, event.targetId);
      if (input.action === "strike" && owner) await addAbuseStrike(owner);
      if (input.action === "ban" && owner) await banUser(owner);

      const resolution = { approve: "approved", remove: "removed", strike: "struck", ban: "banned", restore: "approved" }[input.action];
      await db
        .update(p0ModerationEvents)
        .set({ status: "resolved", resolution, reviewedByHuman: true, reviewedBy: ctx.user.id, reviewedAt: new Date() })
        .where(eq(p0ModerationEvents.id, input.eventId));
      return { ok: true };
    }),

  /** Users with strikes, for the admin page. */
  flaggedUsers: adminProcedure.query(async () => {
    const db = requireDb();
    const rows = await db
      .select({ id: p0Users.id, username: p0Users.username, email: p0Users.email, abuseStrikes: p0Users.abuseStrikes, restrictedUntil: p0Users.restrictedUntil, bannedAt: p0Users.bannedAt })
      .from(p0Users)
      .where(and(inArray(p0Users.role, ["user"])))
      .orderBy(desc(p0Users.abuseStrikes))
      .limit(50);
    return rows.filter((r) => r.abuseStrikes > 0 || r.bannedAt);
  }),
});
