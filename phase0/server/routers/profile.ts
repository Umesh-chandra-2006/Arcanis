import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, eq, ne } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { p0Referrals, p0Spells, p0Users } from "../../drizzle/schema";
import { moderate } from "../moderation";
import { containsProfanity } from "../../shared/profanity";
import { publicUser, sessionTokenOf } from "./auth";
import { AuthError, changePassword, PASSWORD_MAX, PASSWORD_MIN, sessionAllowsPasswordReset } from "../auth-service";
import { VALIDATION_MESSAGES } from "../../shared/constants";
import type { TrpcContext } from "../_core/context";
import { trackEvent } from "../analytics";
import { getSparkBalance, recentSparkEntries, weekStartUtc } from "../spark";
import { ensureReferralCode } from "../referrals";

export const MageNameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(24, "At most 24 characters")
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _'-]*$/, "Letters, numbers, spaces, ' _ and - only");

/** Validates, moderates and stores a mage name. Throws a TRPCError the player can read. */
async function saveName(userId: number, raw: string): Promise<string> {
  const name = raw.replace(/\s+/g, " ");
  if (containsProfanity(name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick another name." });
  try {
    const decision = await moderate({ userId }, "review", [{ type: "text", text: name }]);
    if (decision.verdict !== "pass") throw new TRPCError({ code: "BAD_REQUEST", message: "Pick another name." });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Names can't be checked right now. Try again soon." });
  }
  const db = requireDb();
  const [taken] = await db.select({ id: p0Users.id }).from(p0Users).where(and(eq(p0Users.username, name), ne(p0Users.id, userId))).limit(1);
  if (taken) throw new TRPCError({ code: "CONFLICT", message: "That name is taken." });
  try {
    await db.update(p0Users).set({ username: name, nameChosen: true }).where(eq(p0Users.id, userId));
  } catch {
    throw new TRPCError({ code: "CONFLICT", message: "That name is taken." });
  }
  return name;
}

const PasswordSchema = z.string().min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`).max(PASSWORD_MAX);

async function fresh(ctx: TrpcContext, userId: number) {
  const [user] = await requireDb().select().from(p0Users).where(eq(p0Users.id, userId)).limit(1);
  return publicUser(user, await sessionAllowsPasswordReset(sessionTokenOf(ctx)));
}

async function savePassword(ctx: TrpcContext, userId: number, input: { password: string; currentPassword?: string }) {
  try {
    await changePassword(userId, sessionTokenOf(ctx), input);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new TRPCError({ code: error.code === "rate_limited" ? "TOO_MANY_REQUESTS" : "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

export const profileRouter = router({
  /** "Name your mage": asked the first time a public name is needed (Master Doc 18.2). */
  setName: protectedProcedure.input(z.object({ name: MageNameSchema })).mutation(async ({ ctx, input }) => {
    await saveName(ctx.user.id, input.name);
    return fresh(ctx, ctx.user.id);
  }),

  /**
   * The one-step welcome (v7.5): a password (required until the account has
   * one), plus an optional name and update emails.
   */
  completeOnboarding: protectedProcedure
    .input(z.object({ name: MageNameSchema.optional(), updatesOptIn: z.boolean().default(false), password: PasswordSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.password && !ctx.user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: VALIDATION_MESSAGES.PASSWORD_REQUIRED });
      if (input.name) await saveName(ctx.user.id, input.name);
      if (input.password && !ctx.user.passwordHash) await savePassword(ctx, ctx.user.id, { password: input.password });
      await requireDb().update(p0Users).set({ updatesOptIn: input.updatesOptIn, onboardedAt: new Date() }).where(eq(p0Users.id, ctx.user.id));
      if (input.updatesOptIn) await trackEvent({ eventType: "updates_subscribed", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: { source: "welcome" } });
      return fresh(ctx, ctx.user.id);
    }),

  setUpdates: protectedProcedure.input(z.object({ optIn: z.boolean() })).mutation(async ({ ctx, input }) => {
    await requireDb().update(p0Users).set({ updatesOptIn: input.optIn }).where(eq(p0Users.id, ctx.user.id));
    await trackEvent({ eventType: input.optIn ? "updates_subscribed" : "updates_unsubscribed", userId: ctx.user.id, sessionId: ctx.sessionId, metadata: { source: "profile" } });
    return fresh(ctx, ctx.user.id);
  }),

  /** Needs the current password, unless the session was just opened by an emailed code or link (forgot password). */
  setPassword: protectedProcedure
    .input(z.object({ password: PasswordSchema, currentPassword: z.string().max(PASSWORD_MAX).optional() }))
    .mutation(async ({ ctx, input }) => {
      await savePassword(ctx, ctx.user.id, input);
      return fresh(ctx, ctx.user.id);
    }),

  /** Everything the profile window shows. */
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb();
    const [spells] = await db.select({ n: count() }).from(p0Spells).where(eq(p0Spells.ownerId, ctx.user.id));
    const referrals = await db.select({ status: p0Referrals.status }).from(p0Referrals).where(eq(p0Referrals.inviterId, ctx.user.id));
    const spark = await getSparkBalance(ctx.user.id);
    const history = (await recentSparkEntries(ctx.user.id, 12))
      .filter((e) => e.status !== "reversed" && e.amount !== 0)
      .map((e) => ({ id: e.id, amount: e.amount, type: e.type, createdAt: e.createdAt.toISOString() }));
    const nextRefill = new Date(weekStartUtc(new Date()).getTime() + 7 * 86_400_000);
    return {
      spellsForged: Number(spells?.n ?? 0),
      invitesJoined: referrals.filter((r) => r.status !== "rejected").length,
      invitesRewarded: referrals.filter((r) => r.status === "paid").length,
      referralCode: await ensureReferralCode(ctx.user.id),
      spark,
      history,
      nextRefill: nextRefill.toISOString(),
    };
  }),
});
