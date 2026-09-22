import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { p0Reviews, p0Spells, p0Users } from "../../drizzle/schema";
import { ReviewSubmitSchema } from "../../shared/validation";
import { VALIDATION_MESSAGES } from "../../shared/constants";
import { trackEvent } from "../analytics";

const LATEST_REVIEWS_MAX = 50;

export const reviewsRouter = router({
  forSpell: publicProcedure
    .input(ReviewSubmitSchema.pick({ spellId: true }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [summaryRow] = await db
        .select({
          count: sql<number>`COUNT(*)`,
          average: sql<number | null>`ROUND(AVG(${p0Reviews.rating}), 1)`,
        })
        .from(p0Reviews)
        .where(eq(p0Reviews.spellId, input.spellId));

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
        .where(eq(p0Reviews.spellId, input.spellId))
        .orderBy(desc(p0Reviews.createdAt))
        .limit(50);

      return {
        spellId: input.spellId,
        summary: {
          count: summaryRow?.count ?? 0,
          average: summaryRow?.average ?? null,
        },
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
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [spell] = await db
      .select({ id: p0Spells.id })
      .from(p0Spells)
      .where(eq(p0Spells.id, input.spellId))
      .limit(1);
    if (!spell) {
      throw new TRPCError({ code: "BAD_REQUEST", message: VALIDATION_MESSAGES.SPELL_NOT_FOUND });
    }

    const now = new Date();
    await db
      .insert(p0Reviews)
      .values({
        id: nanoid(36),
        spellId: input.spellId,
        userId: ctx.user.id,
        rating: input.rating,
        comment: input.comment.trim(),
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: { rating: input.rating, comment: input.comment.trim(), updatedAt: now },
      });

    await trackEvent({
      eventType: "review_submitted",
      userId: ctx.user.id,
      sessionId: ctx.sessionId,
      metadata: {
        spellId: input.spellId,
        rating: input.rating,
        reviewId: input.spellId,
      },
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
        })
        .from(p0Reviews)
        .innerJoin(p0Users, eq(p0Reviews.userId, p0Users.id))
        .innerJoin(p0Spells, eq(p0Reviews.spellId, p0Spells.id))
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
          imageUrl: r.spellImage,
        },
      }));
    }),
});