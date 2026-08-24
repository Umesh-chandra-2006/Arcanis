import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { hearthPosts, users, spells } from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { validateHearthPostContent } from "../../shared/profanity";
import { getRedisService } from "../redis-service";
import { nanoid } from "nanoid";

export const hearthRouter = router({
  /**
   * Create a new post on The Hearth.
   * Moderation order: profanity -> rate limit -> daily count -> duplicate -> length -> DB insert.
   */
  createPost: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
        attachedSpellId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable.",
        });
      }

      const redis = getRedisService();
      const userId = ctx.user.id;

      // 1. Profanity & Length check
      const validation = validateHearthPostContent(input.content);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Invalid post content.",
        });
      }

      // 2. Redis 30-second rate limit cooldown check (1 post / 30 seconds)
      const rateLimitKey = `hearth:ratelimit:${userId}`;
      const isAllowed = await redis.checkRateLimit(rateLimitKey, 1, 30);
      if (!isAllowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Please wait 30 seconds before submitting another post to The Hearth.",
        });
      }

      // 3. Redis daily post count soft cap (~50 posts/day)
      const dailyCountKey = `hearth:dailycount:${userId}`;
      const isWithinDailyCap = await redis.checkRateLimit(dailyCountKey, 50, 86400);
      if (!isWithinDailyCap) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You have reached your daily limit of 50 posts on The Hearth.",
        });
      }

      // 4. Duplicate content check (recent identical post from same user)
      const recentPosts = await db
        .select()
        .from(hearthPosts)
        .where(eq(hearthPosts.authorId, userId))
        .orderBy(desc(hearthPosts.createdAt))
        .limit(3);

      const isDuplicate = recentPosts.some(
        (p) => p.content.trim().toLowerCase() === input.content.trim().toLowerCase()
      );
      if (isDuplicate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate post detected. Please post original content.",
        });
      }

      // 5. Verify attached spell ownership if present
      if (input.attachedSpellId) {
        const [spell] = await db
          .select()
          .from(spells)
          .where(and(eq(spells.id, input.attachedSpellId), eq(spells.ownerId, userId)))
          .limit(1);

        if (!spell) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Attached spell card not found in your spellbook.",
          });
        }
      }

      // 6. Insert post into Database
      const postId = nanoid(36);
      await db.insert(hearthPosts).values({
        id: postId,
        authorId: userId,
        content: input.content.trim(),
        attachedSpellId: input.attachedSpellId || null,
      });

      return { success: true, postId };
    }),

  /**
   * List global Hearth posts in reverse chronological order.
   */
  listPosts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { posts: [], nextOffset: null };
      }

      // Query posts with author details and attached spell
      const rawPosts = await db
        .select({
          id: hearthPosts.id,
          content: hearthPosts.content,
          attachedSpellId: hearthPosts.attachedSpellId,
          createdAt: hearthPosts.createdAt,
          author: {
            id: users.id,
            username: users.username,
            avatar: users.avatar,
          },
        })
        .from(hearthPosts)
        .innerJoin(users, eq(hearthPosts.authorId, users.id))
        .orderBy(desc(hearthPosts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Fetch attached spell details
      const attachedSpellIds = rawPosts
        .map((p) => p.attachedSpellId)
        .filter((id): id is string => Boolean(id));

      const spellMap = new Map<string, {
        id: string;
        name: string;
        element: string;
        tier: string;
        primaryCategory: string;
        castType: string;
        imageUrl: string | null;
        flavorText: string | null;
      }>();
      if (attachedSpellIds.length > 0) {
        const attachedSpells = await db
          .select({
            id: spells.id,
            name: spells.name,
            element: spells.element,
            tier: spells.tier,
            primaryCategory: spells.primaryCategory,
            castType: spells.castType,
            imageUrl: spells.imageUrl,
            flavorText: spells.flavorText,
          })
          .from(spells)
          .where(inArray(spells.id, attachedSpellIds));
        for (const s of attachedSpells) {
          spellMap.set(s.id, s);
        }
      }

      const posts = rawPosts.map((p) => ({
        ...p,
        attachedSpell: p.attachedSpellId ? spellMap.get(p.attachedSpellId) || null : null,
      }));

      return { posts, nextOffset: posts.length === input.limit ? input.offset + input.limit : null };
    }),

  /**
   * Delete a post on The Hearth (Author only).
   */
  deletePost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable.",
        });
      }

      const userId = ctx.user.id;

      const [existingPost] = await db
        .select()
        .from(hearthPosts)
        .where(eq(hearthPosts.id, input.postId))
        .limit(1);

      if (!existingPost) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found.",
        });
      }

      if (existingPost.authorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own posts.",
        });
      }

      await db.delete(hearthPosts).where(eq(hearthPosts.id, input.postId));

      return { success: true };
    }),
});
