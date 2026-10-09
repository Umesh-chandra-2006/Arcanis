import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { p0Users } from "../../drizzle/schema";
import { moderate } from "../moderation";
import { containsProfanity } from "../../shared/profanity";
import { publicUser } from "./auth";

export const MageNameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(24, "At most 24 characters")
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _'-]*$/, "Letters, numbers, spaces, ' _ and - only");

export const profileRouter = router({
  /** "Name your mage": asked the first time a public name is needed (Master Doc 18.2). */
  setName: protectedProcedure.input(z.object({ name: MageNameSchema })).mutation(async ({ ctx, input }) => {
    const name = input.name.replace(/\s+/g, " ");
    if (containsProfanity(name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick another name." });
    try {
      const decision = await moderate({ userId: ctx.user.id }, "review", [{ type: "text", text: name }]);
      if (decision.verdict !== "pass") throw new TRPCError({ code: "BAD_REQUEST", message: "Pick another name." });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Names can't be checked right now. Try again soon." });
    }
    const db = requireDb();
    const [taken] = await db.select({ id: p0Users.id }).from(p0Users).where(and(eq(p0Users.username, name), ne(p0Users.id, ctx.user.id))).limit(1);
    if (taken) throw new TRPCError({ code: "CONFLICT", message: "That name is taken." });
    try {
      await db.update(p0Users).set({ username: name, nameChosen: true }).where(eq(p0Users.id, ctx.user.id));
    } catch {
      throw new TRPCError({ code: "CONFLICT", message: "That name is taken." });
    }
    return publicUser({ ...ctx.user, username: name, nameChosen: true });
  }),
});
