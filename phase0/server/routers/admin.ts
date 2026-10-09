import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getBreakerStatus, resetBreaker, setBreakerLimits } from "../spend-breaker";

export const adminRouter = router({
  breakerStatus: adminProcedure.query(() => getBreakerStatus()),

  breakerReset: adminProcedure.mutation(async () => {
    await resetBreaker();
    return getBreakerStatus();
  }),

  breakerSetLimits: adminProcedure
    .input(
      z.object({
        spendLimitUsd: z.number().min(0).max(1000).nullable().optional(),
        creationLimit: z.number().int().min(0).max(100_000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await setBreakerLimits(input);
      return getBreakerStatus();
    }),
});
