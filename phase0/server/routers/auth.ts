import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  requestMagicLink,
  verifyMagicLink,
  getAccountStatus,
  setPasswordForUser,
  signInWithPassword,
} from "../auth-service";
import {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  PasswordSetSchema,
  SignInWithPasswordSchema,
  AccountStatusQuerySchema,
} from "../../shared/validation";
import { trackEvent } from "../analytics";
import { VALIDATION_MESSAGES } from "../../shared/constants";
import type { Phase0User } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";

function publicUser(user: Phase0User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function getClientIp(ctx: TrpcContext): string | undefined {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  return (
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
    ctx.req.socket.remoteAddress
  );
}

export const authRouter = router({
  accountStatus: publicProcedure
    .input(AccountStatusQuerySchema)
    .query(async ({ input }) => {
      return getAccountStatus(input.email);
    }),

  requestMagicLink: publicProcedure
    .input(MagicLinkRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await requestMagicLink(input.email, getClientIp(ctx));

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

  signInWithPassword: publicProcedure
    .input(SignInWithPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await signInWithPassword(input.email, input.password, getClientIp(ctx));

      await trackEvent({
        eventType: "magic_link_verified",
        userId: result.user.id,
        sessionId: ctx.sessionId,
        metadata: { isNewUser: false, method: "password" },
      });

      return { token: result.token, user: publicUser(result.user), isNewUser: false };
    }),

  setPassword: protectedProcedure.input(PasswordSetSchema).mutation(async ({ ctx, input }) => {
    await setPasswordForUser(ctx.user.id, input.password);
    return publicUser(ctx.user);
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ? publicUser(ctx.user) : null;
  }),

  logout: publicProcedure.mutation(async () => ({ success: true })),
});