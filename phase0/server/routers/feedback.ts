import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH } from "../../shared/constants";
import { hitRateLimit } from "../db-rate-limit";
import { hasGivenFeedback, recentFeedback, saveFeedback } from "../feedback";
import { trackEvent } from "../analytics";

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        kind: z.enum(FEEDBACK_KINDS),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        message: z.string().trim().max(FEEDBACK_MAX_LENGTH),
        source: z.enum(["page", "first_spell"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.message && !input.rating) throw new TRPCError({ code: "BAD_REQUEST", message: "Write a few words or choose a rating." });
      const limit = await hitRateLimit(`feedback:${ctx.user.id}`, 10, 86_400);
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Thank you, that is plenty for today. Write again tomorrow." });
      await saveFeedback(ctx.user.id, input);
      await trackEvent({ eventType: "feedback_given", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: { kind: input.kind, source: input.source, rating: input.rating ?? null } });
      return { success: true };
    }),

  given: protectedProcedure.query(async ({ ctx }) => ({ given: await hasGivenFeedback(ctx.user.id) })),

  list: adminProcedure.query(() => recentFeedback(100)),
});
