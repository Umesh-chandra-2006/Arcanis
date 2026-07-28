import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createSpellWithLLM, getSpellResearchStatus } from "../spell-creation";
import {
  getUserSpells,
  getPlatformSpells,
  getSpellById,
  getSpellsByIds,
  getSummonProfile,
  getOrCreateDeck,
  addSpellToDeck,
  removeSpellFromDeck,
} from "../spell-db";
import { getRedisService } from "../redis-service";
import { SpellCreationInputSchema } from "../../shared/validation";
import { SPELL_CREATION_WEEKLY_LIMIT } from "../../shared/constants";

export const labRouter = router({
  createSpell: protectedProcedure
    .input(SpellCreationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createSpellWithLLM(ctx.user.id, input);
      return result;
    }),

  getLibrary: protectedProcedure.query(async ({ ctx }) => {
    const userSpells = await getUserSpells(ctx.user.id);
    const platformSpells = await getPlatformSpells();
    return {
      userSpells,
      platformSpells,
      total: userSpells.length + platformSpells.length,
    };
  }),

  getSpell: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .query(async ({ input }) => {
      const spell = await getSpellById(input.spellId);
      if (!spell) return null;

      let summonProfile = null;
      if (spell.primaryCategory === "Summon") {
        summonProfile = await getSummonProfile(input.spellId);
      }

      return {
        spell,
        summonProfile,
      };
    }),

  getResearchStatus: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .query(async ({ input }) => {
      return await getSpellResearchStatus(input.spellId);
    }),

  getDeck: protectedProcedure.query(async ({ ctx }) => {
    const spellIds = await getOrCreateDeck(ctx.user.id);
    const spells = await getSpellsByIds(spellIds);
    const spellMap = new Map(spells.map((s) => [s.id, s]));
    return spellIds.map((id) => spellMap.get(id)).filter((s) => s !== undefined);
  }),

  addSpellToDeck: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await addSpellToDeck(ctx.user.id, input.spellId);
      return { success };
    }),

  removeSpellFromDeck: protectedProcedure
    .input(z.object({ spellId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await removeSpellFromDeck(ctx.user.id, input.spellId);
      return { success };
    }),

  getWeeklyStatus: protectedProcedure.query(async ({ ctx }) => {
    const redis = getRedisService();
    const remaining = await redis.getWeeklySpellSlots(ctx.user.id);
    return {
      remaining,
      limit: SPELL_CREATION_WEEKLY_LIMIT,
      used: Math.max(0, SPELL_CREATION_WEEKLY_LIMIT - remaining),
    };
  }),
});
