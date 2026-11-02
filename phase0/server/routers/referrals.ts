import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { ensureReferralCode, REFERRAL_CODE } from "../referrals";
import { trackEvent } from "../analytics";

export const referralsRouter = router({
  /** The signed-in player's code, appended to every share link they copy. */
  myCode: protectedProcedure.query(async ({ ctx }) => ({ code: await ensureReferralCode(ctx.user.id) })),

  /** A visitor arrived on a link with ?ref=. Counts the open only: the code travels in the sign-up request, never on the device. */
  capture: publicProcedure.input(z.object({ code: z.string().max(16) })).mutation(async ({ ctx, input }) => {
    const code = input.code.toUpperCase();
    if (ctx.user || !REFERRAL_CODE.test(code)) return { captured: false };
    await trackEvent({ eventType: "referral_link_opened", userId: null, metadata: {} });
    return { captured: true };
  }),
});
