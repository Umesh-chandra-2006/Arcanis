import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requestMagicLink, verifyMagicLink } from "../auth-service";
import { MagicLinkRequestSchema, MagicLinkVerifySchema } from "../../shared/validation";
import { trackEvent } from "../analytics";
import { VALIDATION_MESSAGES } from "../../shared/constants";
import type { Phase0User } from "../../drizzle/schema";

function publicUser(user: Phase0User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authRouter = router({
  requestMagicLink: publicProcedure
    .input(MagicLinkRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const forwarded = ctx.req.headers["x-forwarded-for"];
      const ip =
        (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
        ctx.req.socket.remoteAddress;

      const result = await requestMagicLink(input.email, ip);

      await trackEvent({
        eventType: "magic_link_requested",
        userId: null,
        sessionId: ctx.sessionId,
        metadata: { email: input.email.toLowerCase().trim() },
      });

      return result;
    }),

  verifyMagicLink: publicProcedure
    .input(MagicLinkVerifySchema)
    .mutation(async ({ ctx, input }) => {
      let result: { token: string; user: Phase0User; isNewUser: boolean };
      try {
        result = await verifyMagicLink(input.token);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: VALIDATION_MESSAGES.TOKEN_INVALID,
        });
      }

      await trackEvent({
        eventType: "magic_link_verified",
        userId: result.user.id,
        sessionId: ctx.sessionId,
        metadata: { isNewUser: result.isNewUser },
      });

      return { token: result.token, user: publicUser(result.user), isNewUser: result.isNewUser };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ? publicUser(ctx.user) : null;
  }),

  logout: publicProcedure.mutation(async () => ({ success: true })),
});