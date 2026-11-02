import { TERMS_UPDATE_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Signed in, whether or not they have accepted the current terms. Only for the
 * accept action itself: everything else uses protectedProcedure.
 */
export const accountProcedure = t.procedure.use(requireUser);

// An account from before the 18+ terms can do nothing until it accepts them (Master Doc v7.9).
export const protectedProcedure = accountProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.termsAcceptedAt) throw new TRPCError({ code: "FORBIDDEN", message: TERMS_UPDATE_ERR_MSG });
  return next();
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});
