import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { appendSetCookie, REFERRAL_COOKIE, serializeCookie } from "../_core/cookies";
import { ensureReferralCode, REFERRAL_CODE } from "../referrals";
import { trackEvent } from "../analytics";

export const referralsRouter = router({
  /** The signed-in player's code, appended to every share link they copy. */
  myCode: protectedProcedure.query(async ({ ctx }) => ({ code: await ensureReferralCode(ctx.user.id) })),

  /** A visitor arrived on a share link with ?ref=; remember it for a later signup. */
  capture: publicProcedure.input(z.object({ code: z.string().max(16) })).mutation(async ({ ctx, input }) => {
    const code = input.code.toUpperCase();
    if (ctx.user || !REFERRAL_CODE.test(code)) return { captured: false };
    appendSetCookie(ctx.res, serializeCookie(REFERRAL_COOKIE, code, { maxAgeSeconds: 30 * 86_400 }));
    await trackEvent({ eventType: "referral_link_opened", userId: null, sessionId: ctx.sessionId, metadata: {} });
    return { captured: true };
  }),
});
