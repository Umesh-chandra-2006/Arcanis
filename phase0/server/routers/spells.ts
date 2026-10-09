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
import { getSparkBalance, recentSparkEntries } from "../spark";
import { trackEvent } from "../analytics";
import { hitRateLimit } from "../db-rate-limit";

const SHARE_DEDUP_WINDOW_MS = 60 * 60 * 1000;
const recentShareOpens = new Map<string, number>();

function isDuplicateShareOpen(ip: string, spellId: string): boolean {
  const now = Date.now();
  const key = `${ip}:${spellId}`;

  if (recentShareOpens.size > 10_000) {
    for (const [k, ts] of recentShareOpens) {
      if (now - ts > SHARE_DEDUP_WINDOW_MS) recentShareOpens.delete(k);
    }
  }

  const lastOpen = recentShareOpens.get(key);
  if (lastOpen !== undefined && now - lastOpen < SHARE_DEDUP_WINDOW_MS) {
    return true;
  }

  recentShareOpens.set(key, now);
  return false;
}

export const spellsRouter = router({
  create: protectedProcedure
    .input(SpellCreationInputSchema)
    .mutation(async ({ ctx, input }) => {
      await trackEvent({
        eventType: "creation_started",
        userId: ctx.user.id,
        sessionId: ctx.sessionId,
        metadata: { element: input.element, category: input.category },
      });

      const result = await createSpell(ctx.user.id, input, { sessionId: ctx.sessionId });

      // forge_cooling is logged by the breaker as creation_blocked_spend_cap.
      const outcome = result.success
        ? "creation_succeeded"
        : result.code === "generation_failed"
          ? "creation_refunded"
          : result.code === "input_rejected"
            ? "creation_rejected"
            : null;
      if (outcome) {
        await trackEvent({
          eventType: outcome,
          userId: ctx.user.id,
          sessionId: ctx.sessionId,
          metadata: result.spell ? { spellId: result.spell.id, element: result.spell.element, category: result.spell.category } : { code: result.code },
        });
      }

      // Denominator for the fake-door metric: players who ran out (once per player per day).
      if (result.code === "no_spark" || (result.success && result.sparkBalance === 0)) {
        const first = await hitRateLimit(`sparkzero:${ctx.user.id}`, 1, 86_400);
        if (first.allowed) await trackEvent({ eventType: "spark_zero_reached", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: {} });
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
    return recentSparkEntries(ctx.user.id);
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
    .input(z.object({ spellId: z.string().min(1).max(36), referrer: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.ip ?? "unknown";
      if (isDuplicateShareOpen(ip, input.spellId)) {
        return { success: true, deduplicated: true };
      }
      const spell = await getSpellPublic(input.spellId);
      if (!spell) return { success: false, deduplicated: false };
      // The owner opening their own link is not a share.
      if (ctx.user?.id === spell.ownerId) return { success: true, deduplicated: true };
      await incrementShareCount(input.spellId);
      await trackEvent({
        eventType: "preview_viewed",
        userId: ctx.user?.id ?? null,
        sessionId: ctx.sessionId,
        metadata: { spellId: input.spellId, ownerId: spell.ownerId, referrer: input.referrer ?? null },
      });
      return { success: true, deduplicated: false };
    }),
});