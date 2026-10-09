import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, requireDb } from "../db";
import { p0Reviews, p0Spells, p0Users } from "../../drizzle/schema";
import { ReviewSubmitSchema } from "../../shared/validation";
import { VALIDATION_MESSAGES } from "../../shared/constants";
import { trackEvent } from "../analytics";
import { moderate, recordModerationEvent, type PolicyDecision } from "../moderation";
import { semanticCheck } from "../semantic-check";
import { addAbuseStrike } from "../abuse";

const LATEST_REVIEWS_MAX = 50;

const visibleReview = eq(p0Reviews.status, "visible");
const visibleSpell = and(eq(p0Spells.isPublic, true), isNull(p0Spells.removedAt));

/** Layer 2b (and 2c when borderline) before a review is stored or shown (Build Plan 13). */
async function checkReview(userId: number, comment: string, spellId: string): Promise<"ok" | "rejected" | "unavailable"> {
  let decision: PolicyDecision;
  try {
    decision = await moderate({ userId }, "review", [{ type: "text", text: comment }]);
  } catch {
    return "unavailable";
  }
  if (decision.verdict === "pass") return "ok";
  let rejected = decision.verdict === "reject";
  let layer2c: string | null = null;
  if (decision.verdict === "borderline") {
    const check = await semanticCheck({ userId }, { kind: "player_input", category: "review", element: "-", content: comment, flag: `review borderline: ${decision.reason}` });
    layer2c = check.reasonCode;
    if (check.reasonCode === "check_unavailable") return "unavailable";
    rejected = !check.pass;
  }
  await recordModerationEvent({
    userId,
    surface: "review",
    contentType: "text",
    targetType: "spell",
    targetId: spellId,
    verdict: decision.verdict,
    reason: decision.reason,
    scores: decision.scores,
    excerpt: comment,
    escalatedTo2c: layer2c !== null,
    layer2cResult: layer2c,
    status: rejected ? "resolved" : "open",
  });
  return rejected ? "rejected" : "ok";
}

export const reviewsRouter = router({
  forSpell: publicProcedure.input(ReviewSubmitSchema.pick({ spellId: true })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const [summaryRow] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        average: sql<number | null>`ROUND(AVG(${p0Reviews.rating}), 1)`,
      })
      .from(p0Reviews)
      .where(and(eq(p0Reviews.spellId, input.spellId), visibleReview));

    const reviewRows = await db
      .select({
        id: p0Reviews.id,
        rating: p0Reviews.rating,
        comment: p0Reviews.comment,
        createdAt: p0Reviews.createdAt,
        authorId: p0Users.id,
        authorUsername: p0Users.username,
      })
      .from(p0Reviews)
      .innerJoin(p0Users, eq(p0Reviews.userId, p0Users.id))
      .where(and(eq(p0Reviews.spellId, input.spellId), visibleReview))
      .orderBy(desc(p0Reviews.createdAt))
      .limit(50);

    return {
      spellId: input.spellId,
      summary: { count: Number(summaryRow?.count ?? 0), average: summaryRow?.average ?? null },
      reviews: reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        authorId: r.authorId,
        authorUsername: r.authorUsername,
      })),
    };
  }),

  submit: protectedProcedure.input(ReviewSubmitSchema).mutation(async ({ ctx, input }) => {
    const db = requireDb();
    const [spell] = await db.select({ id: p0Spells.id }).from(p0Spells).where(and(eq(p0Spells.id, input.spellId), visibleSpell)).limit(1);
    if (!spell) {
      throw new TRPCError({ code: "BAD_REQUEST", message: VALIDATION_MESSAGES.SPELL_NOT_FOUND });
    }
    if (ctx.user.bannedAt) throw new TRPCError({ code: "FORBIDDEN", message: VALIDATION_MESSAGES.ACCOUNT_RESTRICTED });

    const comment = input.comment.trim();
    const check = await checkReview(ctx.user.id, comment, input.spellId);
    if (check === "unavailable") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Reviews are paused for a moment. Please try again soon." });
    }
    if (check === "rejected") {
      await addAbuseStrike(ctx.user.id);
      throw new TRPCError({ code: "BAD_REQUEST", message: "That review can't be posted. Keep it about the spell, and kind." });
    }

    const now = new Date();
    const id = nanoid(36);
    await db
      .insert(p0Reviews)
      .values({ id, spellId: input.spellId, userId: ctx.user.id, rating: input.rating, comment, status: "visible", createdAt: now, updatedAt: now })
      .onDuplicateKeyUpdate({ set: { rating: input.rating, comment, status: "visible", updatedAt: now } });

    await trackEvent({
      eventType: "review_submitted",
      userId: ctx.user.id,
      sessionId: ctx.sessionId,
      metadata: { spellId: input.spellId, rating: input.rating },
    });

    return { success: true };
  }),

  latest: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: p0Reviews.id,
        rating: p0Reviews.rating,
        comment: p0Reviews.comment,
        createdAt: p0Reviews.createdAt,
        authorId: p0Users.id,
        authorUsername: p0Users.username,
        spellId: p0Spells.id,
        spellName: p0Spells.name,
        spellElement: p0Spells.element,
        spellCategory: p0Spells.category,
        spellImage: p0Spells.imageUrl,
        spellCard: p0Spells.cardImageUrl,
      })
      .from(p0Reviews)
      .innerJoin(p0Users, eq(p0Reviews.userId, p0Users.id))
      .innerJoin(p0Spells, eq(p0Reviews.spellId, p0Spells.id))
      .where(and(visibleReview, visibleSpell))
      .orderBy(desc(p0Reviews.createdAt))
      .limit(LATEST_REVIEWS_MAX);

    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.authorId, username: r.authorUsername },
      spell: {
        id: r.spellId,
        name: r.spellName,
        element: r.spellElement,
        category: r.spellCategory,
        imageUrl: r.spellCard || r.spellImage,
      },
    }));
  }),
});
