import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { spellsRouter } from "./routers/spells";
import { analyticsRouter } from "./routers/analytics";
import { reviewsRouter } from "./routers/reviews";
import { adminRouter } from "./routers/admin";
import { moderationRouter } from "./routers/moderation";
import { referralsRouter } from "./routers/referrals";
import { profileRouter } from "./routers/profile";
import { sparkRouter } from "./routers/spark";

export const appRouter = router({
  auth: authRouter,
  spells: spellsRouter,
  analytics: analyticsRouter,
  reviews: reviewsRouter,
  admin: adminRouter,
  moderation: moderationRouter,
  referrals: referralsRouter,
  profile: profileRouter,
  spark: sparkRouter,
});

export type AppRouter = typeof appRouter;