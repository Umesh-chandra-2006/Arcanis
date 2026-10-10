import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  AuthError,
  requestSignIn,
  revokeSession,
  SESSION_TTL_MS,
  signInWithPassword,
  verifySignInCode,
  verifySignInLink,
  type SignInResult,
} from "../auth-service";
import { SignInCodeSchema, SignInLinkSchema, SignInPasswordSchema, SignInRequestSchema } from "../../shared/validation";
import { recordSessionDay, trackEvent } from "../analytics";
import type { Phase0User } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { appendSetCookie, parseCookies, REFERRAL_COOKIE, serializeCookie, SESSION_COOKIE } from "../_core/cookies";

export function publicUser(user: Phase0User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    nameChosen: user.nameChosen,
    hasPassword: Boolean(user.passwordHash),
    updatesOptIn: user.updatesOptIn,
    onboarded: user.onboardedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

function toTrpcError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new TRPCError({ code: error.code === "rate_limited" ? "TOO_MANY_REQUESTS" : "BAD_REQUEST", message: error.message });
  }
  throw error;
}

const referralCodeOf = (ctx: TrpcContext) => parseCookies(ctx.req.headers.cookie)[REFERRAL_COOKIE] ?? null;

async function finishSignIn(ctx: TrpcContext, result: SignInResult, method: "link" | "code" | "password") {
  appendSetCookie(ctx.res, serializeCookie(SESSION_COOKIE, result.sessionToken, { maxAgeSeconds: SESSION_TTL_MS / 1000 }));
  if (referralCodeOf(ctx)) appendSetCookie(ctx.res, serializeCookie(REFERRAL_COOKIE, "", { maxAgeSeconds: 0 }));
  await trackEvent({
    eventType: result.isNewUser ? "signup_confirmed" : "signin_completed",
    userId: result.user.id,
    sessionId: ctx.sessionId,
    metadata: { signup_method: method, referred: Boolean(referralCodeOf(ctx)) },
  });
  return { user: publicUser(result.user), isNewUser: result.isNewUser };
}

export const authRouter = router({
  /** Always the same response for a valid email: never reveals whether an account exists. */
  requestSignIn: publicProcedure.input(SignInRequestSchema).mutation(async ({ ctx, input }) => {
    const result = await requestSignIn(input.email, { ip: ctx.ip, deviceId: ctx.device.deviceId }).catch(toTrpcError);
    await trackEvent({ eventType: "magic_link_requested", userId: null, sessionId: ctx.sessionId, metadata: {} });
    return { sent: true as const, devUrl: result.devUrl, devCode: result.devCode };
  }),

  verifyLink: publicProcedure.input(SignInLinkSchema).mutation(async ({ ctx, input }) => {
    const result = await verifySignInLink(input.token, ctx.device, referralCodeOf(ctx)).catch(toTrpcError);
    return finishSignIn(ctx, result, "link");
  }),

  verifyCode: publicProcedure.input(SignInCodeSchema).mutation(async ({ ctx, input }) => {
    const result = await verifySignInCode(input.email, input.code, ctx.device, ctx.ip, referralCodeOf(ctx)).catch(toTrpcError);
    return finishSignIn(ctx, result, "code");
  }),

  /** Returning players who set a password: no email is sent. Same error for every failure. */
  signInWithPassword: publicProcedure.input(SignInPasswordSchema).mutation(async ({ ctx, input }) => {
    const result = await signInWithPassword(input.email, input.password, ctx.ip).catch(toTrpcError);
    return finishSignIn(ctx, result, "password");
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    await recordSessionDay(ctx.user, ctx.sessionId);
    return publicUser(ctx.user);
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await revokeSession(parseCookies(ctx.req.headers.cookie)[SESSION_COOKIE]);
    appendSetCookie(ctx.res, serializeCookie(SESSION_COOKIE, "", { maxAgeSeconds: 0 }));
    return { success: true };
  }),
});
