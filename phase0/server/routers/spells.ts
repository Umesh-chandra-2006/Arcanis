import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { SpellCreationInputSchema } from "../../shared/validation";
import {
  createSpell,
  getFeaturedSpells,
  getMySpells,
  getSpellPublic,
  incrementShareCount,
} from "../spell-pipeline";
import { getSparkBalance, recentSparkTransactions } from "../spark";
import { trackEvent } from "../analytics";

export const spellsRouter = router({
  create: protectedProcedure
    .input(SpellCreationInputSchema)
    .mutation(async ({ ctx, input }) => {
      await trackEvent({
        eventType: "spell_creation_started",
        userId: ctx.user.id,
        sessionId: ctx.sessionId,
        metadata: { name: input.name, element: input.element, category: input.category },
      });

      const result = await createSpell(ctx.user.id, input);

      if (result.success && result.spell) {
        await trackEvent({
          eventType: "spell_creation_completed",
          userId: ctx.user.id,
          sessionId: ctx.sessionId,
          metadata: { spellId: result.spell.id, name: result.spell.name },
        });
      }

      return result;
    }),

  mySpells: protectedProcedure.query(async ({ ctx }) => {
    return getMySpells(ctx.user.id);
  }),

  sparkBalance: protectedProcedure.query(async ({ ctx }) => {
    return getSparkBalance(ctx.user.id);
  }),

  sparkTransactions: protectedProcedure.query(async ({ ctx }) => {
    return recentSparkTransactions(ctx.user.id);
  }),

  featured: publicProcedure.query(async () => {
    return getFeaturedSpells(5);
  }),

  getSpellPublic: publicProcedure
    .input(z.object({ spellId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getSpellPublic(input.spellId);
    }),

  recordShareOpen: publicProcedure
    .input(z.object({ spellId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await incrementShareCount(input.spellId);
      await trackEvent({
        eventType: "share_page_viewed",
        userId: ctx.user?.id ?? null,
        sessionId: ctx.sessionId,
        metadata: { spellId: input.spellId },
      });
      return { success: true };
    }),
});